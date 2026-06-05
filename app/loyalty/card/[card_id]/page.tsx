import { db } from '@/lib/firebase'
import { serialize } from '@/lib/serialize'
import LoyaltyCardPageClient from '@/components/loyalty/LoyaltyCardPageClient'
import type { LoyaltyCard, LoyaltyProgram } from '@/types/loyalty'

export const dynamic = 'force-dynamic'

export default async function LoyaltyCardPage({
  params,
}: {
  params: { card_id: string }
}) {
  const cardDoc = await db.collection('loyalty_cards').doc(params.card_id).get()

  if (!cardDoc.exists) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🎫</div>
          <h1 className="text-2xl font-serif text-[#C9A84C] mb-2">Carte introuvable</h1>
          <p className="text-[#F5F0E8]/60 text-sm">
            Cette carte de fidélité n&apos;existe pas ou a expiré.
          </p>
        </div>
      </div>
    )
  }

  const cardData = cardDoc.data()!
  const programDoc = await db.collection('loyalty_programs').doc(cardData.program_id).get()

  if (!programDoc.exists) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-[#C9A84C] mb-2">Programme introuvable</h1>
        </div>
      </div>
    )
  }

  const card = serialize({ card_id: params.card_id, ...cardData }) as LoyaltyCard
  const program = serialize({ program_id: programDoc.id, ...programDoc.data() }) as LoyaltyProgram

  return <LoyaltyCardPageClient card={card} program={program} />
}
