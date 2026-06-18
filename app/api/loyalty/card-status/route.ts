import { db } from '@/lib/firebase'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/loyalty/card-status?card_id=xxx
// Utilisé par la page client pour polling temps réel (toutes les 5s)
// Pas d'authentification — la carte est un secret en soi (lien privé)
export async function GET(req: NextRequest) {
  const card_id = req.nextUrl.searchParams.get('card_id')
  if (!card_id) {
    return NextResponse.json({ error: 'card_id manquant' }, { status: 400 })
  }

  try {
    const doc = await db.collection('loyalty_cards').doc(card_id).get()
    if (!doc.exists) {
      return NextResponse.json({ error: 'Carte introuvable' }, { status: 404 })
    }

    const d = doc.data()!
    return NextResponse.json({
      statut: d.statut,
      points_cumules: d.points_cumules ?? 0,
      niveau_actuel: d.niveau_actuel ?? 'bronze',
      updated_at: d.updated_at?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    })
  } catch (err) {
    console.error('[card-status]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
