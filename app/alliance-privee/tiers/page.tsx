import { getAlliancePartner } from '@/actions/alliance-privee'
import AllianceTiersClient from '@/components/alliance-privee/AllianceTiersClient'
import { type GenderType } from '@/types/alliance-privee'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const VALID_GENDERS = new Set<string>(['HOMME', 'FEMME'])

interface Props {
  searchParams: { pid?: string; gender?: string }
}

export default async function AllianceTiersPage({ searchParams }: Props) {
  const { pid, gender } = searchParams

  if (!pid || !gender || !VALID_GENDERS.has(gender)) {
    return <AllianceError message="Lien invalide — paramètres manquants." />
  }

  const partner = await getAlliancePartner(pid)
  if (!partner) {
    return <AllianceError message="Partenaire introuvable." />
  }

  return (
    <AllianceTiersClient
      partenaireId={pid}
      gender={gender as GenderType}
      nomEtablissement={partner.nom_etablissement}
      revolutLinks={{
        PRESTIGE: partner.revolut_link_prestige ?? null,
        EXCELLENCE: partner.revolut_link_excellence ?? null,
        ELITE: partner.revolut_link_elite ?? null,
      }}
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
