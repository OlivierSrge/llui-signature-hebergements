export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import CalendrierClient from './CalendrierClient'

export const metadata = { title: 'Calendrier Kribi' }

async function getEvenements() {
  try {
    const snap = await db.collection('evenements_kribi').orderBy('date_debut', 'desc').get()
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      date_debut: d.data().date_debut?.toDate
        ? d.data().date_debut.toDate().toISOString()
        : d.data().date_debut ?? '',
      date_fin: d.data().date_fin?.toDate
        ? d.data().date_fin.toDate().toISOString()
        : d.data().date_fin ?? '',
    }))
  } catch {
    return []
  }
}

async function getHebergements() {
  try {
    const snap = await db.collection('hebergements').where('status', '==', 'active').get()
    return snap.docs.map((d) => ({
      id: d.id,
      name: d.data().name ?? '',
    }))
  } catch {
    return []
  }
}

export default async function CalendrierPage() {
  const [evenements, hebergements] = await Promise.all([getEvenements(), getHebergements()])
  return <CalendrierClient evenements={evenements as any} hebergements={hebergements} />
}
