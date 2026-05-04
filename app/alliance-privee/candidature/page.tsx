import { getAlliancePartner } from '@/actions/alliance-privee'
import AllianceCandidatureClient from '@/components/alliance-privee/AllianceCandidatureClient'
import { type AllianceCardTier, type GenderType, type LocationType } from '@/types/alliance-privee'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const VALID_TIERS = new Set<string>(['PRESTIGE', 'EXCELLENCE', 'ELITE'])
const VALID_GENDERS = new Set<string>(['HOMME', 'FEMME'])
const VALID_LOCATIONS = new Set<string>(['DIASPORA', 'LOCAL'])

interface Props {
  searchParams: { payment_id?: string; pid?: string; tier?: string; gender?: string; location?: string }
}

export default async function AllianceCandidaturePage({ searchParams }: Props) {
  const { payment_id, pid, tier, gender, location } = searchParams

  if (!payment_id || !pid || !tier || !gender || !location
      || !VALID_TIERS.has(tier) || !VALID_GENDERS.has(gender) || !VALID_LOCATIONS.has(location)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-5">
        <div className="max-w-sm w-full text-center">
          <div className="text-white/30 text-4xl mb-4">✦</div>
          <h1 className="text-xl font-serif font-light text-white mb-3">Lien invalide</h1>
          <p className="text-white/40 text-sm mb-6">Veuillez recommencer depuis le QR code.</p>
          <Link href="/" className="text-amber-500/70 text-sm hover:text-amber-400">Retour à l&apos;accueil</Link>
        </div>
      </div>
    )
  }

  const partner = await getAlliancePartner(pid)
  if (!partner) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-5">
        <div className="max-w-sm w-full text-center">
          <div className="text-white/30 text-4xl mb-4">✦</div>
          <h1 className="text-xl font-serif font-light text-white mb-3">Partenaire introuvable</h1>
          <p className="text-white/40 text-sm">Ce partenaire n&apos;est pas actif sur Alliance Privée.</p>
        </div>
      </div>
    )
  }

  return (
    <AllianceCandidatureClient
      partenaireId={pid}
      tier={tier as AllianceCardTier}
      gender={gender as GenderType}
      location={location as LocationType}
      paymentId={payment_id}
      nomEtablissement={partner.nom_etablissement}
    />
  )
}
