'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Loader2, Trash2, Save, Copy, Check, Tag, KeyRound, Eye, EyeOff, MessageCircle, Percent } from 'lucide-react'
import { createPartner, updatePartner, deletePartner } from '@/actions/partners'
import type { Partner } from '@/lib/types'

interface Props {
  partner?: Partner
}

export default function PartnerForm({ partner }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const isEdit = !!partner

  const copyAccessCode = () => {
    if (!partner?.access_code) return
    navigator.clipboard.writeText(partner.access_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
          <label className="label flex items-center gap-1.5">
            <MessageCircle size={14} className="text-green-500" /> Numéro WhatsApp
          </label>
          <input
            name="whatsapp_number" type="tel"
            defaultValue={partner?.whatsapp_number || ''}
            placeholder="237612345678 (format international, sans +)"
            className="input-field"
          />
          <p className="text-xs text-dark/40 mt-1">Utilisé pour envoyer le lien d&apos;invitation au portail partenaire.</p>
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

      {/* Code promo */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3 flex items-center gap-2">
          <Tag size={16} className="text-gold-500" /> Code promo dédié
        </h2>
        <p className="text-xs text-dark/50">
          Le code sera automatiquement créé (ou mis à jour) dans la liste <strong>Codes promo</strong> à l&apos;enregistrement.
        </p>

        <div>
          <label className="label">Code promo <span className="text-red-500">*</span></label>
          <input
            name="promo_code" type="text"
            defaultValue={partner?.promo_code || ''}
            placeholder="ex: KRIBI10"
            className="input-field uppercase tracking-widest font-mono"
            onChange={(e) => { e.currentTarget.value = e.currentTarget.value.toUpperCase() }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Type de réduction <span className="text-red-500">*</span></label>
            <select
              name="promo_discount_type"
              defaultValue={partner?.promo_discount_type || 'percent'}
              className="input-field"
            >
              <option value="percent">Pourcentage (%)</option>
              <option value="fixed">Montant fixe (FCFA)</option>
            </select>
          </div>
          <div>
            <label className="label">Valeur <span className="text-red-500">*</span></label>
            <input
              name="promo_discount_value" type="number" min={1}
              defaultValue={partner?.promo_discount_value || ''}
              placeholder="ex: 10"
              className="input-field"
            />
          </div>
        </div>

        {/* Aperçu du code si édition */}
        {isEdit && partner?.promo_code && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
            <Tag size={14} className="text-green-600 flex-shrink-0" />
            <span className="text-green-800">
              Code actif : <strong className="font-mono tracking-widest">{partner.promo_code}</strong>
              {(partner.promo_discount_value ?? 0) > 0 && (
                <> — {partner.promo_discount_type === 'percent'
                  ? `-${partner.promo_discount_value}%`
                  : `-${new Intl.NumberFormat('fr-FR').format(partner.promo_discount_value!)} FCFA`}
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Portail partenaire */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3 flex items-center gap-2">
          <KeyRound size={16} className="text-gold-500" /> Accès portail partenaire
        </h2>
        <p className="text-xs text-dark/50">
          Le partenaire peut se connecter sur <strong>/partenaire</strong> avec son code d&apos;accès et son PIN
          pour consulter et mettre à jour le calendrier de ses hébergements.
        </p>

        {/* Code d'accès (affiché en édition uniquement) */}
        {isEdit && partner.access_code && (
          <div>
            <label className="label">Code d&apos;accès (généré automatiquement)</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2.5 bg-beige-50 border border-beige-200 rounded-xl font-mono text-sm font-bold tracking-widest text-dark">
                {partner.access_code}
              </div>
              <button
                type="button"
                onClick={copyAccessCode}
                title="Copier"
                className="p-2.5 border border-beige-200 rounded-xl hover:bg-beige-50 transition-colors text-dark/50 hover:text-dark"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-xs text-dark/40 mt-1">À communiquer au partenaire. Non modifiable.</p>
          </div>
        )}

        {/* PIN */}
        <div>
          <label className="label">
            PIN d&apos;accès {!isEdit && <span className="text-dark/40 font-normal">(4 à 6 chiffres)</span>}
          </label>
          <div className="relative">
            <input
              name="access_pin"
              type={showPin ? 'text' : 'password'}
              defaultValue={partner?.access_pin || ''}
              placeholder="ex: 1234"
              pattern="[0-9]{4,6}"
              maxLength={6}
              className="input-field pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/30 hover:text-dark transition-colors"
            >
              {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {isEdit && (
            <p className="text-xs text-dark/40 mt-1">Laisser vide pour conserver le PIN actuel.</p>
          )}
        </div>

        {/* Lien portail */}
        {isEdit && partner.access_code && (
          <div className="bg-gold-50 border border-gold-200 rounded-xl p-3 text-xs text-dark/60">
            <p className="font-medium text-dark mb-0.5">Lien à communiquer au partenaire</p>
            <p className="font-mono break-all">{typeof window !== 'undefined' ? window.location.origin : ''}/partenaire</p>
          </div>
        )}
      </div>

      {/* Commission à l'usage */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3 flex items-center gap-2">
          <Percent size={16} className="text-gold-500" /> Commission à l&apos;usage
        </h2>
        <p className="text-xs text-dark/50">
          Micro-commission prélevée à chaque réservation créée par ce partenaire via son portail.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Type de commission</label>
            <select
              name="commission_usage_type"
              defaultValue={partner?.commission_usage_type || 'percent'}
              className="input-field"
            >
              <option value="percent">Pourcentage (%)</option>
              <option value="fixed">Montant fixe (FCFA)</option>
            </select>
          </div>
          <div>
            <label className="label">Valeur</label>
            <input
              name="commission_usage_value" type="number" min={0}
              defaultValue={partner?.commission_usage_value ?? ''}
              placeholder="ex: 2"
              className="input-field"
            />
          </div>
        </div>
        <p className="text-xs text-dark/40">Laisser à 0 pour ne pas appliquer de commission à l&apos;usage.</p>
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
