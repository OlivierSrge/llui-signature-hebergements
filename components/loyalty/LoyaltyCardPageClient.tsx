'use client'

import { useState } from 'react'
import type { LoyaltyCard, LoyaltyProgram } from '@/types/loyalty'
import LoyaltyCardDisplay from './LoyaltyCardDisplay'
import CreateAccountPrompt from './CreateAccountPrompt'
import Link from 'next/link'

interface Props {
  card: LoyaltyCard
  program: LoyaltyProgram
}

export default function LoyaltyCardPageClient({ card, program }: Props) {
  const [showCreateAccount, setShowCreateAccount] = useState(false)

  const isExpired =
    card.statut === 'EXPIRED' ||
    card.statut === 'CANCELLED'

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-8">
      <div className="max-w-sm mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-medium text-[#C9A84C] uppercase tracking-widest mb-1">
            L&Lui Signature ✨
          </p>
          <h1 className="text-2xl font-serif text-[#F5F0E8]">Votre carte de fidélité</h1>
          <p className="text-[#F5F0E8]/50 text-sm mt-1">{program.nom}</p>
        </div>

        {/* Badge statut si expiré/annulé */}
        {isExpired && (
          <div className="bg-red-900/30 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
            Cette carte est {card.statut === 'CANCELLED' ? 'annulée' : 'expirée'}.
          </div>
        )}

        {/* Carte */}
        <LoyaltyCardDisplay card={card} program={program} />

        {/* Actions rapides */}
        <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-xl p-4 space-y-2">
          <h3 className="text-[#F5F0E8]/60 text-xs uppercase tracking-wider font-medium mb-3">
            Que faire avec ma carte ?
          </h3>
          <p className="text-[#F5F0E8]/60 text-sm">
            • Présentez cette page à chaque visite chez <strong className="text-[#F5F0E8]">{program.partenaire_id}</strong>
          </p>
          <p className="text-[#F5F0E8]/60 text-sm">
            • Des points sont ajoutés à chaque achat
          </p>
          <p className="text-[#F5F0E8]/60 text-sm">
            • Progressez vers les niveaux supérieurs pour plus d&apos;avantages
          </p>
        </div>

        {/* Bouton optionnel créer compte */}
        {!showCreateAccount ? (
          <button
            onClick={() => setShowCreateAccount(true)}
            className="w-full bg-[#C9A84C]/10 hover:bg-[#C9A84C]/20 border border-[#C9A84C]/40 text-[#C9A84C] font-semibold py-3 rounded-xl text-sm transition"
          >
            Suivre toutes mes cartes →
          </button>
        ) : (
          <CreateAccountPrompt onClose={() => setShowCreateAccount(false)} />
        )}

        {/* Footer */}
        <div className="text-center text-[#F5F0E8]/30 text-xs space-y-1 pb-4">
          <p>Carte personnelle · {card.client_email}</p>
          <p>Conservez ce lien pour accéder à votre carte.</p>
          <Link href="/hebergements" className="text-[#C9A84C]/60 hover:text-[#C9A84C] underline">
            Découvrir nos hébergements
          </Link>
        </div>
      </div>
    </div>
  )
}
