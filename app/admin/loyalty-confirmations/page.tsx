// app/admin/loyalty-confirmations/page.tsx
// Page admin sécurisée (middleware cookie admin) — validation cartes de fidélité PENDING

import { db } from '@/lib/firebase'
import LoyaltyConfirmationsClient from '@/components/loyalty/LoyaltyConfirmationsClient'

export const dynamic = 'force-dynamic'

function serializeCard(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    card_id: id,
    programme_nom: data.programme_nom ?? data.program_id ?? '—',
    program_id: data.program_id ?? '',
    client_nom: data.client_nom ?? '',
    client_prenom: data.client_prenom ?? '',
    client_email: data.client_email ?? '',
    client_phone: data.client_phone ?? '',
    montant_achat: data.montant_achat ?? 0,
    statut: data.statut ?? 'PENDING',
    confirmation_token: data.confirmation_token ?? '',
    created_at: (data.created_at?.toDate?.() ?? new Date()).toISOString(),
    confirmation_token_expires_at:
      (data.confirmation_token_expires_at?.toDate?.() ?? new Date()).toISOString(),
  }
}

export default async function LoyaltyConfirmationsPage({
  searchParams,
}: {
  searchParams: { card_id?: string; token?: string }
}) {
  const { card_id, token } = searchParams

  // Carte ciblée par le lien email (card_id + token dans URL)
  let targetCard: ReturnType<typeof serializeCard> | null = null
  if (card_id) {
    const doc = await db.collection('loyalty_cards').doc(card_id).get()
    if (doc.exists) {
      targetCard = serializeCard(doc.id, doc.data()!)
    }
  }

  // Toutes les cartes PENDING
  const snap = await db
    .collection('loyalty_cards')
    .where('statut', '==', 'PENDING')
    .get()

  const pendingCards = snap.docs
    .map((d) => serializeCard(d.id, d.data()))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <LoyaltyConfirmationsClient
      targetCard={targetCard}
      targetToken={token}
      pendingCards={pendingCards}
    />
  )
}
