// app/rsvp/[marie_uid]/page.tsx — #42 RSVP formulaire dynamique (Server Component)
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import RSVPClient from '@/components/rsvp/RSVPClient'

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
    return {
      noms_maries: (d.noms_maries as string) || '',
      date_mariage: dateISO,
      lieu: (d.lieu as string) || 'Kribi, Cameroun',
    }
  } catch { return null }
}

export async function generateMetadata({ params }: Props) {
  const data = await getData(params.marie_uid)
  return { title: data ? `RSVP — Mariage de ${data.noms_maries}` : 'RSVP' }
}

export default async function RSVPPage({ params }: Props) {
  const data = await getData(params.marie_uid)
  if (!data) notFound()
  return <RSVPClient marie_uid={params.marie_uid} {...data} />
}
