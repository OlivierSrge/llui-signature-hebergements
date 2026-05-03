import { getAlliancePartner } from '@/actions/alliance-privee'
import AllianceCandidatureClient from '@/components/alliance-privee/AllianceCandidatureClient'
import { type AllianceCardTier } from '@/types/alliance-privee'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: { pid?: string; tier?: string }
}

const VALID_TIERS = new Set<string>(['PRESTIGE', 'EXCELLENCE', 'ELITE'])

export default async function AllianceCandidaturePage({ searchParams }: Props) {
  const { pid, tier } = searchParams

  if (!pid || !tier || !VALID_TIERS.has(tier)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-5">
        <div className="max-w-sm w-full text-center">
          <div className="text-white/30 text-4xl mb-4">✦</div>
          <h1 className="text-xl font-serif font-light text-white mb-3">Lien invalide</h1>
          <p className="text-white/40 text-sm mb-6">
            Veuillez scanner à nouveau le QR code de votre établissement.
          </p>
          <Link href="/" className="text-amber-500/70 text-sm hover:text-amber-400">
            Retour à l&apos;accueil
          </Link>
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
      nomEtablissement={partner.nom_etablissement}
    />
  )
}
