// app/api/portail/track-invite-click/route.ts
// Tracking clics invités sur boutique / hébergements

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

interface TrackBody {
  guest_id: string
  mariage_uid: string
  platform: 'boutique' | 'hebergement'
  code_promo: string
}

export async function POST(req: Request) {
  try {
    const body: TrackBody = await req.json()
    const { guest_id, mariage_uid, platform, code_promo } = body

    if (!guest_id || !mariage_uid || !platform) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const db = getDb()

    // Vérifier que l'invité existe
    const guestRef = db.collection('portail_users').doc(mariage_uid)
      .collection('invites_guests').doc(guest_id)
    const guestSnap = await guestRef.get()

    if (guestSnap.exists) {
      const updateData: Record<string, unknown> = {
        lien_envoye: true,
        derniere_activite: new Date(),
      }
      if (platform === 'boutique') {
        updateData.clicks_boutique = FieldValue.increment(1)
      } else {
        updateData.clicks_hebergement = FieldValue.increment(1)
      }
      await guestRef.update(updateData).catch(() => {})
    }

    // Log global du clic
    await db.collection('invite_clicks').add({
      guest_id, mariage_uid, platform, code_promo,
      clicked_at: new Date(),
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
