// app/album/[marie_uid]/page.tsx — #9 Album souvenir post-mariage (Server Component)
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import AlbumClient from '@/components/album/AlbumClient'

export const dynamic = 'force-dynamic'

interface Props { params: { marie_uid: string } }

async function getData(marie_uid: string) {
  try {
    const db = getDb()
    const snap = await db.collection('portail_users').doc(marie_uid).get()
    if (!snap.exists) return null
    const d = snap.data()!
    const photos = (d.album_photos as Array<{ url: string; caption?: string; uploaded_at?: string }>) ?? []
    const dateRaw = d.date_mariage ?? d.projet?.date_evenement
    const dateISO: string = dateRaw?.toDate
      ? dateRaw.toDate().toISOString().slice(0, 10)
      : typeof dateRaw === 'string' ? dateRaw : ''
    return {
      marie_uid,
      noms_maries: (d.noms_maries as string) || '',
      date_mariage: dateISO,
      photos,
    }
  } catch { return null }
}

export async function generateMetadata({ params }: Props) {
  const data = await getData(params.marie_uid)
  return { title: data ? `Album souvenir — ${data.noms_maries}` : 'Album souvenir' }
}

export default async function AlbumPage({ params }: Props) {
  const data = await getData(params.marie_uid)
  if (!data) notFound()
  return <AlbumClient {...data} />
}
