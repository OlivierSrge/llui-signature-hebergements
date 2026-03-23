// app/faire-part/[marie_uid]/page.tsx — #50 Faire-part interactif (Server Component)
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import FairePartClient from '@/components/faire-part/FairePartClient'

export const dynamic = 'force-dynamic'

interface Props { params: { marie_uid: string } }

export async function generateMetadata({ params }: Props) {
  try {
    const db = getDb()
    const snap = await db.collection('portail_users').doc(params.marie_uid).get()
    if (!snap.exists) return { title: 'Faire-part' }
    const d = snap.data()!
    return {
      title: `Mariage de ${d.noms_maries ?? 'Les Mariés'}`,
      description: `Invitation au mariage de ${d.noms_maries ?? 'Les Mariés'}`,
    }
  } catch { return { title: 'Faire-part' } }
}

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
      lieu: (d.lieu as string) || (d.projet?.lieu as string) || 'Kribi, Cameroun',
      code_promo: (d.code_promo as string) || '',
      message_perso: (d.message_faire_part as string) || '',
    }
  } catch { return null }
}

export default async function FairePartPage({ params }: Props) {
  const data = await getData(params.marie_uid)
  if (!data) notFound()
  return <FairePartClient marie_uid={params.marie_uid} {...data} />
}
