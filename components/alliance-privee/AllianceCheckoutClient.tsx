'use client'

import { useState } from 'react'
import { type AlliancePartner, type AllianceCardTier, TIER_CONFIGS } from '@/types/alliance-privee'

interface Props {
  partner: AlliancePartner
  tier: AllianceCardTier
  partenaireId: string
}

export default function AllianceCheckoutClient({ partner, tier, partenaireId }: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const config = TIER_CONFIGS[tier]

  const prixMap: Record<AllianceCardTier, number> = {
    PRESTIGE: partner.prix_prestige_fcfa,
    EXCELLENCE: partner.prix_excellence_fcfa,
    ELITE: partner.prix_elite_fcfa,
  }
  const revolutLinkMap: Record<AllianceCardTier, string | undefined> = {
    PRESTIGE: partner.revolut_link_prestige,
    EXCELLENCE: partner.revolut_link_excellence,
    ELITE: partner.revolut_link_elite,
  }

  const prix = prixMap[tier]
  const revolutLink = revolutLinkMap[tier]

  function handlePayer() {
    if (revolutLink) {
      window.location.href = revolutLink
    }
  }

  function handleContinuerSansPaiement() {
    setConfirmed(true)
    window.location.href = `/alliance-privee/candidature?pid=${partenaireId}&tier=${tier}`
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-5 py-12">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs tracking-widest uppercase mb-6">
            <span>✦</span>
            <span>Alliance Privée</span>
          </div>
          <h1 className="text-2xl font-serif font-light text-white mb-2">
            Activation de votre carte
          </h1>
          <p className="text-white/40 text-sm">Étape 1 sur 2 — Règlement</p>
        </div>

        {/* Récapitulatif carte */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-xl">{config.emoji}</span>
                <span className="font-semibold text-white text-lg">Carte {config.label}</span>
              </div>
              <p className="text-white/40 text-xs mt-1">{config.tagline}</p>
            </div>
            <div className="text-right">
              <div className="text-amber-400 font-bold text-xl">{config.prix_eur}€</div>
              <div className="text-white/40 text-xs">{prix.toLocaleString('fr-FR')} FCFA</div>
            </div>
          </div>
          <div className="space-y-1.5">
            {config.avantages.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                <span className="text-amber-500/60 text-[10px]">✦</span>
                {a}
              </div>
            ))}
          </div>
        </div>

        {/* Section paiement Revolut */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          <h2 className="text-white/80 font-medium text-sm mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
            Règlement sécurisé
          </h2>
          <p className="text-white/50 text-xs mb-4 leading-relaxed">
            Veuillez utiliser le lien de paiement ci-dessous. Votre carte sera activée dès confirmation du règlement.
          </p>

          {revolutLink ? (
            <button
              onClick={handlePayer}
              className="w-full py-3.5 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              Payer {config.prix_eur}€ — {prix.toLocaleString('fr-FR')} FCFA
            </button>
          ) : (
            <div className="text-center py-3 text-white/30 text-xs border border-dashed border-white/10 rounded-xl">
              Lien de paiement non configuré — contactez l&apos;établissement
            </div>
          )}
        </div>

        {/* Séparateur */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/20 text-xs">OU</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Option continuer et payer sur place */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          <h2 className="text-white/80 font-medium text-sm mb-2">Payer sur place</h2>
          <p className="text-white/40 text-xs mb-4 leading-relaxed">
            Remplissez votre candidature maintenant et réglez directement à l&apos;établissement.
          </p>
          <button
            onClick={handleContinuerSansPaiement}
            disabled={confirmed}
            className="w-full py-3 rounded-xl border border-white/20 text-white/60 text-sm hover:border-white/40 hover:text-white/80 transition-colors disabled:opacity-40"
          >
            Continuer et payer sur place →
          </button>
        </div>

        <p className="text-center text-white/20 text-xs">
          Toutes les informations sont traitées avec la plus stricte confidentialité.
        </p>
      </div>
    </div>
  )
}
