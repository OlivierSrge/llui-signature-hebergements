'use client'

import { useState } from 'react'
import { confirmLoyaltyCard, rejectLoyaltyCard } from '@/actions/loyalty'

interface CardData {
  card_id: string
  programme_nom: string
  program_id: string
  client_nom: string
  client_prenom: string
  client_email: string
  client_phone: string
  montant_achat: number
  statut: string
  confirmation_token: string
  created_at: string
  confirmation_token_expires_at: string
}

type CardState = 'idle' | 'working' | 'confirmed' | 'rejected' | 'error'

interface Props {
  targetCard: CardData | null
  targetToken: string | undefined
  pendingCards: CardData[]
}

export default function LoyaltyConfirmationsClient({ targetCard, targetToken, pendingCards }: Props) {
  const [states, setStates] = useState<Record<string, CardState>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const setState = (id: string, state: CardState) =>
    setStates((s) => ({ ...s, [id]: state }))

  const setError = (id: string, msg: string) =>
    setErrors((e) => ({ ...e, [id]: msg }))

  const handleConfirm = async (card: CardData, token: string) => {
    if (!confirm(`Confirmer la carte de ${card.client_prenom} ${card.client_nom} — ${card.montant_achat.toLocaleString('fr-FR')} FCFA ?`)) return
    setState(card.card_id, 'working')
    const result = await confirmLoyaltyCard(card.card_id, token)
    if (result.success) {
      setState(card.card_id, 'confirmed')
    } else {
      setState(card.card_id, 'error')
      setError(card.card_id, result.error ?? 'Erreur inconnue')
    }
  }

  const handleReject = async (card: CardData, token: string) => {
    if (!confirm(`Rejeter la carte de ${card.client_prenom} ${card.client_nom} ?`)) return
    setState(card.card_id, 'working')
    const result = await rejectLoyaltyCard(card.card_id, token)
    if (result.success) {
      setState(card.card_id, 'rejected')
    } else {
      setState(card.card_id, 'error')
      setError(card.card_id, result.error ?? 'Erreur inconnue')
    }
  }

  const tokenForCard = (card: CardData) =>
    card.card_id === targetCard?.card_id && targetToken ? targetToken : card.confirmation_token

  const isExpired = (isoDate: string) => new Date(isoDate) < new Date()

  function CardRow({ card }: { card: CardData }) {
    const state = states[card.card_id] ?? 'idle'
    const token = tokenForCard(card)
    const expired = isExpired(card.confirmation_token_expires_at)
    const isTarget = card.card_id === targetCard?.card_id

    return (
      <div
        className={`border rounded-2xl p-5 ${
          isTarget
            ? 'border-[#C9A84C] bg-[#FFFBF0]'
            : 'border-gray-200 bg-white'
        }`}
      >
        {isTarget && (
          <div className="text-xs font-semibold text-[#C9A84C] mb-3 uppercase tracking-wider">
            ← Demande reçue par email
          </div>
        )}

        {/* Détails client */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-4 text-sm">
          <div>
            <span className="text-gray-400 text-xs">Programme</span>
            <p className="font-semibold text-gray-900">{card.programme_nom}</p>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Montant</span>
            <p className="font-bold text-[#C9A84C] text-lg">
              {card.montant_achat.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Client</span>
            <p className="font-semibold text-gray-900">{card.client_prenom} {card.client_nom}</p>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Téléphone</span>
            <p className="font-medium text-gray-800">{card.client_phone}</p>
          </div>
          <div className="col-span-2">
            <span className="text-gray-400 text-xs">Email</span>
            <p className="font-medium text-gray-800">{card.client_email}</p>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Demande le</span>
            <p className="text-gray-700">
              {new Date(card.created_at).toLocaleString('fr-FR')}
            </p>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Lien expire le</span>
            <p className={`${expired ? 'text-red-500 font-semibold' : 'text-gray-700'}`}>
              {new Date(card.confirmation_token_expires_at).toLocaleString('fr-FR')}
              {expired && ' ⚠️'}
            </p>
          </div>
        </div>

        {/* État de l'action */}
        {state === 'confirmed' && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-800 font-semibold text-sm">
            ✅ Carte activée — email bienvenue envoyé au client
          </div>
        )}

        {state === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800 font-semibold text-sm">
            ❌ Demande rejetée
          </div>
        )}

        {state === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
            Erreur : {errors[card.card_id]}
          </div>
        )}

        {state === 'working' && (
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-gray-500 text-sm animate-pulse">
            Traitement en cours…
          </div>
        )}

        {state === 'idle' && (
          <>
            {expired && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 text-yellow-800 text-xs mb-3">
                ⚠️ Le lien d&apos;expiration est dépassé — vous pouvez quand même confirmer manuellement depuis cette page.
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => handleConfirm(card, token)}
                disabled={!token}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition text-sm"
              >
                ✅ Confirmer le paiement
              </button>
              <button
                onClick={() => handleReject(card, token)}
                disabled={!token}
                className="flex-1 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 font-semibold py-2.5 rounded-xl transition text-sm"
              >
                ❌ Rejeter
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            🎫 Validation cartes fidélité
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {pendingCards.length === 0
              ? 'Aucune demande en attente'
              : `${pendingCards.length} demande${pendingCards.length > 1 ? 's' : ''} en attente`}
          </p>
        </div>

        {/* Carte ciblée par email (en premier, si différente de la liste ou en surbrillance) */}
        {targetCard && targetToken && !pendingCards.find((c) => c.card_id === targetCard.card_id) && (
          <div>
            <h2 className="text-sm font-semibold text-[#C9A84C] uppercase tracking-wider mb-3">
              Demande reçue par email
            </h2>
            <CardRow card={targetCard} />
          </div>
        )}

        {/* Liste des cartes PENDING */}
        {pendingCards.length > 0 && (
          <div>
            {pendingCards.length > 1 && (
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Toutes les demandes en attente
              </h2>
            )}
            <div className="space-y-4">
              {pendingCards.map((card) => (
                <CardRow key={card.card_id} card={card} />
              ))}
            </div>
          </div>
        )}

        {/* Aucune demande */}
        {pendingCards.length === 0 && !targetCard && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">🎉</div>
            <p className="font-semibold">Aucune demande en attente</p>
            <p className="text-sm mt-1">Toutes les cartes ont été traitées.</p>
          </div>
        )}

        {/* Lien retour admin */}
        <div className="text-center pt-4">
          <a
            href="/admin/dashboard"
            className="text-sm text-gray-400 hover:text-gray-600 transition"
          >
            ← Retour au dashboard admin
          </a>
        </div>
      </div>
    </div>
  )
}
