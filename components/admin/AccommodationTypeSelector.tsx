'use client'

import { useState } from 'react'
import { ACCOMMODATION_TYPES, ACCOMMODATION_CATEGORIES, resolveAccommodationTypeId } from '@/lib/accommodationTypes'

interface Props {
  value: string
  onChange: (id: string) => void
}

function PrestigeStars({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < count ? 'text-[#C9A84C]' : 'text-dark/20'} style={{ fontSize: 11 }}>
          ★
        </span>
      ))}
    </span>
  )
}

export default function AccommodationTypeSelector({ value, onChange }: Props) {
  const resolvedValue = resolveAccommodationTypeId(value) ?? value
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const visibleCategories = categoryFilter
    ? ACCOMMODATION_CATEGORIES.filter((c) => c.id === categoryFilter)
    : ACCOMMODATION_CATEGORIES

  return (
    <div className="space-y-4">
      {/* Filtre par catégorie */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
            categoryFilter === null
              ? 'bg-dark text-white border-dark'
              : 'bg-white text-dark/60 border-beige-200 hover:border-dark/30'
          }`}
        >
          Toutes les catégories
        </button>
        {ACCOMMODATION_CATEGORIES.map((cat) => (
          <button
            type="button"
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id === categoryFilter ? null : cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              categoryFilter === cat.id
                ? 'bg-dark text-white border-dark'
                : 'bg-white text-dark/60 border-beige-200 hover:border-dark/30'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Sections par catégorie */}
      {visibleCategories.map((cat) => {
        const types = ACCOMMODATION_TYPES.filter((t) => t.category === cat.id && t.active)
        return (
          <div key={cat.id} className="space-y-2">
            <p className="text-xs font-bold text-dark/50 uppercase tracking-widest flex items-center gap-1.5">
              <span>{cat.icon}</span> {cat.label}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {types.map((t) => {
                const isSelected = resolvedValue === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange(t.id)}
                    className={`relative text-left p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-[#C9A84C] bg-[#FDF6E3] shadow-sm'
                        : 'border-beige-200 bg-[#F5F0E8] hover:border-[#C9A84C]/50 hover:bg-[#FDF6E3]/70'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 text-green-500 text-sm leading-none">✅</span>
                    )}
                    <div className="text-3xl mb-1.5">{t.icon}</div>
                    <p className="text-xs font-bold text-dark leading-tight mb-1">{t.label}</p>
                    <p className="text-[11px] text-dark/50 leading-tight mb-1.5 line-clamp-2">{t.description}</p>
                    <PrestigeStars count={t.prestige} />
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Valeur inconnue (type personnalisé legacy) */}
      {value && !resolveAccommodationTypeId(value) && (
        <div className="p-3 bg-beige-50 border border-beige-200 rounded-xl text-xs text-dark/60">
          Type personnalisé conservé : <span className="font-mono font-semibold">{value}</span>
        </div>
      )}
    </div>
  )
}
