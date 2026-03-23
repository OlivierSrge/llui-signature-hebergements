// app/api/portail/mariage-traditionnel/route.ts — #64 Sauvegarde progression mariage traditionnel
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { marie_uid, dot_items, civil_done, religi_done } = await req.json()
    if (!marie_uid) return NextResponse.json({ error: 'marie_uid requis' }, { status: 400 })

    const db = getDb()
    await db.collection('portail_users').doc(marie_uid).update({
      mariage_traditionnel: { dot_items, civil_done, religi_done, updated_at: new Date().toISOString() },
    })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
