// app/api/portail/lune-de-miel/route.ts — #107 Booking lune de miel
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { marie_uid, package_id, dates, notes } = await req.json()
    if (!marie_uid || !package_id) return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })

    const db = getDb()
    await db.collection('portail_users').doc(marie_uid).update({
      lune_de_miel: {
        package_id, dates, notes,
        statut: 'demande',
        created_at: new Date().toISOString(),
      },
    })
    await db.collection('admin_logs').add({
      type: 'lune_de_miel_demande',
      marie_uid, package_id, dates,
      created_at: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
