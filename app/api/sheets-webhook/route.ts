// app/api/sheets-webhook/route.ts
// Webhook sécurisé — reçoit les mises à jour depuis Google Apps Script
// Auth : Authorization: Bearer [SHEETS_WEBHOOK_SECRET]
//
// Payload envoyé par Apps Script :
// {
//   "action":  "update_statut",
//   "code":    data[6],   // col G = Code_U_Affilié (6 chiffres)
//   "amount":  data[9],   // col J = Lien_Orange_Money (montant final FCFA)
//   "statut":  data[10]   // col K = Statut ("Payé" ou "Confirmé")
// }
// Déclenché uniquement si statut === "Payé" || "Confirmé"

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { getParametresPlateforme } from '@/actions/parametres'
import { sendWhatsApp } from '@/lib/whatsappNotif'
import { updateSyncStatus, updateStatsAffilie } from '@/lib/sheetsCanal2'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
  })
}

export async function POST(req: NextRequest) {
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
  try {
    const existing = await db.collection('commissions_canal2')
      .where('code', '==', codeStr)
      .where('canal', '==', 'boutique')
      .limit(1)
      .get()
    if (!existing.empty) {
      console.log(`[sheets-webhook] commission déjà enregistrée pour ${codeStr}`)
      return NextResponse.json({ ignored: true, reason: 'commission_deja_enregistree' })
    }
  } catch (err) {
    console.error('[sheets-webhook] déduplication error:', err)
  }

  try {
    // ── 1. Lire codes_sessions/[code] ─────────────────────────
    const sessionSnap = await db.collection('codes_sessions').doc(codeStr).get()
    if (!sessionSnap.exists) {
      await updateSyncStatus(codeStr, 'error', 'Code non trouvé Firestore').catch(() => {})
      return NextResponse.json({ error: 'Code introuvable' }, { status: 404 })
    }
    const session = sessionSnap.data()!
    const prescripteurId = session.prescripteur_partenaire_id as string

    // ── 2. Lire prescripteur partenaire ───────────────────────
    const prescSnap = await db.collection('prescripteurs_partenaires').doc(prescripteurId).get()
    const prescData = prescSnap.exists ? prescSnap.data()! : {}

    // ── 3. Montant (col J = Lien_Orange_Money) ────────────────
    const montantFcfa = parseFloat(amount?.toString() ?? '0') || 0

    // ── 4. Taux commission depuis Paramètres ──────────────────
    const params = await getParametresPlateforme()
    const tauxCommission = params.commission_partenaire_pct ?? 10
    const commissionFcfa = Math.round(montantFcfa * tauxCommission / 100)

    const now = new Date().toISOString()

    // ── 5. Créer commission Firestore ─────────────────────────
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

    // ── 6. Incrémenter stats prescripteur ─────────────────────
    await db.collection('prescripteurs_partenaires').doc(prescripteurId).update({
      total_ca_boutique_fcfa: FieldValue.increment(montantFcfa),
      total_commissions_fcfa: FieldValue.increment(commissionFcfa),
      total_utilisations: FieldValue.increment(1),
    })

    // ── 7. Mettre à jour Affiliés_Codes stats G H I ───────────
    const codePrescripteur = (prescData.code_promo_affilie as string) ?? ''
    if (codePrescripteur) {
      updateStatsAffilie(codePrescripteur, montantFcfa, commissionFcfa)
        .catch((e) => console.warn('[sheets-webhook] updateStatsAffilie failed:', e))
    }

    // ── 8. Logging colonne O (Sync_Firebase) ──────────────────
    updateSyncStatus(codeStr, 'success')
      .catch((e) => console.warn('[sheets-webhook] updateSyncStatus failed:', e))

    // ── 9. WhatsApp partenaire ─────────────────────────────────
    const nomPartenaire = (prescData.nom_etablissement as string) ?? 'Partenaire'
    const telPartenaire = (prescData.telephone as string) ?? ''
    if (telPartenaire) {
      sendWhatsApp(
        telPartenaire,
        `🎉 Vente boutique confirmée !\nCode : ${codeStr}\nMontant : ${montantFcfa.toLocaleString('fr-FR')} FCFA\nVotre commission : ${commissionFcfa.toLocaleString('fr-FR')} FCFA\n— L&Lui Signature`
      ).catch(() => {})
    }

    // ── 10. WhatsApp admin ────────────────────────────────────
    const adminPhone = process.env.ADMIN_WHATSAPP_PHONE ?? ''
    if (adminPhone) {
      sendWhatsApp(
        adminPhone,
        `💰 Vente Canal 2 boutique !\nPartenaire : ${nomPartenaire}\nCode : ${codeStr}\nMontant : ${montantFcfa.toLocaleString('fr-FR')} FCFA\nCommission : ${commissionFcfa.toLocaleString('fr-FR')} FCFA\n— L&Lui Signature`
      ).catch(() => {})
    }

    return NextResponse.json({ success: true, logged: true, commission_fcfa: commissionFcfa })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[sheets-webhook] error:', msg)
    updateSyncStatus(codeStr, 'error', msg).catch(() => {})
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
