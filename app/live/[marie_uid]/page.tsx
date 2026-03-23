// app/live/[marie_uid]/page.tsx — #176 Livestream cérémonie (Server Component)
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import LiveClient from '@/components/live/LiveClient'

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
      marie_uid,
      noms_maries: (d.noms_maries as string) || '',
      date_mariage: dateISO,
      youtube_live_id: (d.youtube_live_id as string) || '',
      youtube_video_id: (d.youtube_video_id as string) || '',
      live_actif: (d.live_actif as boolean) ?? false,
    }
  } catch { return null }
}

export async function generateMetadata({ params }: Props) {
  const data = await getData(params.marie_uid)
  return {
    title: data ? `Livestream — Mariage de ${data.noms_maries}` : 'Livestream mariage',
    openGraph: { title: data ? `🔴 EN DIRECT — Mariage de ${data.noms_maries}` : 'Livestream mariage' },
  }
}

export default async function LivePage({ params }: Props) {
  const data = await getData(params.marie_uid)
  if (!data) notFound()
  return <LiveClient {...data} />
}
