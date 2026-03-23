// app/mariage-traditionnel/[marie_uid]/page.tsx — #64 Module dot/mariage coutumier (Server Component)
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import MariageTraditionnelClient from '@/components/mariage-traditionnel/MariageTraditionnelClient'

export const dynamic = 'force-dynamic'

interface Props { params: { marie_uid: string } }

async function getData(marie_uid: string) {
  try {
    const db = getDb()
    const snap = await db.collection('portail_users').doc(marie_uid).get()
    if (!snap.exists) return null
    const d = snap.data()!
    const dateRaw = d.date_mariage ?? d.projet?.date_evenement
    const dateISO: string = dateRaw?.toDate
      ? dateRaw.toDate().toISOString().slice(0, 10)
      : typeof dateRaw === 'string' ? dateRaw : ''

    // Données mariage traditionnel stockées dans Firestore
    const traditionnel = (d.mariage_traditionnel as Record<string, unknown>) ?? {}

    return {
      marie_uid,
      noms_maries: (d.noms_maries as string) || '',
      date_mariage: dateISO,
      lieu: (d.lieu as string) || 'Kribi, Cameroun',
      traditionnel,
    }
  } catch { return null }
}

export async function generateMetadata({ params }: Props) {
  const data = await getData(params.marie_uid)
  return { title: data ? `Mariage traditionnel — ${data.noms_maries}` : 'Mariage traditionnel' }
}

export default async function MariageTraditionnelPage({ params }: Props) {
  const data = await getData(params.marie_uid)
  if (!data) notFound()
  return <MariageTraditionnelClient {...data} />
}
