// app/api/evenements/weekend/route.ts
// Retourne les événements du weekend en cours depuis Firestore evenements_kribi

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

function getWeekendRange(): { start: Date; end: Date; labelSamedi: string; labelDimanche: string } {
  const now = new Date()
  const day = now.getDay() // 0=dim, 1=lun ... 6=sam

  // Si samedi → today; si dimanche → hier; sinon → prochain samedi
  let saturday: Date
  if (day === 6) {
    saturday = new Date(now)
  } else if (day === 0) {
    saturday = new Date(now)
    saturday.setDate(now.getDate() - 1)
  } else {
    saturday = new Date(now)
    saturday.setDate(now.getDate() + (6 - day))
  }
  saturday.setHours(0, 0, 0, 0)

  const sunday = new Date(saturday)
  sunday.setDate(saturday.getDate() + 1)
  sunday.setHours(23, 59, 59, 999)

  const fmt = (d: Date) =>
    d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return { start: saturday, end: sunday, labelSamedi: fmt(saturday), labelDimanche: fmt(sunday) }
}

export async function GET() {
  const db = getDb()
  const { start, end, labelSamedi, labelDimanche } = getWeekendRange()

  let evenements: any[] = []
  let hebergements: any[] = []

  try {
    const snap = await db.collection('evenements_kribi').where('actif', '==', true).get()

    evenements = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((ev: any) => {
        // Événements récurrents du weekend
        if (ev.recurrent && ['samedi', 'dimanche', 'weekend'].includes(ev.jour_recurrence)) {
          return true
        }
        // Événements ponctuels dans la plage du weekend
        const dateDebut: Date =
          ev.date_debut?.toDate ? ev.date_debut.toDate() : new Date(ev.date_debut)
        return dateDebut >= start && dateDebut <= end
      })
      .map((ev: any) => ({
        ...ev,
        date_debut: ev.date_debut?.toDate
          ? ev.date_debut.toDate().toISOString()
          : ev.date_debut,
        date_fin: ev.date_fin?.toDate
          ? ev.date_fin.toDate().toISOString()
          : ev.date_fin,
      }))
      .sort((a: any, b: any) => {
        const da = new Date(a.date_debut).getTime()
        const db2 = new Date(b.date_debut).getTime()
        return da - db2
      })
  } catch {
    evenements = []
  }

  // Collecter tous les IDs d'hébergements associés
  const hIds = new Set<string>()
  evenements.forEach((ev: any) => {
    if (Array.isArray(ev.hebergements_associes)) {
      ev.hebergements_associes.forEach((id: string) => hIds.add(id))
    }
  })

  try {
    if (hIds.size > 0) {
      const hSnap = await db
        .collection('hebergements')
        .where('status', '==', 'active')
        .get()
      hebergements = hSnap.docs
        .filter((d) => hIds.has(d.id))
        .map((d) => {
          const data = d.data()
          return {
            id: d.id,
            nom: data.name ?? '',
            prix_nuit: data.price_per_night ?? 0,
            image: Array.isArray(data.images) ? data.images[0] : '',
            slug: data.slug ?? d.id,
          }
        })
    }

    // Fallback : 3 hébergements les mieux notés si aucun associé
    if (hebergements.length === 0) {
      const fallbackSnap = await db
        .collection('hebergements')
        .where('status', '==', 'active')
        .get()
      hebergements = fallbackSnap.docs
        .map((d) => {
          const data = d.data()
          return {
            id: d.id,
            nom: data.name ?? '',
            prix_nuit: data.price_per_night ?? 0,
            image: Array.isArray(data.images) ? data.images[0] : '',
            slug: data.slug ?? d.id,
            ratings_overall: data.ratings?.overall ?? 0,
            featured: data.featured ?? false,
          }
        })
        .sort((a, b) => {
          if (a.featured && !b.featured) return -1
          if (!a.featured && b.featured) return 1
          return b.ratings_overall - a.ratings_overall
        })
        .slice(0, 3)
    }
  } catch {
    hebergements = []
  }

  return NextResponse.json({
    evenements,
    hebergements,
    total: evenements.length,
    weekend: { labelSamedi, labelDimanche },
  })
}
