import { getAllAlliancePartners, getCandidatures, getAllianceStats, getPaiementsEnAttente } from '@/actions/alliance-privee'
import { serialize } from '@/lib/serialize'
import AllianceAdminClient from '@/components/alliance-privee/AllianceAdminClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Alliance Privée — Admin | L&Lui' }

export default async function AdminAlliancePriveePage() {
  const [partners, candidatures, stats, paiements] = await Promise.all([
    getAllAlliancePartners(),
    getCandidatures(),
    getAllianceStats(),
    getPaiementsEnAttente(),
  ])

  return (
    <AllianceAdminClient
      partners={serialize(partners)}
      candidatures={serialize(candidatures)}
      stats={serialize(stats)}
      paiements={serialize(paiements)}
    />
  )
}
