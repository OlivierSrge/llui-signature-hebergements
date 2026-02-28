'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Loader2, Trash2, Save } from 'lucide-react'
import { createPack, updatePack, deletePack } from '@/actions/packs'
import type { Pack, Accommodation } from '@/lib/types'

interface Props {
  pack?: Pack
  accommodations: Accommodation[]
}

const PACK_TYPES = [
  { value: 'f3', label: 'Pack F3 – Logements familiaux' },
  { value: 'vip', label: 'Pack VIP – Logements premium' },
  { value: 'signature', label: 'Pack Sélection Signature' },
]

export default function PackForm({ pack, accommodations }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deleting, setDeleting] = useState(false)
  const isEdit = !!pack

  const [selectedIds, setSelectedIds] = useState<string[]>(pack?.accommodation_ids || [])

  const toggleAccommodation = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (selectedIds.length === 0) {
      toast.error('Sélectionnez au moins un hébergement')
      return
    }
    const formData = new FormData(e.currentTarget)
    formData.set('accommodation_ids', selectedIds.join(','))

    startTransition(async () => {
      const result = isEdit
        ? await updatePack(pack.id, formData)
        : await createPack(formData)

      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(isEdit ? 'Pack mis à jour' : 'Pack créé')
      router.push('/admin/packs')
      router.refresh()
    })
  }

  const handleDelete = async () => {
    if (!pack) return
    if (!confirm('Désactiver ce pack ?')) return
    setDeleting(true)
    const result = await deletePack(pack.id)
    if (!result.success) {
      toast.error(result.error)
    } else {
      toast.success('Pack désactivé')
      router.push('/admin/packs')
    }
    setDeleting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {/* Infos générales */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3">Informations générales</h2>

        <div>
          <label className="label">Type de pack <span className="text-red-500">*</span></label>
          <select name="pack_type" required defaultValue={pack?.pack_type || 'f3'} className="input-field">
            {PACK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Nom du pack <span className="text-red-500">*</span></label>
          <input
            name="name" type="text" required
            defaultValue={pack?.name}
            placeholder="Pack 5 logements F3 – Kribi"
            className="input-field"
          />
        </div>

        <div>
          <label className="label">Description courte <span className="text-red-500">*</span></label>
          <textarea
            name="short_description" rows={2} required
            defaultValue={pack?.short_description}
            placeholder="Idéal pour les mariages et événements familiaux..."
            className="input-field resize-none"
          />
        </div>

        <div>
          <label className="label">Description complète</label>
          <textarea
            name="description" rows={4}
            defaultValue={pack?.description || ''}
            placeholder="Description détaillée du pack, avantages, conditions..."
            className="input-field resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox" id="featured" name="featured" value="true"
            defaultChecked={pack?.featured}
            className="w-4 h-4 rounded border-beige-300 text-gold-500 focus:ring-gold-400"
          />
          <label htmlFor="featured" className="text-sm text-dark/70">⭐ Mettre en avant (coup de cœur)</label>
        </div>

        {isEdit && (
          <div>
            <label className="label">Statut</label>
            <select name="status" defaultValue={pack?.status || 'active'} className="input-field">
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
        )}
      </div>

      {/* Hébergements inclus */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-beige-200 pb-3">
          <h2 className="font-semibold text-dark">Hébergements inclus</h2>
          <span className="text-xs text-dark/40">{selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''}</span>
        </div>
        {accommodations.length === 0 ? (
          <p className="text-dark/50 text-sm">Aucun hébergement actif trouvé.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {accommodations.map((acc) => (
              <label
                key={acc.id}
                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                  selectedIds.includes(acc.id)
                    ? 'border-gold-400 bg-gold-50'
                    : 'border-beige-200 hover:border-beige-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(acc.id)}
                  onChange={() => toggleAccommodation(acc.id)}
                  className="w-4 h-4 rounded border-beige-300 text-gold-500 focus:ring-gold-400"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark truncate">{acc.name}</p>
                  <p className="text-xs text-dark/50">{acc.type} · {acc.capacity} pers. · {acc.location}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Photos */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3">Photos du pack</h2>
        <div>
          <label className="label">URLs des images (une par ligne)</label>
          <textarea
            name="images" rows={4}
            defaultValue={pack?.images?.join('\n') || ''}
            placeholder="https://images.unsplash.com/photo-xxx"
            className="input-field resize-none font-mono text-xs"
          />
          <p className="text-xs text-dark/40 mt-1">La première image sera utilisée comme photo principale.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-3">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? (
              <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Enregistrement...</span>
            ) : (
              <span className="flex items-center gap-2"><Save size={16} />{isEdit ? 'Enregistrer' : 'Créer le pack'}</span>
            )}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Annuler</button>
        </div>

        {isEdit && (
          <button
            type="button" onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-2 px-4 py-3 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Désactiver
          </button>
        )}
      </div>
    </form>
  )
}
