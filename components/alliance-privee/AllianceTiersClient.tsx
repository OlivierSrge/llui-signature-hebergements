'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  type AllianceCardTier,
  type GenderType,
  type LocationType,
  TIER_CONFIGS,
  TIER_PRICING,
  getPrixPourProfil,
} from '@/types/alliance-privee'

interface Props {
  partenaireId: string
  gender: GenderType
  nomEtablissement: string
  revolutLinks: Record<AllianceCardTier, string | null>
}

const TIERS: AllianceCardTier[] = ['PRESTIGE', 'EXCELLENCE', 'ELITE']

export default function AllianceTiersClient({ partenaireId, gender, nomEtablissement, revolutLinks }: Props) {
  const router = useRouter()
  const [selectedTier, setSelectedTier] = useState<AllianceCardTier | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<LocationType | null>(
    gender === 'FEMME' ? 'LOCAL' : null
  )

  const isFemme = gender === 'FEMME'

  function handleContinuer() {
    if (!selectedTier || !selectedLocation) return
    router.push(
      `/alliance-privee/paiement?pid=${partenaireId}&tier=${selectedTier}&gender=${gender}&location=${selectedLocation}`
    )
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs tracking-widest uppercase mb-5">
            <span>✦</span>
            <span>Alliance Privée</span>
            <span>✦</span>
          </div>
          <h1 className="text-2xl font-serif font-light text-white mb-2">
            {isFemme ? 'Votre accès au cercle' : 'Choisissez votre niveau'}
          </h1>
          {isFemme && (
            <p className="text-white/40 text-xs leading-relaxed max-w-xs mx-auto">
              Alliance Privée est actuellement réservée aux femmes résidant au Cameroun.
            </p>
          )}
        </div>

        {/* Sélection localisation — hommes seulement */}
        {!isFemme && (
          <div className="mb-6">
            <p className="text-white/50 text-xs mb-3 text-center tracking-wide uppercase">Vous résidez :</p>
            <div className="grid grid-cols-2 gap-3">
              {(['DIASPORA', 'LOCAL'] as LocationType[]).map((loc) => (
                <button
                  key={loc}
                  onClick={() => setSelectedLocation(loc)}
                  className={`py-3 rounded-xl border text-sm font-medium transition-colors ${
                    selectedLocation === loc
                      ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                      : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70'
                  }`}
                >
                  {loc === 'DIASPORA' ? '✈️  En diaspora' : '🌍  Au Cameroun'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Séparateur */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-amber-500/20" />
          <span className="text-amber-500/50 text-xs tracking-widest">VOTRE CARTE</span>
          <div className="flex-1 h-px bg-amber-500/20" />
        </div>

        {/* Cartes de tier */}
        <div className="space-y-3 mb-8">
          {TIERS.map((tier) => {
            const config = TIER_CONFIGS[tier]
            const location = isFemme ? 'LOCAL' : (selectedLocation ?? 'LOCAL')
            const { montant, devise } = getPrixPourProfil(tier, gender, location)
            const pricing = TIER_PRICING[tier]
            const isSelected = selectedTier === tier

            return (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`w-full text-left rounded-2xl border p-5 transition-all duration-200 ${
                  isSelected
                    ? 'border-amber-400/60 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
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
                    <p className="text-white/30 text-xs mb-2">{config.tagline}</p>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <span>✦ {config.avantages[0]}</span>
                    </div>
                    <p className="text-white/20 text-[10px] mt-1">
                      Validité {pricing.validite_mois} mois
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-amber-400 font-bold text-lg">
                      {montant.toLocaleString('fr-FR')} {devise}
                    </div>
                    {!isFemme && selectedLocation === 'DIASPORA' && (
                      <div className="text-white/30 text-[10px]">
                        {pricing.homme_local_fcfa.toLocaleString('fr-FR')} FCFA local
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* CTA */}
        <button
          onClick={handleContinuer}
          disabled={!selectedTier || (!isFemme && !selectedLocation)}
          className={`w-full py-4 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 ${
            selectedTier && (isFemme || selectedLocation)
              ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          Continuer vers le paiement →
        </button>

        <p className="text-center text-white/20 text-xs mt-6">
          {nomEtablissement} · Alliance Privée L&Lui
        </p>
      </div>
    </div>
  )
}
