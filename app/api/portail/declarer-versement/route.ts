// app/api/portail/declarer-versement/route.ts
// POST — Déclarer un versement dans mariés/[uid].versements[]

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const jar = await cookies()
    const uid = jar.get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { montant, date, mode, note, recu_url } = await req.json()
    if (!montant || montant <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })

    const versement = {
      id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      montant: Number(montant),
      date: date ?? new Date().toISOString().split('T')[0],
      mode: mode ?? 'autre',
      note: note?.trim() ?? '',
      recu_url: recu_url ?? '',
      statut: 'declare',
      created_at: new Date().toISOString(),
    }

    const db = getDb()
    await db.collection('portail_users').doc(uid).update({
      versements: FieldValue.arrayUnion(versement),
    })

    return NextResponse.json({ success: true, versement })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
