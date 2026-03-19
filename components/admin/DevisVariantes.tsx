'use client'

import { PACKS, CATALOGUE, calculerTotaux, formatFCFA } from '@/lib/devisDefaults'
import type { DevisFormData, PackKey } from '@/lib/devisDefaults'

interface Props {
  form: DevisFormData
  totaux: ReturnType<typeof calculerTotaux>
  onSelectVariante: (variantesIncluses: ('confort' | 'equilibre' | 'prestige')[]) => void
}

const PACK_ORDER: PackKey[] = ['PERLE', 'SAPHIR', 'EMERAUDE', 'DIAMANT']

function getPrestigePack(currentPack: PackKey): PackKey {
  const idx = PACK_ORDER.indexOf(currentPack)
  return idx < PACK_ORDER.length - 1 ? PACK_ORDER[idx + 1] : currentPack
}

export default function DevisVariantes({ form, totaux, onSelectVariante }: Props) {
  const currentPack = form.pack ? PACKS[form.pack] : null
  if (!currentPack || !form.pack) return null

  const prestigePackKey = getPrestigePack(form.pack)
  const prestigePack = PACKS[prestigePackKey]

  // Variante CONFORT — -15% sur total TTC
  const confortTotal = Math.round(totaux.totalTTC * 0.85)
  const confortHonoraires = Math.round(totaux.sousTotalPrestations * 0.85 * 0.10)
  const confortSousTotalP = Math.round(totaux.sousTotalPrestations * 0.85)

  // Variante PRESTIGE — pack supérieur + 2 options premium
  const optionsPremium = CATALOGUE.optionsALaCarte.filter((o) =>
    ['Feux d\'artifice', 'Orchestre live'].includes(o.nom)
  )
  const optionsPremiumTotal = optionsPremium.reduce((s, o) => s + o.prix, 0)
  const prestigeSousTotalP = prestigePack.prixBase + (form.prixLieuCeremonie || 0) + (form.prixLieuReception || 0) + totaux.totalOptions + optionsPremiumTotal
  const prestigeHonoraires = Math.round(prestigeSousTotalP * 0.10)
  const prestigeTotal = prestigeSousTotalP + prestigeHonoraires

  const variantes = [
    {
      key: 'confort' as const,
      label: 'Confort',
      emoji: '🤍',
      tagline: 'Proposition accessible',
      description: 'Toutes les prestations du pack, optimisées pour s\'adapter à votre budget. Même qualité, effort de négociation intégré.',
      packNom: currentPack.nom,
      packEmoji: currentPack.emoji,
      total: confortTotal,
      honoraires: confortHonoraires,
      sousTotalP: confortSousTotalP,
      highlight: false,
      badge: '-15%',
      badgeColor: 'bg-blue-100 text-blue-700',
      services: currentPack.services,
    },
    {
      key: 'equilibre' as const,
      label: 'Équilibre',
      emoji: '⚖️',
      tagline: 'Notre proposition principale',
      description: 'La proposition que nous recommandons : un parfait équilibre entre prestations de qualité et maîtrise du budget.',
      packNom: currentPack.nom,
      packEmoji: currentPack.emoji,
      total: totaux.totalTTC,
      honoraires: totaux.honoraires,
      sousTotalP: totaux.sousTotalPrestations,
      highlight: true,
      badge: 'Recommandé',
      badgeColor: 'bg-gold-100 text-gold-700',
      services: currentPack.services,
    },
    {
      key: 'prestige' as const,
      label: 'Prestige',
      emoji: '✨',
      tagline: 'L\'expérience ultime',
      description: `Passez au Pack ${prestigePack.nom} avec Feux d'artifice et Orchestre live inclus. Pour ceux qui veulent l'extraordinaire.`,
      packNom: prestigePack.nom,
      packEmoji: prestigePack.emoji,
      total: prestigeTotal,
      honoraires: prestigeHonoraires,
      sousTotalP: prestigeSousTotalP,
      highlight: false,
      badge: '+Options premium',
      badgeColor: 'bg-purple-100 text-purple-700',
      services: [...prestigePack.services, 'Feux d\'artifice', 'Orchestre live'],
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-beige-200" />
        <h3 className="text-sm font-semibold text-dark/70 whitespace-nowrap">🎲 3 variantes de proposition</h3>
        <div className="h-px flex-1 bg-beige-200" />
      </div>
      <p className="text-xs text-dark/50 text-center">Ces variantes seront incluses dans la proposition PDF selon votre sélection</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {variantes.map((v) => {
          const isSelected = form.variantesIncluses.includes(v.key)
          return (
            <div
              key={v.key}
              onClick={() => {
                const current = form.variantesIncluses
                const updated = isSelected
                  ? current.filter((x) => x !== v.key)
                  : [...current, v.key] as ('confort' | 'equilibre' | 'prestige')[]
                onSelectVariante(updated)
              }}
              className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all ${
                v.highlight
                  ? isSelected ? 'border-gold-500 bg-gold-50 shadow-lg' : 'border-gold-300 bg-gold-50/50'
                  : isSelected ? 'border-dark bg-beige-50' : 'border-beige-200 hover:border-beige-300'
              }`}
            >
              {/* Badge */}
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${v.badgeColor}`}>{v.badge}</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm">{v.packEmoji}</span>
                  {isSelected && <span className="text-green-500 text-sm">✅</span>}
                </div>
              </div>

              {/* Titre */}
              <h4 className="font-bold text-dark text-base mb-0.5">{v.emoji} Variante {v.label}</h4>
              <p className="text-xs text-dark/50 mb-1">Pack {v.packNom}</p>
              <p className="text-xs text-dark/60 mb-4 leading-relaxed">{v.description}</p>

              {/* Services (3 premiers) */}
              <ul className="space-y-1 mb-4">
                {v.services.slice(0, 3).map((s) => (
                  <li key={s} className="text-xs text-dark/60 flex items-center gap-1.5">
                    <span className="text-gold-500">✓</span> {s}
                  </li>
                ))}
                {v.services.length > 3 && (
                  <li className="text-xs text-dark/40">+ {v.services.length - 3} autres...</li>
                )}
              </ul>

              {/* Prix */}
              <div className="border-t border-beige-200 pt-3 space-y-1">
                <div className="flex justify-between text-xs text-dark/50">
                  <span>Sous-total prestations</span>
                  <span>{formatFCFA(v.sousTotalP)}</span>
                </div>
                <div className="flex justify-between text-xs text-dark/50">
                  <span>Honoraires L&Lui (10%)</span>
                  <span>{formatFCFA(v.honoraires)}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-bold text-dark">Total TTC</span>
                  <span className={`text-lg font-bold ${v.highlight ? 'text-gold-600' : 'text-dark'}`}>
                    {formatFCFA(v.total)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-dark/40 text-center">Cliquez sur une variante pour l'inclure/exclure de la proposition PDF</p>
    </div>
  )
}
