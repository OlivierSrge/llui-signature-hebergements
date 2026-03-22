// app/api/portail/budget-reel/route.ts
// GET — Calcul du budget réel engagé par catégorie
// Source : prestataires[] du document marié (montants par type)

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

// Mapping type prestataire → clé catégorie budget
const TYPE_TO_CAT: Record<string, string> = {
  traiteur:            'traiteur',
  photographe:         'photographie',
  videaste:            'photographie',
  decorateur:          'decoration',
  fleuriste:           'decoration',
  musicien:            'musique',
  maitre_ceremonies:   'maitre_ceremonies',
  beaute:              'beaute',
  technique_son_lumiere: 'technique',
  transport:           'transport',
  wedding_planner:     'autres',
  hebergement:         'hebergement',
  COORDINATION:        'autres',
  PHOTO_VIDEO:         'photographie',
  TRAITEUR:            'traiteur',
  MUSIQUE:             'musique',
  DECORATION:          'decoration',
  AUTRE:               'autres',
  autre:               'autres',
}

export async function GET() {
  try {
    const jar = await cookies()
    const uid = jar.get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const db = getDb()
    const snap = await db.collection('portail_users').doc(uid).get()
    if (!snap.exists) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const prestataires: Array<{ type?: string; categorie?: string; montant?: number; statut?: string }> =
      snap.data()?.prestataires ?? []

    const reel: Record<string, number> = {}

    for (const p of prestataires) {
      // Inclure tous les prestataires (pas seulement confirmés) pour refléter les engagements
      const montant = Number(p.montant) || 0
      if (montant <= 0) continue
      const type = (p.type ?? p.categorie ?? 'autre').toLowerCase()
      const cat = TYPE_TO_CAT[type] ?? TYPE_TO_CAT[p.type ?? ''] ?? 'autres'
      reel[cat] = (reel[cat] ?? 0) + montant
    }

    return NextResponse.json({ budget_reel: reel })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
