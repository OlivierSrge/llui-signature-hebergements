// app/fiche/[marie_uid]/page.tsx — Server Component
// URL : /fiche/[marie_uid]?prenom=[PRENOM]&code=[CODE]
// PUBLIQUE — pas d'auth requise

import { getDb } from '@/lib/firebase'
import FicheClient from './FicheClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: { marie_uid: string }
  searchParams: { prenom?: string; code?: string }
}

async function getMarieData(marie_uid: string) {
  try {
    const db = getDb()
    const snap = await db.collection('portail_users').doc(marie_uid).get()
    if (!snap.exists) return null
    const d = snap.data()!

    const dateTs = d.date_mariage ?? d.projet?.date_evenement
    const dateISO = dateTs?.toDate
      ? dateTs.toDate().toISOString().slice(0, 10)
      : typeof dateTs === 'string' ? dateTs : ''

    return {
      noms_maries: (d.noms_maries as string) || '',
      date_mariage: dateISO,
      lieu: (d.lieu as string) || (d.projet?.lieu as string) || 'Kribi, Cameroun',
      code_promo: (d.code_promo as string) || '',
    }
  } catch {
    return null
  }
}

export default async function FichePage({ params, searchParams }: Props) {
  const { marie_uid } = params
  const prenom = searchParams.prenom || 'Cher(e) invité(e)'
  const codeParam = searchParams.code || ''

  const marieData = await getMarieData(marie_uid)

  if (!marieData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#1A1A1A' }}>
        <div className="text-center">
          <p className="font-serif italic text-3xl mb-4" style={{ color: '#C9A84C' }}>L&Lui Signature</p>
          <p className="text-white text-sm mb-2">Invitation introuvable.</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Contactez les mariés pour obtenir un lien valide.</p>
        </div>
      </div>
    )
  }

  const code = codeParam || marieData.code_promo

  return (
    <FicheClient
      marie_uid={marie_uid}
      noms_maries={marieData.noms_maries}
      date_mariage={marieData.date_mariage}
      lieu={marieData.lieu}
      code={code}
      prenom={prenom}
    />
  )
}
