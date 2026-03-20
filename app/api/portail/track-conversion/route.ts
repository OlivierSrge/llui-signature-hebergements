// app/api/portail/track-conversion/route.ts
// POST public — Conversion invité → commission + REV mariés

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { calculatePayout } from '@/lib/calculatePayout'
import type { TransactionType } from '@/lib/calculatePayout'
import { PORTAIL_GRADES, GRADE_THRESHOLDS } from '@/lib/portailGrades'
import type { PortailGrade } from '@/lib/portailGrades'

export const dynamic = 'force-dynamic'

function nextGrade(grade: PortailGrade, rev: number): PortailGrade | null {
  const idx = PORTAIL_GRADES.indexOf(grade)
  if (idx >= PORTAIL_GRADES.length - 1) return null
  const next = PORTAIL_GRADES[idx + 1]
  return rev >= GRADE_THRESHOLDS[next] ? next : null
}

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

    // 1. Vérifier l'invité
    const guestSnap = await db.doc(`portail_users/${mariage_uid}/invites_guests/${guest_id}`).get()
    if (!guestSnap.exists) return NextResponse.json({ error: 'Invité introuvable' }, { status: 404 })

    const txType: TransactionType = type === 'PACK_MARIAGE' ? 'PACK_MARIAGE' : 'BOUTIQUE'
    const payout = calculatePayout(amount_ht, txType, 1)

    // 2. Créer transaction
    const txRef = await db.collection(`portail_users/${mariage_uid}/transactions`).add({
      type: txType, source: source ?? 'invite', amount_ht,
      commission_brute: payout.commission_brute,
      cash: payout.cash, credits_services: payout.credits_services,
      rev_gagnes: payout.rev_gagnes,
      guest_id, created_at: FieldValue.serverTimestamp(),
    })

    // 3. Update wallets + rev mariés
    const userRef = db.collection('portail_users').doc(mariage_uid)
    const userSnap = await userRef.get()
    const userData = userSnap.data() ?? {}
    const oldRev: number = userData.rev_lifetime ?? 0
    const newRev = oldRev + payout.rev_gagnes
    const oldGrade: PortailGrade = (userData.grade ?? 'START') as PortailGrade
    const newGrade = nextGrade(oldGrade, newRev)

    const updates: Record<string, unknown> = {
      'wallets.cash': FieldValue.increment(payout.cash),
      'wallets.credits_services': FieldValue.increment(payout.credits_services),
      rev_lifetime: FieldValue.increment(payout.rev_gagnes),
    }
    if (newGrade) updates.grade = newGrade
    await userRef.update(updates)

    // 4. Créer commission
    await db.collection('commissions').add({
      user_id: mariage_uid, transaction_id: txRef.id,
      montant: payout.commission_brute, cash: payout.cash,
      credits: payout.credits_services, rev: payout.rev_gagnes,
      level: 1, source: txType, guest_id,
      created_at: FieldValue.serverTimestamp(),
    })

    // 5. Update invité
    await guestSnap.ref.update({
      converted: true, converted_at: FieldValue.serverTimestamp(),
      total_achats: FieldValue.increment(amount_ht),
      commissions_generees: FieldValue.increment(payout.commission_brute),
    })

    // 6. Notif CallMeBot
    const notifData = { montant: payout.commission_brute, type_commission: txType }
    fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/portail/notif-whatsapp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: mariage_uid, type: 'COMMISSION', data: notifData }),
    }).catch(() => {})

    if (newGrade) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/portail/notif-whatsapp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: mariage_uid, type: 'NOUVEAU_GRADE', data: { grade: newGrade } }),
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, commission: payout.commission_brute, rev_gagnes: payout.rev_gagnes })
  } catch (e) {
    console.error('track-conversion error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
