// app/save-the-date/[marie_uid]/page.tsx — #49 Save the date animé (Server Component)
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import SaveTheDateClient from '@/components/save-the-date/SaveTheDateClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: { marie_uid: string }
  searchParams: { template?: string }
}

export async function generateMetadata({ params }: Props) {
  return {
    title: 'Save the Date',
    description: 'Vous êtes cordialement invité(e)',
  }
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
    }
  } catch { return null }
}

export default async function SaveTheDatePage({ params, searchParams }: Props) {
  const data = await getData(params.marie_uid)
  if (!data) notFound()
  return (
    <SaveTheDateClient
      marie_uid={params.marie_uid}
      noms_maries={data.noms_maries}
      date_mariage={data.date_mariage}
      lieu={data.lieu}
      code_promo={data.code_promo}
      template={(searchParams.template as '1' | '2' | '3') ?? '1'}
    />
  )
}
