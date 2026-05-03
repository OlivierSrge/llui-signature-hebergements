import { getAlliancePartner } from '@/actions/alliance-privee'
import AllianceActivateClient from '@/components/alliance-privee/AllianceActivateClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: { pid?: string }
}

export default async function AllianceActivatePage({ searchParams }: Props) {
  const { pid } = searchParams

  if (!pid) {
    return <AllianceError message="Lien invalide — aucun partenaire identifié." />
  }

  const partner = await getAlliancePartner(pid)

  if (!partner) {
    return (
      <AllianceError message="Ce partenaire n'a pas activé le module Alliance Privée ou le lien est expiré." />
    )
  }

  return <AllianceActivateClient partner={partner} partenaireId={pid} />
}

function AllianceError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-5">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center mx-auto mb-6">
          <span className="text-white/30 text-2xl">✦</span>
        </div>
        <h1 className="text-xl font-serif font-light text-white mb-3">Alliance Privée</h1>
        <p className="text-white/40 text-sm mb-8">{message}</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl border border-white/10 text-white/50 text-sm hover:border-white/20 hover:text-white/70 transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
