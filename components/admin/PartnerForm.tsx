'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Loader2, Trash2, Save } from 'lucide-react'
import { createPartner, updatePartner, deletePartner } from '@/actions/partners'
import type { Partner } from '@/lib/types'

interface Props {
  partner?: Partner
}

export default function PartnerForm({ partner }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deleting, setDeleting] = useState(false)
  const isEdit = !!partner

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = isEdit
        ? await updatePartner(partner.id, formData)
        : await createPartner(formData)

      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(isEdit ? 'Partenaire mis à jour' : 'Partenaire créé')
      router.push('/admin/partenaires')
      router.refresh()
    })
  }

  const handleDelete = async () => {
    if (!partner) return
    if (!confirm('Désactiver ce partenaire ?')) return
    setDeleting(true)
    const result = await deletePartner(partner.id)
    if (!result.success) {
      toast.error(result.error)
    } else {
      toast.success('Partenaire désactivé')
      router.push('/admin/partenaires')
    }
    setDeleting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {/* Infos générales */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3">Informations générales</h2>

        <div>
          <label className="label">Nom du partenaire <span className="text-red-500">*</span></label>
          <input
            name="name" type="text" required
            defaultValue={partner?.name}
            placeholder="Nom de l'entreprise ou du propriétaire"
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Email</label>
            <input
              name="email" type="email"
              defaultValue={partner?.email || ''}
              placeholder="contact@exemple.com"
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input
              name="phone" type="tel"
              defaultValue={partner?.phone || ''}
              placeholder="+237 6XX XXX XXX"
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="label">Adresse</label>
          <input
            name="address" type="text"
            defaultValue={partner?.address || ''}
            placeholder="Ville, quartier..."
            className="input-field"
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            name="description" rows={3}
            defaultValue={partner?.description || ''}
            placeholder="Notes sur ce partenaire..."
            className="input-field resize-none"
          />
        </div>

        {isEdit && (
          <div>
            <label className="label">Statut</label>
            <select name="is_active" defaultValue={partner?.is_active ? 'true' : 'false'} className="input-field">
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
          </div>
        )}
      </div>

      {/* Informations financières */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3">Informations financières</h2>

        <div>
          <label className="label">IBAN / Coordonnées bancaires</label>
          <input
            name="iban" type="text"
            defaultValue={partner?.iban || ''}
            placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
            className="input-field font-mono text-sm"
          />
          <p className="text-xs text-dark/40 mt-1">Pour les virements de reversement.</p>
        </div>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3">Logo</h2>

        <div>
          <label className="label">URL du logo</label>
          <input
            name="logo_url" type="url"
            defaultValue={partner?.logo_url || ''}
            placeholder="https://..."
            className="input-field"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-3">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? (
              <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Enregistrement...</span>
            ) : (
              <span className="flex items-center gap-2"><Save size={16} />{isEdit ? 'Enregistrer' : 'Créer le partenaire'}</span>
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
