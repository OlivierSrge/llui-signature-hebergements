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

export async function getPartenairesProches(
  lat: number,
  lng: number,
  rayonKm = 2
): Promise<PartenaireProcheResult[]> {
  try {
    const snap = await db.collection('partenaires').where('is_active', '==', true).get()

    const resultats: PartenaireProcheResult[] = []

    for (const doc of snap.docs) {
      const d = doc.data() as any
      const pLat = d.latitude as number | null
      const pLng = d.longitude as number | null

      if (!pLat || !pLng) continue

      const dist = haversineKm(lat, lng, pLat, pLng)
      if (dist > rayonKm) continue

      resultats.push({
        id: doc.id,
        name: (d.name ?? 'Partenaire') as string,
        phone: (d.phone ?? d.whatsapp_number ?? null) as string | null,
        address: (d.address ?? null) as string | null,
        distance_km: Math.round(dist * 100) / 100,
        disponible: !!(d.qr_etablissement_data),
        qr_etablissement_data: (d.qr_etablissement_data ?? null) as string | null,
        latitude: pLat,
        longitude: pLng,
      })
    }

    return resultats.sort((a, b) => a.distance_km - b.distance_km)
  } catch (err) {
    console.error('[getPartenairesProches]', err)
    return []
  }
}
