'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const BuyCardForm = dynamic(() => import('./BuyCardForm'), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────

interface Niveau {
  id: string
  nom: string
  emoji: string
  couleur: string
  seuil_points: number
  prix_fcfa?: number
  duree_validite_mois?: number
  avantages: string[]
}

interface MarketplaceProg {
  program_id: string
  partenaire_id: string
  partenaire_name: string
  etablissement_type: string
  partenaire_adresse?: string
  partenaire_photo?: string | null
  nom: string
  description?: string
  prix_fcfa: number
  duree_validite_mois: number
  niveaux: Niveau[]
  taux_fcfa_par_point?: number
  commission_lui_percent: number
  commission_partner_percent: number
  statut: string
}

// ── Filtres par type ──────────────────────────────────────────────────────────

const TYPE_TABS = [
  { type: 'all',        label: 'Tous',        icon: '🌟' },
  { type: 'hotel',      label: 'Hôtels',      icon: '🏨' },
  { type: 'restaurant', label: 'Restaurants', icon: '🍽️' },
  { type: 'bar',        label: 'Bars',        icon: '🍸' },
  { type: 'plage',      label: 'Plages',      icon: '🏖️' },
  { type: 'agence',     label: 'Agences',     icon: '✈️' },
  { type: 'autre',      label: 'Autres',      icon: '🏢' },
]

// ── Carte niveau (aperçu compact) ────────────────────────────────────────────

function NiveauChip({ niveau, prixGlobal }: { niveau: Niveau; prixGlobal: number }) {
  const prix = niveau.prix_fcfa ?? prixGlobal
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border text-left"
      style={{
        borderColor: niveau.couleur + '66',
        backgroundColor: niveau.couleur + '18',
      }}
    >
      <span className="text-base">{niveau.emoji}</span>
      <div>
        <p className="text-[11px] font-bold text-[#1A1A1A]">{niveau.nom}</p>
        <p className="text-[10px] text-[#1A1A1A]/60">{prix.toLocaleString('fr-FR')} FCFA</p>
      </div>
    </div>
  )
}

// ── Carte partenaire ──────────────────────────────────────────────────────────

function PartnerCard({ prog, onBuy }: { prog: MarketplaceProg; onBuy: () => void }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] space-y-3">
      {/* Entête */}
      <div className="flex items-center gap-3">
        {prog.partenaire_photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prog.partenaire_photo}
            alt={prog.partenaire_name}
            className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-[#F5F0E8]"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-[#F5F0E8] flex items-center justify-center flex-shrink-0 text-xl">
            {TYPE_TABS.find((t) => t.type === prog.etablissement_type)?.icon ?? '🏢'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1A1A1A] truncate">{prog.partenaire_name}</p>
          {prog.partenaire_adresse && (
            <p className="text-[11px] text-[#1A1A1A]/50 truncate">{prog.partenaire_adresse}</p>
          )}
          <p className="text-[10px] text-[#1A1A1A]/40 mt-0.5">{prog.nom}</p>
        </div>
      </div>

      {/* Niveaux */}
      <div className="grid grid-cols-3 gap-2">
        {prog.niveaux.slice(0, 3).map((n) => (
          <NiveauChip key={n.id} niveau={n} prixGlobal={prog.prix_fcfa} />
        ))}
        {prog.niveaux.length > 3 && (
          <div className="flex items-center justify-center text-[11px] text-[#1A1A1A]/40">
            +{prog.niveaux.length - 3}
          </div>
        )}
      </div>

      {/* Avantages aperçu */}
      {prog.niveaux[0]?.avantages?.length > 0 && (
        <p className="text-[11px] text-[#1A1A1A]/50 leading-tight">
          ✓ {prog.niveaux[0].avantages.slice(0, 2).join(' · ')}
          {prog.niveaux[0].avantages.length > 2 ? ' …' : ''}
        </p>
      )}

      {/* CTA */}
      <button
        onClick={onBuy}
        className="w-full py-2 bg-[#C9A84C] text-[#1A1A1A] text-xs font-bold rounded-xl hover:bg-[#b8963e] transition-colors"
      >
        🎫 Acheter une carte fidélité
      </button>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

interface Props {
  excludePartenaireId?: string
}

export default function LoyaltyMarketplace({ excludePartenaireId }: Props) {
  const [programs, setPrograms] = useState<MarketplaceProg[]>([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('all')
  const [buyingProg, setBuyingProg] = useState<MarketplaceProg | null>(null)

  useEffect(() => {
    const url = excludePartenaireId
      ? `/api/loyalty/marketplace?exclude=${encodeURIComponent(excludePartenaireId)}`
      : '/api/loyalty/marketplace'
    fetch(url)
      .then((r) => r.json())
      .then((d: { programs: MarketplaceProg[] }) => setPrograms(d.programs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [excludePartenaireId])

  // Types effectivement présents dans les données
  const presentTypes = new Set(programs.map((p) => p.etablissement_type))
  const visibleTabs = TYPE_TABS.filter((t) => t.type === 'all' || presentTypes.has(t.type))

  const filtered =
    activeType === 'all'
      ? programs
      : programs.filter((p) => p.etablissement_type === activeType)

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (programs.length === 0) return null

  // Formulaire d'achat ouvert
  if (buyingProg) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-[#1A1A1A]">{buyingProg.partenaire_name}</p>
            <p className="text-xs text-[#1A1A1A]/50">{buyingProg.nom}</p>
          </div>
          <button
            onClick={() => setBuyingProg(null)}
            className="text-xs text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition-colors"
          >
            ← Retour
          </button>
        </div>
        <BuyCardForm
          program={buyingProg}
          partenaireId={buyingProg.partenaire_id}
          onCancel={() => setBuyingProg(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtres type d'établissement */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {visibleTabs.map((tab) => (
          <button
            key={tab.type}
            onClick={() => setActiveType(tab.type)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
              activeType === tab.type
                ? 'bg-[#C9A84C] text-[#1A1A1A]'
                : 'bg-[#F5F0E8] text-[#1A1A1A]/60 hover:bg-[#C9A84C]/20'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Compteur */}
      <p className="text-[11px] text-[#1A1A1A]/40">
        {filtered.length} établissement{filtered.length !== 1 ? 's' : ''} partenaire{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Grille partenaires */}
      {filtered.length === 0 ? (
        <p className="text-xs text-[#1A1A1A]/40 text-center py-4">
          Aucun partenaire de ce type pour l&apos;instant.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((prog) => (
            <PartnerCard
              key={prog.program_id}
              prog={prog}
              onBuy={() => setBuyingProg(prog)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
