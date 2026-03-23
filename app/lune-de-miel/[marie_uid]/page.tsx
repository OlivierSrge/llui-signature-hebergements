// app/lune-de-miel/[marie_uid]/page.tsx — #107 Module lune de miel Kribi (Server Component)
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import LuneDeMielClient from '@/components/lune-de-miel/LuneDeMielClient'

export const dynamic = 'force-dynamic'

interface Props { params: { marie_uid: string } }

async function getData(marie_uid: string) {
  try {
    const db = getDb()
    const snap = await db.collection('portail_users').doc(marie_uid).get()
    if (!snap.exists) return null
    const d = snap.data()!
    return {
      marie_uid,
      noms_maries: (d.noms_maries as string) || '',
      code_promo: (d.code_promo as string) || '',
    }
  } catch { return null }
}

export async function generateMetadata({ params }: Props) {
  const data = await getData(params.marie_uid)
  return { title: data ? `Lune de miel Kribi — ${data.noms_maries}` : 'Lune de miel Kribi' }
}

export default async function LuneDeMielPage({ params }: Props) {
  const data = await getData(params.marie_uid)
  if (!data) notFound()
  return <LuneDeMielClient {...data} />
}
