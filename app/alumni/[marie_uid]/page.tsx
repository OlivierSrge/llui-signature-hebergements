// app/alumni/[marie_uid]/page.tsx — #152 Réseau couples alumni (Server Component)
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import AlumniClient from '@/components/alumni/AlumniClient'

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
    const jours = dateISO
      ? Math.max(0, Math.floor((Date.now() - new Date(dateISO).getTime()) / 86400000))
      : 0
    return {
      marie_uid,
      noms_maries: (d.noms_maries as string) || '',
      date_mariage: dateISO,
      whatsapp_groupe_url: (d.alumni_whatsapp_url as string) || 'https://chat.whatsapp.com/llui-alumni',
      jours_depuis_mariage: jours,
      avantages: [],
    }
  } catch { return null }
}

export async function generateMetadata({ params }: Props) {
  const data = await getData(params.marie_uid)
  return {
    title: data ? `Espace Alumni — ${data.noms_maries}` : 'Espace Alumni L&Lui',
    description: 'Votre espace communauté, avantages anniversaire et groupe WhatsApp alumni.',
  }
}

export default async function AlumniPage({ params }: Props) {
  const data = await getData(params.marie_uid)
  if (!data) notFound()
  return <AlumniClient {...data} />
}
