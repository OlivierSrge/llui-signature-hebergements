'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Loader2, Save, Building2, User, Calendar, CreditCard } from 'lucide-react'
import { createAdminReservation } from '@/actions/admin-reservations'

interface Accommodation {
  id: string
  name: string
  price_per_night: number
  commission_rate: number
  location: string | null
  partner_id: string
  partner_name: string | null
}

interface Props {
  accommodations: Accommodation[]
  preselectedId?: string
}

export default function AdminReservationForm({ accommodations, preselectedId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState(preselectedId || (accommodations[0]?.id ?? ''))
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')

  const selected = accommodations.find((a) => a.id === selectedId)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createAdminReservation(formData)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Réservation créée !')
      router.push(`/admin/reservations/${result.reservationId}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">

      {/* Hébergement */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-100 pb-3 flex items-center gap-2">
          <Building2 size={15} className="text-gold-500" /> Hébergement
        </h2>
        <div>
          <label className="label">Hébergement <span className="text-red-500">*</span></label>
          <select
            name="accommodation_id"
            required
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="input-field"
          >
            {accommodations.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}{acc.location ? ` — ${acc.location}` : ''}{acc.partner_name ? ` (${acc.partner_name})` : ''}
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="grid grid-cols-2 gap-3 text-sm bg-beige-50 rounded-xl p-3">
            <div>
              <p className="text-dark/40 text-xs">Prix / nuit</p>
              <p className="font-semibold text-dark">{selected.price_per_night.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <div>
              <p className="text-dark/40 text-xs">Commission L&Lui</p>
              <p className="font-semibold text-dark">{selected.commission_rate}%</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Arrivée <span className="text-red-500">*</span></label>
            <input
              name="check_in" type="date" required
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Départ <span className="text-red-500">*</span></label>
            <input
              name="check_out" type="date" required
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={checkIn || new Date().toISOString().split('T')[0]}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="label">Voyageurs <span className="text-red-500">*</span></label>
          <input name="guests" type="number" min={1} max={30} defaultValue={2} required className="input-field" />
        </div>
      </div>

      {/* Client */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-100 pb-3 flex items-center gap-2">
          <User size={15} className="text-gold-500" /> Informations client
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Prénom <span className="text-red-500">*</span></label>
            <input name="guest_first_name" type="text" required placeholder="Prénom" className="input-field" />
          </div>
          <div>
            <label className="label">Nom <span className="text-red-500">*</span></label>
            <input name="guest_last_name" type="text" required placeholder="Nom" className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Téléphone</label>
            <input name="guest_phone" type="tel" placeholder="+237 6XX XXX XXX" className="input-field" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="guest_email" type="email" placeholder="client@exemple.com" className="input-field" />
          </div>
        </div>
      </div>

      {/* Paiement & options */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-100 pb-3 flex items-center gap-2">
          <CreditCard size={15} className="text-gold-500" /> Paiement & options
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Mode de paiement <span className="text-red-500">*</span></label>
            <select name="payment_method" required className="input-field">
              <option value="especes">Espèces</option>
              <option value="orange_money">Orange Money</option>
              <option value="virement">Virement bancaire</option>
            </select>
          </div>
          <div>
            <label className="label">Statut paiement</label>
            <select name="payment_status" className="input-field">
              <option value="en_attente">En attente</option>
              <option value="paye">Payé</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Code promo</label>
          <input name="promo_code" type="text" placeholder="Laisser vide si aucun" className="input-field font-mono uppercase" />
        </div>
        <div>
          <label className="label">Notes internes / instructions</label>
          <textarea name="notes" rows={3} placeholder="Informations à destination de l'équipe ou du partenaire..." className="input-field resize-none" />
        </div>
        <div>
          <label className="label">Statut réservation</label>
          <select name="reservation_status" className="input-field">
            <option value="confirmee">Confirmée directement</option>
            <option value="en_attente">En attente</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="btn-primary flex items-center gap-2">
          {isPending
            ? <><Loader2 size={16} className="animate-spin" /> Création...</>
            : <><Save size={16} /> Créer la réservation</>}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">Annuler</button>
      </div>
    </form>
  )
}
