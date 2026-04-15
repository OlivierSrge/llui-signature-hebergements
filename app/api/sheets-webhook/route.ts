// app/api/sheets-webhook/route.ts
// Webhook sécurisé — reçoit les mises à jour depuis Google Apps Script
// Auth : Authorization: Bearer [SHEETS_WEBHOOK_SECRET]
//
// Payload envoyé par Apps Script (variables COL_* du script) :
// {
//   "action":  "update_statut",
//   "code":    data[COL_CODE]    = data[6]  // col G = Code_U_Affilié
//   "amount":  data[COL_MONTANT] = data[9]  // col J = Montant_Final  ← v2 (était col I)
//   "statut":  data[COL_STATUT]  = data[11] // col L = Statut         ← v2 (était col K)
// }
//
// Mapping statut Sheets → statut Firestore (commissions_canal2) :
//   "En attente"          → "vente_en_cours"   (⏳ vente enregistrée, paiement client en attente)
//   "Payé" | "Confirmé"   → "en_attente"       (✅ paiement client reçu, commission due au partenaire)
//
// Note : la mise à jour Affiliés_Codes (col G H I) est gérée par Apps Script.
// Ce webhook gère uniquement la synchronisation Firestore.
// Optimisation : requêtes Firestore indépendantes lancées en Promise.all.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { getParametresPlateforme } from '@/actions/parametres'
import { sendWhatsApp } from '@/lib/whatsappNotif'
import { updateSyncStatus, getMontantFinalParCode, lireAffiliésCodes } from '@/lib/sheetsCanal2'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function POST(req: NextRequest) {
  // ── Log diagnostic ────────────────────────────────────────────
  const bodyText = await req.clone().text()
  console.log('[sheets-webhook] REÇU:', {
    authorization: req.headers.get('authorization'),
    contentType: req.headers.get('content-type'),
    body: bodyText.slice(0, 500),
    HAS_SECRET: !!process.env.SHEETS_WEBHOOK_SECRET,
  })

  // ── Auth Bearer token ─────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.SHEETS_WEBHOOK_SECRET}`

  if (!process.env.SHEETS_WEBHOOK_SECRET || authHeader !== expectedToken) {
    console.error('[sheets-webhook] token invalide')
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // ── Parser le body ───────────────────────────────────────────
  let body: { action?: string; code?: unknown; amount?: unknown; statut?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body invalide' }, { status: 400 })
  }

  const { action, code, amount, statut } = body

  // ── Validation action ────────────────────────────────────────
  if (action !== 'update_statut') {
    return NextResponse.json({ ignored: true, reason: 'action_inconnue' })
  }

  // ── Validation statut ────────────────────────────────────────
  const statutsValides = ['En attente', 'Payé', 'Confirmé']
  if (!statut || !statutsValides.includes(statut)) {
    return NextResponse.json({ ignored: true, reason: 'statut_non_actionnable' })
  }

  // ── Validation code ──────────────────────────────────────────
  const codeStr = code?.toString().trim() ?? ''
  if (!codeStr) {
    return NextResponse.json({ error: 'Code manquant' }, { status: 400 })
  }

  // ── Déterminer l'action Firestore selon le statut ────────────
  const estConfirme = statut === 'Payé' || statut === 'Confirmé'
  const statutFirestore = estConfirme ? 'en_attente' : 'vente_en_cours'

  // ── Déduplication & logique de mise à jour ───────────────────
  // Stratégie selon le statut reçu :
  //
  // "En attente" (vente_en_cours) :
  //   - Si commission existante avec statut en_attente/versee et commission_fcfa > 0 → ignoré (déjà confirmée)
  //   - Si commission existante vente_en_cours → ignoré (déjà enregistrée)
  //   - Si commission à 0 FCFA (bug ancien) → supprimer + recréer
  //   - Sinon → créer vente_en_cours
  //
  // "Payé"/"Confirmé" (en_attente) :
  //   - Si commission existante vente_en_cours → UPDATE vers en_attente avec bon montant
  //   - Si commission existante en_attente/versee avec commission_fcfa > 0 → ignoré
  //   - Si commission à 0 FCFA (bug ancien) → supprimer + recréer en_attente
  //   - Sinon → créer en_attente

  // ── Requêtes parallèles : dédup + session + params ──────────────
  // Les 3 sont indépendantes → lancées simultanément pour réduire la latence
  let existingDocId: string | null = null
  let existingStatut: string | null = null

  try {
    const [existingSnap, sessionSnapInit, paramsInit] = await Promise.all([
      db.collection('commissions_canal2')
        .where('code', '==', codeStr)
        .where('canal', '==', 'boutique')
        .limit(1)
        .get(),
      db.collection('codes_sessions').doc(codeStr).get(),
      getParametresPlateforme(),
    ])

    // ── Déduplication ───────────────────────────────────────────
    if (!existingSnap.empty) {
      const doc = existingSnap.docs[0]
      existingDocId = doc.id
      existingStatut = doc.data().statut as string ?? ''
      const existingCommission = doc.data().commission_fcfa as number ?? 0

      if (existingCommission === 0) {
        // Commission zombie à 0 FCFA (bug pré-fix) → nettoyer et re-traiter
        console.log(`[sheets-webhook] commission 0 FCFA pour ${codeStr} — suppression`)
        await doc.ref.delete()
        existingDocId = null
        existingStatut = null
      } else if (!estConfirme && existingStatut === 'vente_en_cours') {
        console.log(`[sheets-webhook] vente_en_cours déjà enregistrée pour ${codeStr} — ignoré`)
        return NextResponse.json({ ignored: true, reason: 'vente_en_cours_deja_enregistree' })
      } else if (['en_attente', 'versee'].includes(existingStatut ?? '')) {
        console.log(`[sheets-webhook] commission ${existingStatut} déjà enregistrée pour ${codeStr} — ignoré`)
        return NextResponse.json({ ignored: true, reason: 'commission_deja_enregistree' })
      } else if (estConfirme && existingStatut === 'vente_en_cours') {
        console.log(`[sheets-webhook] vente_en_cours → en_attente pour ${codeStr}`)
        // existingDocId conservé pour la mise à jour plus bas
      }
    }

    // ── Utiliser les résultats déjà chargés (sessionSnapInit, paramsInit) ──
    const sessionSnap = sessionSnapInit

    // ── 1. Résoudre le prescripteurId ─────────────────────────────
    let prescripteurId: string
    let prescData: Record<string, unknown> = {}

    if (sessionSnap.exists) {
      console.log(`[sheets-webhook] code ${codeStr} trouvé dans codes_sessions ✅`)
      const session = sessionSnap.data()!
      prescripteurId = session.prescripteur_partenaire_id as string
      const prescSnap = await db.collection('prescripteurs_partenaires').doc(prescripteurId).get()
      prescData = prescSnap.exists ? prescSnap.data()! : {}
    } else {
      console.log(`[sheets-webhook] code ${codeStr} absent de codes_sessions — fallback code_promo_affilie`)
      const fallbackSnap = await db.collection('prescripteurs_partenaires')
        .where('code_promo_affilie', '==', codeStr)
        .limit(1)
        .get()

      if (fallbackSnap.empty) {
        // ── Stratégie C : créer depuis Affiliés_Codes Sheets ──
        console.log(`[sheets-webhook] Stratégie C pour ${codeStr} — lecture Affiliés_Codes`)
        try {
          const affilies = await lireAffiliésCodes()
          const affilie = affilies.find((a) => a.code_promo === codeStr)

          if (!affilie) {
            console.error(`[sheets-webhook] code ${codeStr} introuvable dans codes_sessions, prescripteurs_partenaires ET Affiliés_Codes`)
            updateSyncStatus(codeStr, 'error', 'Code non trouvé Firestore ni Sheets').catch(() => {})
            return NextResponse.json({
              error: 'Code introuvable',
              detail: `${codeStr} absent de codes_sessions, prescripteurs_partenaires et Affiliés_Codes`,
            }, { status: 404 })
          }

          // Créer prescripteur_partenaire à la volée avec schéma complet
          const now = new Date().toISOString()
          const expireAt = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
          const paramsC = await getParametresPlateforme()
          const ref = db.collection('prescripteurs_partenaires').doc()
          await ref.set({
            uid: ref.id,
            nom_etablissement: affilie.nom_affilie || codeStr,
            type: 'restaurant',
            telephone: '',
            adresse: '',
            email: affilie.email_affilie || '',
            statut: 'actif',
            remise_type: 'reduction_pct',
            remise_valeur_pct: affilie.reduction_pct || 0,
            remise_description: null,
            redirection_prioritaire: 'boutique',
            forfait_type: 'annuel',
            forfait_montant_fcfa: paramsC.forfait_prescripteur_annuel_fcfa ?? 0,
            forfait_debut: now,
            forfait_expire_at: expireAt,
            forfait_statut: 'actif',
            qr_code_url: '',
            qr_code_data: `${appUrl}/promo/${ref.id}`,
            qr_genere_le: now,
            code_promo_affilie: codeStr,
            commission_pct: affilie.commission_pct || (paramsC.commission_partenaire_pct ?? 10),
            total_scans: 0,
            total_codes_generes: 0,
            total_utilisations: 0,
            total_clients_uniques: 0,
            total_ca_hebergements_fcfa: 0,
            total_ca_boutique_fcfa: 0,
            total_commissions_fcfa: 0,
            created_at: now,
            created_by: 'strategie_c_webhook',
            source: 'strategie_c_webhook',
          })
          prescripteurId = ref.id
          prescData = {
            nom_etablissement: affilie.nom_affilie || codeStr,
            telephone: '',
          }

          // Créer codes_sessions pour résolutions futures
          await db.collection('codes_sessions').doc(codeStr).set({
            code: codeStr,
            prescripteur_partenaire_id: prescripteurId,
            canal: 'boutique',
            reduction_pct: affilie.reduction_pct,
            nb_utilisations: 0,
            max_utilisations: 9999,
            expire_at: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
            created_at: now,
            source: 'strategie_c_webhook',
          })

          console.log(`[sheets-webhook] Stratégie C ✅ code ${codeStr} créé dynamiquement — prescripteurId: ${prescripteurId}`)
        } catch (stratCErr) {
          const msg = stratCErr instanceof Error ? stratCErr.message : String(stratCErr)
          console.error(`[sheets-webhook] Stratégie C erreur pour ${codeStr}:`, msg)
          updateSyncStatus(codeStr, 'error', `Stratégie C échouée: ${msg}`).catch(() => {})
          return NextResponse.json({
            error: 'Code introuvable',
            detail: `${codeStr} — stratégie C échouée: ${msg}`,
          }, { status: 404 })
        }
      } else {
        const doc = fallbackSnap.docs[0]
        prescripteurId = doc.id
        prescData = doc.data()
        console.log(`[sheets-webhook] prescripteurId via code_promo_affilie: ${prescripteurId} ✅`)
      }
    }

    // ── 2. Montant final ──────────────────────────────────────────
    let montantFcfa = parseFloat(amount?.toString() ?? '0') || 0
    if (montantFcfa === 0) {
      console.warn(`[sheets-webhook] amount=0 pour ${codeStr} — lecture Montant_Final depuis Sheets (col J)`)
      montantFcfa = await getMontantFinalParCode(codeStr)
      console.log(`[sheets-webhook] Montant_Final depuis Sheets: ${montantFcfa} FCFA`)
    }
    if (montantFcfa === 0) {
      console.warn(`[sheets-webhook] Montant toujours 0 après fallback Sheets pour ${codeStr}`)
    }

    // ── 3. Taux commission (déjà chargé en parallèle) ────────────
    const params = paramsInit
    const tauxCommission = params.commission_partenaire_pct ?? 10
    const commissionFcfa = Math.round(montantFcfa * tauxCommission / 100)

    const now = new Date().toISOString()

    // ── 4. Créer ou mettre à jour la commission Firestore ─────────
    if (estConfirme && existingDocId && existingStatut === 'vente_en_cours') {
      // Mise à jour : vente_en_cours → en_attente (paiement client reçu)
      await db.collection('commissions_canal2').doc(existingDocId).update({
        statut: 'en_attente',
        montant_transaction_fcfa: montantFcfa,
        taux_commission_pct: tauxCommission,
        commission_fcfa: commissionFcfa,
        confirmee_at: now,
      })
      console.log(`[sheets-webhook] ✅ commission ${existingDocId} mise à jour vente_en_cours → en_attente`)
    } else {
      // Création
      await db.collection('commissions_canal2').add({
        prescripteur_partenaire_id: prescripteurId,
        code: codeStr,
        canal: 'boutique',
        montant_transaction_fcfa: montantFcfa,
        taux_commission_pct: tauxCommission,
        commission_fcfa: commissionFcfa,
        statut: statutFirestore,
        created_at: now,
        confirmee_at: estConfirme ? now : null,
        versee_at: null,
        versee_par: null,
        source: 'sheets_webhook',
      })
      console.log(`[sheets-webhook] ✅ commission créée statut=${statutFirestore}`)
    }

    // ── 5. Stats prescripteur (uniquement si vente confirmée) ─────
    // Pour "En attente", on n'incrémente pas encore les stats financières
    // car le client n'a pas encore payé
    if (estConfirme) {
      await db.collection('prescripteurs_partenaires').doc(prescripteurId).update({
        total_ca_boutique_fcfa: FieldValue.increment(montantFcfa),
        total_commissions_fcfa: FieldValue.increment(commissionFcfa),
        total_utilisations: FieldValue.increment(1),
      })
    }

    // ── 6. Logging colonne O (Sync_Firebase) ─────────────────────
    const syncMsg = estConfirme
      ? `✅ Synced Firebase (Payé)`
      : `⏳ Enregistré Firebase (En attente)`
    updateSyncStatus(codeStr, 'success', syncMsg)
      .catch((e) => console.warn('[sheets-webhook] updateSyncStatus failed:', e))

    // ── 7. WhatsApp partenaire (uniquement si vente confirmée) ────
    const nomPartenaire = (prescData.nom_etablissement as string) ?? 'Partenaire'
    const telPartenaire = (prescData.telephone as string) ?? ''
    if (estConfirme && telPartenaire) {
      sendWhatsApp(
        telPartenaire,
        `🎉 Vente boutique confirmée !\nCode : ${codeStr}\nMontant : ${montantFcfa.toLocaleString('fr-FR')} FCFA\nVotre commission : ${commissionFcfa.toLocaleString('fr-FR')} FCFA\n— L&Lui Signature`
      ).catch(() => {})
    }

    // ── 8. WhatsApp admin (uniquement si vente confirmée) ─────────
    const adminPhone = process.env.ADMIN_WHATSAPP_PHONE ?? ''
    if (estConfirme && adminPhone) {
      sendWhatsApp(
        adminPhone,
        `💰 Vente Canal 2 boutique confirmée !\nPartenaire : ${nomPartenaire}\nCode : ${codeStr}\nMontant : ${montantFcfa.toLocaleString('fr-FR')} FCFA\nCommission : ${commissionFcfa.toLocaleString('fr-FR')} FCFA\n— L&Lui Signature`
      ).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      statut_firestore: statutFirestore,
      commission_fcfa: estConfirme ? commissionFcfa : 0,
      montant_fcfa: montantFcfa,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[sheets-webhook] error:', msg)
    updateSyncStatus(codeStr, 'error', msg).catch(() => {})
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
