// app/api/seed-event/route.ts
// Injecte un événement test dans evenements_kribi Firestore
// Usage : GET /api/seed-event?secret=[ADMIN_SECRET]

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const evenements = [
    {
      titre: 'Festival Bord de Mer',
      description: 'Musique live et gastronomie au bord de l\'eau',
      date_debut: new Date(Date.now() + 86400000 * 3).toISOString(),
      date_fin: null,
      lieu: 'Plage des Cocotiers, Kribi',
      type: 'festival',
      emoji: '🏖️',
      actif: true,
      created_at: new Date().toISOString(),
      created_by: 'system',
    },
    {
      titre: 'Soirée Jazz & Gastronomie',
      description: 'Concert jazz en plein air avec dégustation',
      date_debut: new Date(Date.now() + 86400000 * 7).toISOString(),
      date_fin: null,
      lieu: 'Bar Le Cocotier, Kribi',
      type: 'gastronomie',
      emoji: '🎵',
      actif: true,
      created_at: new Date().toISOString(),
      created_by: 'system',
    },
    {
      titre: 'Tournoi de Beach Volley',
      description: 'Compétition ouverte à tous les niveaux',
      date_debut: new Date(Date.now() + 86400000 * 14).toISOString(),
      date_fin: null,
      lieu: 'Grande Plage, Kribi',
      type: 'sport',
      emoji: '⚽',
      actif: true,
      created_at: new Date().toISOString(),
      created_by: 'system',
    },
  ]

  const ids: string[] = []
  for (const ev of evenements) {
    const ref = db.collection('evenements_kribi').doc()
    await ref.set({ uid: ref.id, ...ev })
    ids.push(ref.id)
  }

  return NextResponse.json({
    success: true,
    message: `${ids.length} événements créés dans evenements_kribi`,
    ids,
  })
}
