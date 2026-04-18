'use server'
// actions/partenaires-map.ts
// Récupère les partenaires L&Lui Stars géolocalisés (prescripteurs_partenaires).
// NE retourne JAMAIS les données financières (taux, commissions, provisions).

import { db } from '@/lib/firebase'
import { serializeFirestoreDoc } from '@/lib/serialization'
import type { PartenaireAvecLocation } from '@/types/geolocation'

export async function getPartenairesGeolocalisees(): Promise<PartenaireAvecLocation[]> {
  try {
    const snap = await db
      .collection('prescripteurs_partenaires')
      .where('statut', '==', 'actif')
      .get()

    const results: PartenaireAvecLocation[] = []
    for (const doc of snap.docs) {
      const s = serializeFirestoreDoc(doc.data())
      const lat = s.latitude as number | undefined
      const lng = s.longitude as number | undefined
      if (typeof lat !== 'number' || typeof lng !== 'number') continue

      results.push({
        id: doc.id,
        nom: (s.nom_etablissement as string) ?? '',
        type: (s.type as string) ?? '',
        photoUrl: (s.photoUrl as string) ?? undefined,
        latitude: lat,
        longitude: lng,
        adresse_gps: (s.adresse_gps as string) ?? '',
      })
    }
    return results
  } catch (e) {
    console.error('[getPartenairesGeolocalisees] erreur:', e)
    return []
  }
}
