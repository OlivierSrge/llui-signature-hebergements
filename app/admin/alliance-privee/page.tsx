import { getAllAlliancePartners, getCandidatures, getAllianceStats, getPaiementsEnAttente } from '@/actions/alliance-privee'
import { getAllMatchs } from '@/actions/alliance-privee-matching'
import { serialize } from '@/lib/serialize'
import { db } from '@/lib/firebase'
import AllianceAdminClient from '@/components/alliance-privee/AllianceAdminClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Alliance Privée — Admin | L&Lui' }

export default async function AdminAlliancePriveePage() {
  const [partners, candidatures, stats, paiements, matchs, portraitsSnap] = await Promise.all([
    getAllAlliancePartners(),
    getCandidatures(),
    getAllianceStats(),
    getPaiementsEnAttente(),
    getAllMatchs(),
    // Tous les portraits — sans filtre actif pour tout voir en admin
    db.collection('alliance_privee_portraits_verified').orderBy('created_at', 'desc').get(),
  ])

  const portraits = portraitsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  return (
    <AllianceAdminClient
      partners={serialize(partners)}
      candidatures={serialize(candidatures)}
      stats={serialize(stats)}
      paiements={serialize(paiements)}
      matchs={serialize(matchs)}
      portraits={serialize(portraits)}
    />
  )
}
