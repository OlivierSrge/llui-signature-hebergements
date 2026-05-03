import { getAlliancePartner } from '@/actions/alliance-privee'
import AllianceCheckoutClient from '@/components/alliance-privee/AllianceCheckoutClient'
import { type AllianceCardTier, TIER_CONFIGS } from '@/types/alliance-privee'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: { pid?: string; tier?: string }
}

const VALID_TIERS = new Set<string>(['PRESTIGE', 'EXCELLENCE', 'ELITE'])

export default async function AllianceCheckoutPage({ searchParams }: Props) {
  const { pid, tier } = searchParams

  if (!pid || !tier || !VALID_TIERS.has(tier)) {
    return <InvalidLink />
  }

  const partner = await getAlliancePartner(pid)
  if (!partner) {
    return <InvalidLink />
  }

  return (
    <AllianceCheckoutClient
      partner={partner}
      tier={tier as AllianceCardTier}
      partenaireId={pid}
    />
  )
}

function InvalidLink() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-5">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center mx-auto mb-6">
          <span className="text-white/30 text-2xl">✦</span>
        </div>
        <h1 className="text-xl font-serif font-light text-white mb-3">Lien invalide</h1>
        <p className="text-white/40 text-sm mb-8">
          Ce lien de paiement n&apos;est pas valide. Veuillez scanner à nouveau le QR code.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl border border-white/10 text-white/50 text-sm hover:border-white/20 transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
