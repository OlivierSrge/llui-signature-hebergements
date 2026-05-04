import { getAlliancePartner } from '@/actions/alliance-privee'
import AlliancePaiementClient from '@/components/alliance-privee/AlliancePaiementClient'
import { type AllianceCardTier, type GenderType, type LocationType, getPrixPourProfil } from '@/types/alliance-privee'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const VALID_TIERS = new Set<string>(['PRESTIGE', 'EXCELLENCE', 'ELITE'])
const VALID_GENDERS = new Set<string>(['HOMME', 'FEMME'])
const VALID_LOCATIONS = new Set<string>(['DIASPORA', 'LOCAL'])

interface Props {
  searchParams: { pid?: string; tier?: string; gender?: string; location?: string }
}

export default async function AlliancePaiementPage({ searchParams }: Props) {
  const { pid, tier, gender, location } = searchParams

  if (!pid || !tier || !gender || !location
      || !VALID_TIERS.has(tier) || !VALID_GENDERS.has(gender) || !VALID_LOCATIONS.has(location)) {
    return <AllianceError message="Lien invalide — paramètres manquants." />
  }

  const partner = await getAlliancePartner(pid)
  if (!partner) {
    return <AllianceError message="Partenaire introuvable." />
  }

  const prix = getPrixPourProfil(tier as AllianceCardTier, gender as GenderType, location as LocationType)
  const revolutLink =
    gender === 'HOMME' && location === 'DIASPORA'
      ? (partner[`revolut_link_${tier.toLowerCase()}` as keyof typeof partner] as string | undefined
          ?? 'https://revolut.me/olivieqf4i')
      : null

  return (
    <AlliancePaiementClient
      partenaireId={pid}
      tier={tier as AllianceCardTier}
      gender={gender as GenderType}
      location={location as LocationType}
      prix={prix}
      revolutLink={revolutLink}
      nomEtablissement={partner.nom_etablissement}
    />
  )
}

function AllianceError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-5">
      <div className="max-w-sm w-full text-center">
        <div className="text-white/30 text-4xl mb-4">✦</div>
        <h1 className="text-xl font-serif font-light text-white mb-3">Alliance Privée</h1>
        <p className="text-white/40 text-sm mb-6">{message}</p>
        <Link href="/" className="text-amber-500/70 text-sm hover:text-amber-400">Retour à l&apos;accueil</Link>
      </div>
    </div>
  )
}
