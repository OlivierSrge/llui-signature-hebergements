'use client'

import { useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { createPromoCode, togglePromoCode, deletePromoCode } from '@/actions/promo-codes'
import type { PromoCode, DiscountType } from '@/lib/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PromoCodesClient({ initialCodes }: { initialCodes: PromoCode[] }) {
  const [codes, setCodes] = useState<PromoCode[]>(initialCodes)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    code: '',
    discount_type: 'percent' as DiscountType,
    discount_value: '',
    expires_at: '',
    max_uses: '',
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await createPromoCode({
        code: form.code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        expires_at: form.expires_at || null,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
      })
      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la création')
        return
      }
      toast.success('Code promo créé !')
      setShowForm(false)
      setForm({ code: '', discount_type: 'percent', discount_value: '', expires_at: '', max_uses: '' })
      // Refresh list
      window.location.reload()
    })
  }

  const handleToggle = async (id: string, current: boolean) => {
    startTransition(async () => {
      await togglePromoCode(id, !current)
      setCodes((prev) => prev.map((c) => c.id === id ? { ...c, active: !current } : c))
      toast.success(!current ? 'Code activé' : 'Code désactivé')
    })
  }

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Supprimer le code "${code}" ?`)) return
    startTransition(async () => {
      await deletePromoCode(id)
      setCodes((prev) => prev.filter((c) => c.id !== id))
      toast.success('Code supprimé')
    })
  }

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-dark">Codes promo</h1>
          <p className="text-dark/50 text-sm mt-1">{codes.length} code{codes.length > 1 ? 's' : ''} au total</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm"
        >
          <Plus size={16} /> Nouveau code
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-beige-200 p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-dark flex items-center gap-2"><Tag size={16} className="text-gold-500" /> Créer un code promo</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Code <span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="KRIBI20"
                className="input-field uppercase tracking-widest"
              />
            </div>

            <div>
              <label className="label">Type de réduction <span className="text-red-500">*</span></label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm((p) => ({ ...p, discount_type: e.target.value as DiscountType }))}
                className="input-field"
              >
                <option value="percent">Pourcentage (%)</option>
                <option value="fixed">Montant fixe (FCFA)</option>
              </select>
            </div>

            <div>
              <label className="label">
                Valeur <span className="text-red-500">*</span>
                <span className="text-dark/40 font-normal ml-1">
                  {form.discount_type === 'percent' ? '(ex: 10 = 10%)' : '(ex: 5000 = 5 000 FCFA)'}
                </span>
              </label>
              <input
                required
                type="number"
                min={1}
                max={form.discount_type === 'percent' ? 100 : undefined}
                value={form.discount_value}
                onChange={(e) => setForm((p) => ({ ...p, discount_value: e.target.value }))}
                placeholder={form.discount_type === 'percent' ? '10' : '5000'}
                className="input-field"
              />
            </div>

            <div>
              <label className="label">Utilisations max <span className="text-dark/40 font-normal">(laisser vide = illimité)</span></label>
              <input
                type="number"
                min={1}
                value={form.max_uses}
                onChange={(e) => setForm((p) => ({ ...p, max_uses: e.target.value }))}
                placeholder="100"
                className="input-field"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Date d&apos;expiration <span className="text-dark/40 font-normal">(laisser vide = sans limite)</span></label>
              <input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isPending} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Créer le code
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-sm border border-beige-200 rounded-xl hover:bg-beige-50 transition-colors">
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Codes list */}
      {codes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-beige-200 p-12 text-center">
          <Tag size={32} className="text-dark/20 mx-auto mb-3" />
          <p className="text-dark/50">Aucun code promo créé pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-beige-50 border-b border-beige-200">
              <tr>
                <th className="text-left px-5 py-3.5 font-semibold text-dark/60 text-xs uppercase tracking-wide">Code</th>
                <th className="text-left px-5 py-3.5 font-semibold text-dark/60 text-xs uppercase tracking-wide">Réduction</th>
                <th className="text-left px-5 py-3.5 font-semibold text-dark/60 text-xs uppercase tracking-wide hidden sm:table-cell">Utilisations</th>
                <th className="text-left px-5 py-3.5 font-semibold text-dark/60 text-xs uppercase tracking-wide hidden md:table-cell">Expiration</th>
                <th className="text-left px-5 py-3.5 font-semibold text-dark/60 text-xs uppercase tracking-wide">Statut</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-beige-100">
              {codes.map((c) => (
                <tr key={c.id} className="hover:bg-beige-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-mono font-bold text-dark tracking-widest">{c.code}</span>
                  </td>
                  <td className="px-5 py-4 text-dark/70">
                    {c.discount_type === 'percent'
                      ? <span className="text-green-700 font-semibold">-{c.discount_value}%</span>
                      : <span className="text-green-700 font-semibold">-{new Intl.NumberFormat('fr-FR').format(c.discount_value)} FCFA</span>
                    }
                  </td>
                  <td className="px-5 py-4 text-dark/60 hidden sm:table-cell">
                    {c.used_count} / {c.max_uses ?? '∞'}
                  </td>
                  <td className="px-5 py-4 text-dark/60 hidden md:table-cell">
                    {c.expires_at ? formatDate(c.expires_at) : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`badge text-xs px-2.5 py-1 ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleToggle(c.id, c.active)}
                        disabled={isPending}
                        title={c.active ? 'Désactiver' : 'Activer'}
                        className="text-dark/40 hover:text-gold-600 transition-colors disabled:opacity-40"
                      >
                        {c.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.code)}
                        disabled={isPending}
                        title="Supprimer"
                        className="text-dark/40 hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
