'use server'

import { db } from '@/lib/firebase'

export interface PartenaireProcheResult {
  id: string
  name: string
  phone: string | null
  address: string | null
  distance_km: number
  disponible: boolean // a un QR établissement configuré
  qr_etablissement_data: string | null
  latitude: number | null
  longitude: number | null
  total_logements: number
  logements_disponibles: number
  statut_disponibilite: 'disponible' | 'partiel' | 'complet' | 'inconnu'
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function compterLogementsDisponibles(partenaireId: string): Promise<{
  total: number
  disponibles: number
}> {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Logements du partenaire
    const hebergSnap = await db.collection('hebergements')
      .where('partner_id', '==', partenaireId)
      .where('status', '==', 'active')
      .get()

    if (hebergSnap.empty) return { total: 0, disponibles: 0 }

    const total = hebergSnap.docs.length
    let occupes = 0

    // Pour chaque logement, vérifier s'il y a une réservation active aujourd'hui
    await Promise.all(
      hebergSnap.docs.map(async (hebergDoc) => {
        const snap = await db.collection('reservations')
          .where('accommodation_id', '==', hebergDoc.id)
          .where('reservation_status', 'in', ['confirmee', 'en_attente'])
          .get()

        // Réservation occupée si check_in <= today <= check_out
        const estOccupe = snap.docs.some((r) => {
          const d = r.data()
          return d.check_in <= today && d.check_out >= today
        })

        if (estOccupe) occupes++
      })
    )

    return { total, disponibles: total - occupes }
  } catch {
    return { total: 0, disponibles: 0 }
  }
}

export async function getPartenairesProches(
  lat: number,
  lng: number,
  rayonKm = 2
): Promise<PartenaireProcheResult[]> {
  try {
    const snap = await db.collection('partenaires').where('is_active', '==', true).get()

    // Filtrer par distance d'abord
    const candidats = snap.docs
      .map((doc) => {
        const d = doc.data() as any
        const pLat = d.latitude as number | null
        const pLng = d.longitude as number | null
        if (!pLat || !pLng) return null
        const dist = haversineKm(lat, lng, pLat, pLng)
        if (dist > rayonKm) return null
        return { doc, d, dist }
      })
      .filter(Boolean) as { doc: FirebaseFirestore.QueryDocumentSnapshot; d: any; dist: number }[]

    // Calculer disponibilités en parallèle
    const resultats: PartenaireProcheResult[] = await Promise.all(
      candidats.map(async ({ doc, d, dist }) => {
        const dispo = await compterLogementsDisponibles(doc.id)

        let statut_disponibilite: PartenaireProcheResult['statut_disponibilite'] = 'inconnu'
        if (dispo.total > 0) {
          if (dispo.disponibles === 0) statut_disponibilite = 'complet'
          else if (dispo.disponibles < dispo.total) statut_disponibilite = 'partiel'
          else statut_disponibilite = 'disponible'
        }

        return {
          id: doc.id,
          name: (d.name ?? 'Partenaire') as string,
          phone: (d.phone ?? d.whatsapp_number ?? null) as string | null,
          address: (d.adresse_gps ?? d.address ?? null) as string | null,
          distance_km: Math.round(dist * 100) / 100,
          disponible: !!(d.qr_etablissement_data),
          qr_etablissement_data: (d.qr_etablissement_data ?? null) as string | null,
          latitude: d.latitude as number,
          longitude: d.longitude as number,
          total_logements: dispo.total,
          logements_disponibles: dispo.disponibles,
          statut_disponibilite,
        }
      })
    )

    return resultats.sort((a, b) => a.distance_km - b.distance_km)
  } catch (err) {
    console.error('[getPartenairesProches]', err)
    return []
  }
}
