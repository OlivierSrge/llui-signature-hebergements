// app/api/portail/jour-j/checkin/route.ts — #172 Check-in invité temps réel
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { marie_uid, invite_id, checked_in } = await req.json()
    if (!marie_uid || !invite_id) return NextResponse.json({ error: 'marie_uid et invite_id requis' }, { status: 400 })

    const db = getDb()
    const ref = db.collection('portail_users').doc(marie_uid)
      .collection('rsvp_guests').doc(invite_id)

    await ref.update({
      checked_in,
      heure_arrivee: checked_in ? new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null,
    })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
