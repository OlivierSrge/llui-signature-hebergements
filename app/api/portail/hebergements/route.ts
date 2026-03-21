// app/api/portail/hebergements/route.ts
// Hébergements depuis Firestore collection "hebergements" + Packs groupés

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export interface Hebergement {
  id: string
  nom: string
  localisation: string
  lieu: string
  type: string
  prix_nuit_base: number
  prix_nuit: number
  reduction_fidelite: number
  image_url: string
  url_reservation: string
  description: string
  tags: string[]
  capacite: number
  disponible: boolean
}

export interface Pack {
  id: string
  nom: string
  type: 'PACK'
  sous_type: string
  description: string
  prix: number
  inclus: string[]
  capacite: number
  image_url: string
  url_detail: string
}

export async function GET() {
  const db = getDb()
  let hebergements: Hebergement[] = []
  let packs: Pack[] = []

  try {
    const snap = await db.collection('hebergements').where('status', '==', 'active').get()
    hebergements = snap.docs.map(doc => {
      const d = doc.data()
      const loc = d.location ?? d.localisation ?? d.lieu ?? 'Kribi, Cameroun'
      const prixNuit = d.price_per_night ?? d.prix_nuit ?? 0
      return {
        id: doc.id,
        nom: d.name ?? d.nom ?? '',
        localisation: loc,
        lieu: loc,
        type: d.type ?? 'HEBERGEMENT',
        prix_nuit_base: prixNuit,
        prix_nuit: prixNuit,
        reduction_fidelite: d.reduction_fidelite ?? 0,
        image_url: (Array.isArray(d.images) ? d.images[0] : undefined) ?? d.image_url ?? '',
        url_reservation: '/hebergements/' + (d.slug ?? doc.id),
        description: d.description ?? '',
        tags: Array.isArray(d.tags) ? d.tags : (Array.isArray(d.amenities) ? d.amenities : []),
        capacite: d.max_guests ?? d.capacite ?? 0,
        disponible: d.disponible !== false,
      }
    })
  } catch { hebergements = [] }

  try {
    const snap = await db.collection('packs').where('status', '==', 'active').get()
    packs = snap.docs.map(doc => {
      const d = doc.data()
      const nom = String(d.name ?? '')
      const n = nom.toUpperCase()
      const sous_type = n.includes('VIP') ? 'VIP' : n.includes('SIGNATURE') ? 'SIGNATURE' : 'F3'
      return {
        id: doc.id, nom, type: 'PACK' as const, sous_type,
        description: String(d.description ?? ''),
        prix: Number(d.price ?? 0),
        inclus: Array.isArray(d.included_properties) ? d.included_properties : [],
        capacite: Number(d.max_guests ?? 0),
        image_url: Array.isArray(d.images) ? (d.images[0] ?? '') : '',
        url_detail: '/packs/' + doc.id,
      }
    })
  } catch { packs = [] }

  return NextResponse.json({ hebergements, packs })
}
