'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type AlliancePartner, type AllianceCardTier, TIER_CONFIGS } from '@/types/alliance-privee'

interface Props {
  partner: AlliancePartner
  partenaireId: string
}

export default function AllianceActivateClient({ partner, partenaireId }: Props) {
  const router = useRouter()
  const [selectedTier, setSelectedTier] = useState<AllianceCardTier | null>(null)

  const tiers: AllianceCardTier[] = ['PRESTIGE', 'EXCELLENCE', 'ELITE']

  const prixParTier: Record<AllianceCardTier, number> = {
    PRESTIGE: partner.prix_prestige_fcfa,
    EXCELLENCE: partner.prix_excellence_fcfa,
    ELITE: partner.prix_elite_fcfa,
  }

  function handleContinue() {
    if (!selectedTier) return
    router.push(`/alliance-privee/checkout?pid=${partenaireId}&tier=${selectedTier}`)
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Fond décoratif */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 py-12">
        {/* En-tête */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs tracking-widest uppercase mb-6">
            <span>✦</span>
            <span>Alliance Privée</span>
            <span>✦</span>
          </div>
          <h1 className="text-3xl font-serif font-light text-white mb-3">
            Cercle Sélectif
          </h1>
          <p className="text-white/50 text-sm leading-relaxed">
            {partner.description_club || `Un espace confidentiel réservé aux membres de ${partner.nom_etablissement}.`}
          </p>
        </div>

        {/* Séparateur */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px bg-amber-500/20" />
          <span className="text-amber-500/50 text-xs tracking-widest">CHOISISSEZ VOTRE CARTE</span>
          <div className="flex-1 h-px bg-amber-500/20" />
        </div>

        {/* Cartes de tier */}
        <div className="space-y-3 mb-8">
          {tiers.map((tier) => {
            const config = TIER_CONFIGS[tier]
            const prix = prixParTier[tier]
            const isSelected = selectedTier === tier

            return (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`w-full text-left rounded-2xl border p-5 transition-all duration-200 ${
                  isSelected
                    ? 'border-amber-400/60 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-amber-400 text-lg">{config.emoji}</span>
                      <span className="font-semibold text-white">{config.label}</span>
                      {isSelected && (
                        <span className="ml-auto text-amber-400">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="text-white/40 text-xs mb-3">{config.tagline}</p>
                    <ul className="space-y-1">
                      {config.avantages.slice(0, 3).map((a, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-white/60">
                          <span className="text-amber-500/60 text-[10px]">✦</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-amber-400 font-semibold text-lg">
                      {config.prix_eur}€
                    </div>
                    <div className="text-white/40 text-xs">
                      {prix.toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* CTA */}
        <button
          onClick={handleContinue}
          disabled={!selectedTier}
          className={`w-full py-4 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 ${
            selectedTier
              ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/25'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          {selectedTier ? `Continuer avec la carte ${TIER_CONFIGS[selectedTier].label}` : 'Sélectionnez une carte'}
        </button>

        {/* Footer */}
        <p className="text-center text-white/20 text-xs mt-6">
          Votre candidature sera examinée sous 48h. Discrétion absolue garantie.
        </p>
      </div>
    </div>
  )
}
