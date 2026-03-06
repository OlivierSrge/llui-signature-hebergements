'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Loader2, Sun, Tag } from 'lucide-react'
import { addSeasonalPricing, deleteSeasonalPricing } from '@/actions/seasonal-pricing'
import { toast } from 'react-hot-toast'
import { formatDate, formatPrice } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { SeasonalPricing } from '@/lib/types'

interface Props {
  accommodationId: string
  basePrice: number
  periods: SeasonalPricing[]
}

export default function SeasonalPricingManager({ accommodationId, basePrice, periods: initialPeriods }: Props) {
  const router = useRouter()
  const [periods, setPeriods] = useState<SeasonalPricing[]>(initialPeriods)
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [label, setLabel] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [price, setPrice] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim() || !startDate || !endDate || !price) {
      toast.error('Tous les champs sont requis')
      return
    }
    startTransition(async () => {
      const result = await addSeasonalPricing(accommodationId, {
        label,
        start_date: startDate,
        end_date: endDate,
        price_per_night: Number(price),
      })
      if (!result.success) { toast.error(result.error); return }
      toast.success('Tarif saisonnier ajouté')
      setLabel(''); setStartDate(''); setEndDate(''); setPrice('')
      setShowForm(false)
      router.refresh()
    })
  }

  const handleDelete = async (periodId: string) => {
    if (!confirm('Supprimer ce tarif saisonnier ?')) return
    setDeleting(periodId)
    const result = await deleteSeasonalPricing(accommodationId, periodId)
    setDeleting(null)
    if (!result.success) { toast.error(result.error); return }
    toast.success('Tarif supprimé')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-dark/50">Prix de base : <span className="font-semibold text-dark">{formatPrice(basePrice)}/nuit</span></p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500 text-white rounded-xl text-xs font-medium hover:bg-gold-600 transition-colors"
        >
          <Plus size={12} /> Ajouter une période
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="p-4 bg-beige-50 border border-beige-200 rounded-xl space-y-3">
          <p className="text-xs font-semibold text-dark">Nouvelle période tarifaire</p>
          <div>
            <label className="label text-xs">Libellé (ex: Haute saison, Noël)</label>
            <div className="relative">
              <Tag size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gold-500" />
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Haute saison"
                required
                className="input-field pl-7 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Date début</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="input-field text-sm" />
            </div>
            <div>
              <label className="label text-xs">Date fin</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="input-field text-sm" />
            </div>
          </div>
          <div>
            <label className="label text-xs">Prix / nuit (FCFA)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="ex: 85000"
              min="0"
              required
              className="input-field text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="flex-1 py-2 px-3 bg-gold-500 text-white rounded-xl text-xs font-medium hover:bg-gold-600 disabled:opacity-50 flex items-center justify-center gap-1">
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Ajouter
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="py-2 px-3 border border-beige-200 rounded-xl text-xs text-dark/50 hover:bg-beige-50">Annuler</button>
          </div>
        </form>
      )}

      {periods.length === 0 ? (
        <p className="text-sm text-dark/40 py-4 text-center">Aucun tarif saisonnier — le prix de base s&apos;applique toujours</p>
      ) : (
        <div className="space-y-2">
          {periods.map((period) => (
            <div key={period.id} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <Sun size={16} className="text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-dark">{period.label}</p>
                <p className="text-xs text-dark/50">
                  {formatDate(period.start_date)} → {formatDate(period.end_date)}
                </p>
              </div>
              <p className="text-sm font-bold text-amber-700">{formatPrice(period.price_per_night)}/nuit</p>
              <button
                type="button"
                onClick={() => handleDelete(period.id)}
                disabled={deleting === period.id}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting === period.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
