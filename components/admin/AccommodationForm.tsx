'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Loader2, Trash2, Save } from 'lucide-react'
import { createAccommodation, updateAccommodation, deleteAccommodation } from '@/actions/accommodations'
import type { Accommodation, Partner } from '@/lib/types'

interface Props {
  accommodation?: Accommodation
  partners: Partner[]
}

export default function AccommodationForm({ accommodation, partners }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deleting, setDeleting] = useState(false)
  const isEdit = !!accommodation

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = isEdit
        ? await updateAccommodation(accommodation.id, formData)
        : await createAccommodation(formData)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(isEdit ? 'Hébergement mis à jour' : 'Hébergement créé')
      router.push('/admin/hebergements')
      router.refresh()
    })
  }

  const handleDelete = async () => {
    if (!accommodation) return
    if (!confirm('Êtes-vous sûr de vouloir désactiver cet hébergement ?')) return

    setDeleting(true)
    const result = await deleteAccommodation(accommodation.id)
    if (!result.success) {
      toast.error(result.error)
    } else {
      toast.success('Hébergement désactivé')
      router.push('/admin/hebergements')
    }
    setDeleting(false)
  }

  const Field = ({
    label, name, type = 'text', required, placeholder, defaultValue, rows,
  }: {
    label: string; name: string; type?: string; required?: boolean
    placeholder?: string; defaultValue?: string | number; rows?: number
  }) => (
    <div>
      <label htmlFor={name} className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {rows ? (
        <textarea
          id={name} name={name} rows={rows} required={required}
          defaultValue={defaultValue as string}
          placeholder={placeholder}
          className="input-field resize-none"
        />
      ) : (
        <input
          id={name} name={name} type={type} required={required}
          defaultValue={defaultValue as string}
          placeholder={placeholder}
          className="input-field"
          step={type === 'number' ? 'any' : undefined}
        />
      )}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-5">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3">
          Informations générales
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Partner */}
          <div>
            <label className="label">Partenaire <span className="text-red-500">*</span></label>
            <select name="partner_id" required defaultValue={accommodation?.partner_id || ''} className="input-field">
              <option value="">Sélectionner un partenaire</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="label">Type <span className="text-red-500">*</span></label>
            <select name="type" required defaultValue={accommodation?.type || 'villa'} className="input-field">
              <option value="villa">Villa</option>
              <option value="appartement">Appartement</option>
              <option value="chambre">Chambre</option>
            </select>
          </div>
        </div>

        <Field label="Nom de l'hébergement" name="name" required defaultValue={accommodation?.name} placeholder="Villa Royale M'Bekaa" />
        <Field label="Description courte" name="short_description" rows={2} defaultValue={accommodation?.short_description || ''} placeholder="Résumé accrocheur (200 caractères max)" />
        <Field label="Description complète" name="description" rows={5} defaultValue={accommodation?.description || ''} placeholder="Description détaillée, ambiance, prestations..." />
        <Field label="Localisation" name="location" defaultValue={accommodation?.location || ''} placeholder="Route de Londji, Kribi" />
      </div>

      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3">
          Capacité & tarification
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Capacité (pers.)" name="capacity" type="number" required defaultValue={accommodation?.capacity || 2} />
          <Field label="Chambres" name="bedrooms" type="number" required defaultValue={accommodation?.bedrooms || 1} />
          <Field label="Salles de bain" name="bathrooms" type="number" required defaultValue={accommodation?.bathrooms || 1} />
          <Field label="Prix/nuit (FCFA)" name="price_per_night" type="number" required defaultValue={accommodation?.price_per_night || ''} placeholder="150000" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Taux de commission L&Lui (%)" name="commission_rate" type="number" required defaultValue={accommodation?.commission_rate || 10} placeholder="10" />
          {isEdit && (
            <div>
              <label className="label">Statut</label>
              <select name="status" defaultValue={accommodation?.status || 'active'} className="input-field">
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="featured"
            name="featured"
            value="true"
            defaultChecked={accommodation?.featured}
            className="w-4 h-4 rounded border-beige-300 text-gold-500 focus:ring-gold-400"
          />
          <label htmlFor="featured" className="text-sm text-dark/70">
            ⭐ Mettre en avant (coup de cœur)
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3">
          Photos
        </h2>
        <div>
          <label className="label">URLs des images (une par ligne) <span className="text-red-500">*</span></label>
          <textarea
            name="images"
            rows={5}
            required
            defaultValue={accommodation?.images?.join('\n') || ''}
            placeholder="https://images.unsplash.com/photo-xxx&#10;https://images.unsplash.com/photo-yyy"
            className="input-field resize-none font-mono text-xs"
          />
          <p className="text-xs text-dark/40 mt-1">La première image sera utilisée comme photo principale.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3">
          Équipements
        </h2>
        <div>
          <label className="label">Équipements et services (un par ligne)</label>
          <textarea
            name="amenities"
            rows={6}
            defaultValue={accommodation?.amenities?.join('\n') || ''}
            placeholder="WiFi haut débit&#10;Piscine privée&#10;Climatisation&#10;Cuisine équipée"
            className="input-field resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Enregistrement...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save size={16} />
                {isEdit ? 'Enregistrer les modifications' : 'Créer l\'hébergement'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Annuler
          </button>
        </div>

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
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
