// app/api/portail/track-conversion/route.ts
// POST public — Conversion invité → crediterWallet atomique (P4)

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { crediterWallet } from '@/lib/walletsService'
import type { TransactionType } from '@/lib/calculatePayout'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { guest_id, mariage_uid, amount_ht, type, source } = await req.json() as {
      guest_id: string; mariage_uid: string
      amount_ht: number; type: string; source: string
    }
    if (!guest_id || !mariage_uid || !amount_ht || !type) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const db = getDb()
    const guestSnap = await db.doc(`portail_users/${mariage_uid}/invites_guests/${guest_id}`).get()
    if (!guestSnap.exists) return NextResponse.json({ error: 'Invité introuvable' }, { status: 404 })

    const txType: TransactionType = type === 'PACK_MARIAGE' ? 'PACK_MARIAGE' : 'BOUTIQUE'

    // Créer la transaction
    const txRef = await db.collection(`portail_users/${mariage_uid}/transactions`).add({
      type: txType, source: source ?? 'invite', amount_ht,
      guest_id, status: 'COMPLETED', created_at: FieldValue.serverTimestamp(),
    })

    // Créditer wallets + REV + grade (atomique via walletsService)
    const result = await crediterWallet(mariage_uid, txRef.id, amount_ht, txType, 1, source ?? 'invite')

    // Créer commission
    await db.collection('commissions').add({
      user_id: mariage_uid, transaction_id: txRef.id,
      montant: result.payout.cash + result.payout.credits_services,
      cash: result.payout.cash, credits: result.payout.credits_services,
      rev: result.payout.rev_gagnes, level: 1, source: txType, guest_id,
      created_at: FieldValue.serverTimestamp(),
    })

    // Update invité
    await guestSnap.ref.update({
      converted: true, converted_at: FieldValue.serverTimestamp(),
      total_achats: FieldValue.increment(amount_ht),
      commissions_generees: FieldValue.increment(result.payout.cash + result.payout.credits_services),
    })

    // Notif commission (grade déjà géré dans crediterWallet)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/portail/notif-whatsapp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: mariage_uid, type: 'COMMISSION', data: { montant: result.payout.cash + result.payout.credits_services, type_commission: txType } }),
    }).catch(() => {})

    return NextResponse.json({ success: true, payout: result.payout, grade_change: result.grade_change })
  } catch (e) {
    console.error('track-conversion error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
