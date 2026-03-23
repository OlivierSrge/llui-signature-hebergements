// app/invite-jour-j/[marie_uid]/page.tsx — #174 App invité jour J (Server Component public)
// Accessible via QR Code sur les tables le jour du mariage, sans login

import { notFound } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import JourJClient from '@/components/invite-jour-j/JourJClient'

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
      code_promo: (d.code_promo as string) || '',
      programme: (d.programme as Array<{ heure: string; libelle: string }> | undefined) ?? [],
      message_jour_j: (d.message_jour_j as string) || '',
    }
  } catch { return null }
}

export async function generateMetadata({ params }: Props) {
  return { title: 'Bienvenue — Jour J 💍' }
}

export default async function InviteJourJPage({ params }: Props) {
  const data = await getData(params.marie_uid)
  if (!data) notFound()
  return <JourJClient marie_uid={params.marie_uid} {...data} />
}
