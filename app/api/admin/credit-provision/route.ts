// app/api/admin/credit-provision/route.ts
// POST { partnerId, amount } → crédite solde_provision du partenaire (FieldValue.increment)

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { partnerId?: string; amount?: number }
    const { partnerId, amount } = body

    if (!partnerId || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ success: false, error: 'partnerId et amount (> 0) requis' }, { status: 400 })
    }

    const ref = db.collection('prescripteurs_partenaires').doc(partnerId)
    const snap = await ref.get()

    if (!snap.exists) {
      return NextResponse.json({ success: false, error: 'Partenaire introuvable' }, { status: 404 })
    }

    await ref.update({
      solde_provision: FieldValue.increment(amount),
      updated_at: FieldValue.serverTimestamp(),
    })

    const updated = await ref.get()
    const newBalance = (updated.data()?.solde_provision as number) ?? 0

    console.log(`[Fidelite] Provision créditée — partenaire=${partnerId}, +${amount} FCFA, nouveau solde=${newBalance}`)

    return NextResponse.json({ success: true, newBalance })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[Fidelite] credit-provision erreur:', e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
