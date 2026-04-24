// app/api/admin/confirm-payment/route.ts
// POST { token, action: 'confirm' | 'cancel' }
// Confirme ou annule une commande Pass VIP pending

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { Resend } from 'resend'
import {
  extraireTypePass,
  extraireDuree,
  calculerDateFin,
  generateTempPassword,
  hashPassword,
  todayDate,
} from '@/lib/pass-vip-helpers'
import { getPassVipActivationEmailHtml } from '@/lib/email-templates/pass-vip-activation'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
const FROM = process.env.FROM_EMAIL ?? 'onboarding@resend.dev'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { token?: string; action?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { token, action } = body
  if (!token || !['confirm', 'cancel'].includes(action ?? '')) {
    return NextResponse.json({ error: 'token et action (confirm|cancel) requis' }, { status: 400 })
  }

  // ── Charger la commande ─────────────────────────────────────────
  const snap = await db.collection('pass_vip_pending_orders')
    .where('token', '==', token)
    .limit(1)
    .get()

  if (snap.empty) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  const orderDoc = snap.docs[0]
  const order = orderDoc.data()

  if (order.statut !== 'pending') {
    return NextResponse.json({ error: `Commande déjà ${order.statut}` }, { status: 400 })
  }

  // ── ANNULATION ──────────────────────────────────────────────────
  if (action === 'cancel') {
    await orderDoc.ref.update({ statut: 'cancelled', cancelled_at: new Date().toISOString() })
    return NextResponse.json({ success: true, action: 'cancelled' })
  }

  // ── CONFIRMATION ────────────────────────────────────────────────
  const {
    nom_client, email_client, tel_client,
    type_pass, montant, code_promo, nom_affilie,
    sheets_row, sheets_id,
  } = order

  const passType = extraireTypePass(type_pass as string)
  const duree = extraireDuree(type_pass as string)
  const dateFin = calculerDateFin(duree)
  const dateFinStr = dateFin.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const password = generateTempPassword(nom_client as string)
  const passwordHash = hashPassword(password)
  const now = new Date().toISOString()

  try {
    // ── 1. Créer Pass VIP actif ─────────────────────────────────────
    const passRef = db.collection('pass_vip_boutique').doc()
    await passRef.set({
      email: email_client,
      nom: (nom_client as string).toUpperCase().trim(),
      tel: tel_client ?? '',
      type_pass: passType,
      duree_jours: duree,
      date_achat: now,
      date_debut: now,
      date_fin: dateFin.toISOString(),
      statut: 'actif',
      montant: montant ?? 0,
      code_promo: code_promo ?? null,
      nom_affilie: nom_affilie ?? null,
      password_hash: passwordHash,
      qr_generated_today: 0,
      qr_reset_date: todayDate(),
      created_at: now,
    })
    const passId = passRef.id
    console.log('[CONFIRM PAYMENT] Pass VIP créé — id:', passId)

    // ── 2. Email activation client ──────────────────────────────────
    const loginUrl = `${APP_URL}/pass-vip/login`
    const html = getPassVipActivationEmailHtml({
      nom: nom_client as string,
      type_pass: type_pass as string,
      date_fin: dateFinStr,
      email: email_client as string,
      password,
      login_url: loginUrl,
    })

    await getResend().emails.send({
      from: FROM,
      to: email_client as string,
      subject: `✅ Votre Pass VIP ${passType} est activé — L&Lui Signature`,
      html,
    }).then((r) => console.log('[CONFIRM PAYMENT] Email client envoyé ✅', JSON.stringify(r)))
     .catch((e) => console.error('[CONFIRM PAYMENT] Email client erreur ❌', e))

    // ── 3. Mise à jour Google Sheets (non bloquant) ─────────────────
    if (sheets_row) {
      import('@/lib/sheets-pass-vip').then(({ updatePassVipStatutSheets }) =>
        updatePassVipStatutSheets(sheets_row as number, sheets_id as string | null)
          .catch((e) => console.warn('[CONFIRM PAYMENT] Sheets update erreur:', e))
      )
    }

    // ── 4. Commission affiliée (non bloquant) ───────────────────────
    if (code_promo && montant) {
      const tauxCommission = (order.commission_pourcent as number | null) ?? 10
      const commissionFcfa = Math.round((montant as number) * tauxCommission / 100)
      db.collection('commissions_canal2').add({
        code: code_promo,
        canal: 'boutique_pass_vip',
        montant_transaction_fcfa: montant,
        commission_fcfa: commissionFcfa,
        taux_commission_pct: tauxCommission,
        statut: 'en_attente',
        pass_id: passId,
        created_at: now,
        confirmee_at: now,
      }).catch((e) => console.warn('[CONFIRM PAYMENT] Commission erreur:', e))
    }

    // ── 5. Marquer commande confirmée ───────────────────────────────
    await orderDoc.ref.update({
      statut: 'confirmed',
      confirmed_at: now,
      pass_id: passId,
    })

    return NextResponse.json({
      success: true,
      pass_id: passId,
      client_email: email_client,
      type_pass: passType,
    })
  } catch (e: unknown) {
    console.error('[CONFIRM PAYMENT] Erreur:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
