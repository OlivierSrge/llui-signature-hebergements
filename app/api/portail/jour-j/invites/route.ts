// app/api/portail/jour-j/invites/route.ts — #172 Liste invités pour check-in jour J
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const marie_uid = req.nextUrl.searchParams.get('marie_uid')
    if (!marie_uid) return NextResponse.json({ error: 'marie_uid requis' }, { status: 400 })

    const db = getDb()
    const snap = await db.collection('portail_users').doc(marie_uid)
      .collection('rsvp_guests').where('presence', '==', 'oui').orderBy('nom').get()

    const invites = snap.docs.map(doc => {
      const d = doc.data()
      return {
        id: doc.id,
        prenom: d.prenom || '',
        nom: d.nom || '',
        tel: d.tel || '',
        table: d.table || null,
        checked_in: d.checked_in ?? false,
        heure_arrivee: d.heure_arrivee || null,
      }
    })

    return NextResponse.json({ invites })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
