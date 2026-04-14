// app/api/sheets-webhook/route.ts
// Webhook sécurisé — reçoit les mises à jour depuis Google Apps Script
// Auth : Authorization: Bearer [SHEETS_WEBHOOK_SECRET]
//
// Payload envoyé par Apps Script :
// {
//   "action":  "update_statut",
//   "code":    data[6],   // col G = Code_U_Affilié (6 chiffres)
//   "amount":  data[8],   // col I = Montant_Final (FCFA) ← CORRECT
//   "statut":  data[10]   // col K = Statut ("Payé" ou "Confirmé")
// }
//
// NOTE : ancienne version du Apps Script envoyait data[9] (col J = Lien_Orange_Money)
// au lieu de data[8] (col I = Montant_Final). Le webhook lit Montant_Final
// directement depuis Sheets en fallback si amount vaut 0.
//
// Déclenché uniquement si statut === "Payé" || "Confirmé"

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { getParametresPlateforme } from '@/actions/parametres'
import { sendWhatsApp } from '@/lib/whatsappNotif'
import { updateSyncStatus, updateStatsAffilie, getMontantFinalParCode } from '@/lib/sheetsCanal2'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
  })
}

export async function POST(req: NextRequest) {
  // ── Logs diagnostic ──────────────────────────────────────────
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
  if (statut !== 'Payé' && statut !== 'Confirmé') {
    return NextResponse.json({ ignored: true, reason: 'statut_non_actionnable' })
  }

  // ── Validation code ──────────────────────────────────────────
  const codeStr = code?.toString().trim() ?? ''
  if (!codeStr) {
    return NextResponse.json({ error: 'Code manquant' }, { status: 400 })
  }

  // ── Déduplication : commission déjà créée pour ce code ? ────
  // Exception : si l'existante a commission_fcfa === 0 (ancien bug), on la supprime et on re-traite
  try {
    const existing = await db.collection('commissions_canal2')
      .where('code', '==', codeStr)
      .where('canal', '==', 'boutique')
      .limit(1)
      .get()
    if (!existing.empty) {
      const existingDoc = existing.docs[0]
      const existingCommission = existingDoc.data().commission_fcfa as number ?? 0
      if (existingCommission > 0) {
        console.log(`[sheets-webhook] commission déjà enregistrée pour ${codeStr} (${existingCommission} FCFA)`)
        return NextResponse.json({ ignored: true, reason: 'commission_deja_enregistree' })
      }
      // Ancienne commission à 0 FCFA — supprimer et re-traiter
      console.log(`[sheets-webhook] commission existante à 0 FCFA pour ${codeStr} — suppression et re-traitement`)
      await existingDoc.ref.delete()
    }
  } catch (err) {
    console.error('[sheets-webhook] déduplication error:', err)
  }

  try {
    // ── 1. Résoudre le prescripteurId depuis Firestore ─────────────────
    // Stratégie A : codes_sessions (code 6 chiffres généré par scan QR)
    // Stratégie B : prescripteurs_partenaires.code_promo_affilie (code stable type BEAUSEJOUR-2026)
    console.log(`[sheets-webhook] recherche code ${codeStr} dans codes_sessions Firestore`)
    const sessionSnap = await db.collection('codes_sessions').doc(codeStr).get()

    let prescripteurId: string
    let prescData: Record<string, unknown> = {}

    if (sessionSnap.exists) {
      // Stratégie A — code de session 6 chiffres
      console.log(`[sheets-webhook] code ${codeStr} trouvé dans codes_sessions ✅`)
      const session = sessionSnap.data()!
      prescripteurId = session.prescripteur_partenaire_id as string

      const prescSnap = await db.collection('prescripteurs_partenaires').doc(prescripteurId).get()
      prescData = prescSnap.exists ? prescSnap.data()! : {}
    } else {
      // Stratégie B — code promo stable (ex: BEAUSEJOUR-2026)
      console.log(`[sheets-webhook] code ${codeStr} absent de codes_sessions — fallback code_promo_affilie`)
      const fallbackSnap = await db.collection('prescripteurs_partenaires')
        .where('code_promo_affilie', '==', codeStr)
        .limit(1)
        .get()

      if (fallbackSnap.empty) {
        console.error(`[sheets-webhook] code ${codeStr} introuvable dans codes_sessions ET prescripteurs_partenaires`)
        await updateSyncStatus(codeStr, 'error', 'Code non trouvé Firestore').catch(() => {})
        return NextResponse.json({
          error: 'Code introuvable',
          detail: `${codeStr} absent de codes_sessions et prescripteurs_partenaires`,
        }, { status: 404 })
      }

      const doc = fallbackSnap.docs[0]
      prescripteurId = doc.id
      prescData = doc.data()
      console.log(`[sheets-webhook] prescripteurId trouvé via code_promo_affilie: ${prescripteurId} ✅`)
    }

    // ── 2. Montant final — FIX BUG : Apps Script envoyait data[9] (Lien_Orange_Money) ──
    // Le champ correct est data[8] = col I = Montant_Final.
    // Si amount vaut 0 (ancienne version du Apps Script), on relit depuis Sheets.
    let montantFcfa = parseFloat(amount?.toString() ?? '0') || 0
    if (montantFcfa === 0) {
      console.warn(`[sheets-webhook] amount=0 reçu pour ${codeStr} — lecture Montant_Final depuis Sheets`)
      montantFcfa = await getMontantFinalParCode(codeStr)
      console.log(`[sheets-webhook] Montant_Final depuis Sheets: ${montantFcfa} FCFA`)
    }

    if (montantFcfa === 0) {
      console.warn(`[sheets-webhook] Montant toujours 0 après fallback Sheets pour ${codeStr}`)
    }

    // ── 3. Taux commission depuis Paramètres ──────────────────
    const params = await getParametresPlateforme()
    const tauxCommission = params.commission_partenaire_pct ?? 10
    const commissionFcfa = Math.round(montantFcfa * tauxCommission / 100)

    const now = new Date().toISOString()

    // ── 4. Créer commission Firestore ─────────────────────────
    await db.collection('commissions_canal2').add({
      prescripteur_partenaire_id: prescripteurId,
      code: codeStr,
      canal: 'boutique',
      montant_transaction_fcfa: montantFcfa,
      taux_commission_pct: tauxCommission,
      commission_fcfa: commissionFcfa,
      statut: 'en_attente',
      created_at: now,
      confirmee_at: now,
      versee_at: null,
      versee_par: null,
      source: 'sheets_webhook',
    })

    // ── 5. Incrémenter stats prescripteur ─────────────────────
    await db.collection('prescripteurs_partenaires').doc(prescripteurId).update({
      total_ca_boutique_fcfa: FieldValue.increment(montantFcfa),
      total_commissions_fcfa: FieldValue.increment(commissionFcfa),
      total_utilisations: FieldValue.increment(1),
    })

    // ── 6. Mettre à jour Affiliés_Codes stats G H I ───────────
    // FIX BUG : utiliser codeStr (le code réel de col G) et non code_promo_affilie
    // pour incrémenter la bonne ligne dans Affiliés_Codes.
    updateStatsAffilie(codeStr, montantFcfa, commissionFcfa)
      .catch((e) => console.warn('[sheets-webhook] updateStatsAffilie failed:', e))

    // ── 7. Logging colonne O (Sync_Firebase) ──────────────────
    updateSyncStatus(codeStr, 'success')
      .catch((e) => console.warn('[sheets-webhook] updateSyncStatus failed:', e))

    // ── 8. WhatsApp partenaire ─────────────────────────────────
    const nomPartenaire = (prescData.nom_etablissement as string) ?? 'Partenaire'
    const telPartenaire = (prescData.telephone as string) ?? ''
    if (telPartenaire) {
      sendWhatsApp(
        telPartenaire,
        `🎉 Vente boutique confirmée !\nCode : ${codeStr}\nMontant : ${montantFcfa.toLocaleString('fr-FR')} FCFA\nVotre commission : ${commissionFcfa.toLocaleString('fr-FR')} FCFA\n— L&Lui Signature`
      ).catch(() => {})
    }

    // ── 9. WhatsApp admin ─────────────────────────────────────
    const adminPhone = process.env.ADMIN_WHATSAPP_PHONE ?? ''
    if (adminPhone) {
      sendWhatsApp(
        adminPhone,
        `💰 Vente Canal 2 boutique !\nPartenaire : ${nomPartenaire}\nCode : ${codeStr}\nMontant : ${montantFcfa.toLocaleString('fr-FR')} FCFA\nCommission : ${commissionFcfa.toLocaleString('fr-FR')} FCFA\n— L&Lui Signature`
      ).catch(() => {})
    }

    return NextResponse.json({ success: true, logged: true, commission_fcfa: commissionFcfa, montant_fcfa: montantFcfa })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[sheets-webhook] error:', msg)
    updateSyncStatus(codeStr, 'error', msg).catch(() => {})
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
