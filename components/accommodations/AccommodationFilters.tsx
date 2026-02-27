'use client'

import { useState, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'villa', label: 'Villas' },
  { value: 'appartement', label: 'Appartements' },
  { value: 'chambre', label: 'Chambres' },
]

export default function AccommodationFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showAdvanced, setShowAdvanced] = useState(false)

  const currentType = searchParams.get('type') || ''
  const currentCheckIn = searchParams.get('check_in') || ''
  const currentCheckOut = searchParams.get('check_out') || ''
  const currentCapacity = searchParams.get('capacity') || ''
  const currentMinPrice = searchParams.get('min_price') || ''
  const currentMaxPrice = searchParams.get('max_price') || ''

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const clearAll = () => {
    router.push(pathname, { scroll: false })
  }

  const hasActiveFilters =
    currentType || currentCheckIn || currentCheckOut ||
    currentCapacity || currentMinPrice || currentMaxPrice

  return (
    <div className="bg-white rounded-2xl shadow-card p-4 sm:p-6">
      {/* Primary filters row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        {/* Type */}
        <div>
          <label className="label">Type de logement</label>
          <div className="relative">
            <select
              value={currentType}
              onChange={(e) => updateFilter('type', e.target.value)}
              className="input-field appearance-none pr-10"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/40 pointer-events-none" />
          </div>
        </div>

        {/* Check-in */}
        <div>
          <label className="label">Arrivée</label>
          <input
            type="date"
            value={currentCheckIn}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => updateFilter('check_in', e.target.value)}
            className="input-field"
          />
        </div>

        {/* Check-out */}
        <div>
          <label className="label">Départ</label>
          <input
            type="date"
            value={currentCheckOut}
            min={currentCheckIn || new Date().toISOString().split('T')[0]}
            onChange={(e) => updateFilter('check_out', e.target.value)}
            className="input-field"
          />
        </div>

        {/* Capacity */}
        <div>
          <label className="label">Voyageurs</label>
          <div className="relative">
            <select
              value={currentCapacity}
              onChange={(e) => updateFilter('capacity', e.target.value)}
              className="input-field appearance-none pr-10"
            >
              <option value="">Tous</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 10].map((n) => (
                <option key={n} value={n}>{n}+ personnes</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/40 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-beige-200 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-slide-up">
          <div>
            <label className="label">Prix min (FCFA/nuit)</label>
            <input
              type="number"
              value={currentMinPrice}
              min={0}
              step={5000}
              placeholder="0"
              onChange={(e) => updateFilter('min_price', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Prix max (FCFA/nuit)</label>
            <input
              type="number"
              value={currentMaxPrice}
              min={0}
              step={5000}
              placeholder="Sans limite"
              onChange={(e) => updateFilter('max_price', e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-beige-200">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-dark/60 hover:text-gold-600 transition-colors"
        >
          <SlidersHorizontal size={15} />
          {showAdvanced ? 'Masquer les filtres' : 'Filtres avancés'}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors"
          >
            <X size={14} />
            Effacer tout
          </button>
        )}
      </div>

      {/* Active filter tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3">
          {currentType && (
            <FilterTag
              label={TYPES.find(t => t.value === currentType)?.label || currentType}
              onRemove={() => updateFilter('type', '')}
            />
          )}
          {currentCheckIn && (
            <FilterTag label={`Arrivée: ${currentCheckIn}`} onRemove={() => updateFilter('check_in', '')} />
          )}
          {currentCheckOut && (
            <FilterTag label={`Départ: ${currentCheckOut}`} onRemove={() => updateFilter('check_out', '')} />
          )}
          {currentCapacity && (
            <FilterTag label={`${currentCapacity}+ pers.`} onRemove={() => updateFilter('capacity', '')} />
          )}
          {(currentMinPrice || currentMaxPrice) && (
            <FilterTag
              label={`${currentMinPrice || '0'} – ${currentMaxPrice || '∞'} FCFA`}
              onRemove={() => { updateFilter('min_price', ''); updateFilter('max_price', '') }}
            />
          )}
        </div>
      )}
    </div>
  )
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1.5 px-3 py-1 bg-gold-50 border border-gold-200 text-gold-700 text-xs rounded-full font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-gold-900 transition-colors">
        <X size={11} />
      </button>
    </span>
  )
}
