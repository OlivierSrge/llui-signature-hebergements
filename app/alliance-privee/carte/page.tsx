import { getMemberCardDetails } from '@/actions/alliance-privee'
import MemberCardDisplay from '@/components/alliance-privee/MemberCardDisplay'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: { card_id?: string }
}

export default async function AllianceCartePage({ searchParams }: Props) {
  const { card_id } = searchParams

  if (!card_id) {
    return <CarteError message="Lien invalide — identifiant de carte manquant." />
  }

  const card = await getMemberCardDetails(card_id)

  if (!card) {
    return <CarteError message="Carte introuvable ou accès non autorisé." />
  }

  if (card.status === 'suspended') {
    return <CarteError message="Cette carte est suspendue. Contactez l'établissement." />
  }

  return <MemberCardDisplay card={card} cardId={card_id} />
}

function CarteError({ message }: { message: string }) {
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
