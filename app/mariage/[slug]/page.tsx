// app/mariage/[slug]/page.tsx — #19 Page mariage publique SEO (Server Component)
// slug = marie_uid ou code_promo

import { notFound } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import MariagePublicClient from '@/components/mariage/MariagePublicClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

async function getData(slug: string) {
  try {
    const db = getDb()
    // Chercher d'abord par uid direct
    const directSnap = await db.collection('portail_users').doc(slug).get()
    if (directSnap.exists) {
      return buildData(slug, directSnap.data()!)
    }
    // Sinon chercher par code_promo
    const byCode = await db.collection('portail_users')
      .where('code_promo', '==', slug)
      .where('role', '==', 'MARIÉ')
      .limit(1)
      .get()
    if (!byCode.empty) {
      const doc = byCode.docs[0]
      return buildData(doc.id, doc.data())
    }
    return null
  } catch { return null }
}

function buildData(uid: string, d: FirebaseFirestore.DocumentData) {
  const dateRaw = d.date_mariage ?? d.projet?.date_evenement
  const dateISO: string = dateRaw?.toDate
    ? dateRaw.toDate().toISOString().slice(0, 10)
    : typeof dateRaw === 'string' ? dateRaw : ''

  return {
    uid,
    noms_maries: (d.noms_maries as string) || '',
    date_mariage: dateISO,
    lieu: (d.lieu as string) || (d.projet?.lieu as string) || 'Kribi, Cameroun',
    code_promo: (d.code_promo as string) || '',
    message_bienvenue: (d.message_bienvenue as string) || '',
    programme: (d.programme as Array<{ heure: string; libelle: string }> | undefined) ?? [],
  }
}

export async function generateMetadata({ params }: Props) {
  const data = await getData(params.slug)
  if (!data) return { title: 'Mariage' }
  return {
    title: `Mariage de ${data.noms_maries}`,
    description: `Rejoignez ${data.noms_maries} pour leur mariage le ${data.date_mariage ? new Date(data.date_mariage).toLocaleDateString('fr-FR') : ''} à ${data.lieu}`,
    openGraph: {
      title: `Mariage de ${data.noms_maries} 💍`,
      description: `${data.lieu} — ${data.date_mariage ? new Date(data.date_mariage).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}`,
    },
  }
}

export default async function MariagePage({ params }: Props) {
  const data = await getData(params.slug)
  if (!data) notFound()
  return <MariagePublicClient {...data} />
}
