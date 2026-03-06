'use client'

import { useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import { Loader2, QrCode, MessageCircle, User, Calendar, CreditCard, CheckCircle2 } from 'lucide-react'
import { createPartnerReservation } from '@/actions/partner-reservations'

interface Accommodation {
  id: string
  name: string
  price_per_night: number
  location: string | null
}

interface Props {
  accommodations: Accommodation[]
}

export default function PartnerReservationForm({ accommodations }: Props) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ reservationId: string; confirmationCode: string; qrCodeUrl: string } | null>(null)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guestPhone, setGuestPhone] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await createPartnerReservation(formData)
      if (!res.success) {
        toast.error(res.error)
        return
      }

      // Build QR URL for display
      const baseUrl = window.location.origin
      const qrData = encodeURIComponent(`${baseUrl}/partenaire/scanner?code=${res.confirmationCode}`)
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}&bgcolor=FFFFFF&color=1A1A1A&margin=10`

      setResult({ reservationId: res.reservationId, confirmationCode: res.confirmationCode, qrCodeUrl })
      toast.success('Réservation soumise, en attente de confirmation.')
    })
  }

  // ─── Écran post-création : en attente de confirmation ────────────────────
  if (result) {
    return (
      <div className="bg-white rounded-2xl border border-beige-200 p-8 text-center space-y-6">
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 size={48} className="text-amber-400" />
          <h2 className="font-serif text-2xl font-semibold text-dark">Réservation soumise</h2>
          <p className="text-dark/50 text-sm max-w-xs">
            La réservation est <strong>en attente de confirmation</strong> par l&apos;équipe L&amp;Lui Signature.
            Le QR code sera disponible une fois la réservation confirmée.
          </p>
        </div>

        <div className="bg-beige-50 rounded-xl px-6 py-4">
          <p className="text-xs text-dark/40 mb-1">Numéro de réservation</p>
          <p className="font-mono text-lg font-bold text-dark tracking-widest">{result.confirmationCode}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={`/partenaire/reservations/${result.reservationId}`}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 transition-colors"
          >
            Voir la réservation
          </a>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="px-4 py-2.5 border border-beige-200 text-dark/60 rounded-xl text-sm hover:bg-beige-50 transition-colors"
          >
            Nouvelle réservation
          </button>
        </div>
      </div>
    )
  }

  // ─── Form ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Hébergement */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-100 pb-3">Hébergement</h2>
        <div>
          <label className="label">Hébergement <span className="text-red-500">*</span></label>
          <select name="accommodation_id" required className="input-field">
            {accommodations.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}{acc.location ? ` — ${acc.location}` : ''} ({acc.price_per_night.toLocaleString('fr-FR')} FCFA/nuit)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label flex items-center gap-1.5"><Calendar size={13} /> Arrivée <span className="text-red-500">*</span></label>
            <input
              name="check_in" type="date" required
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="input-field"
            />
          </div>
          <div>
            <label className="label flex items-center gap-1.5"><Calendar size={13} /> Départ <span className="text-red-500">*</span></label>
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
          <label className="label">Nombre de voyageurs <span className="text-red-500">*</span></label>
          <input name="guests" type="number" min={1} max={20} defaultValue={2} required className="input-field" />
        </div>
      </div>

      {/* Client */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-100 pb-3 flex items-center gap-2">
          <User size={15} /> Informations client
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

        <div>
          <label className="label flex items-center gap-1.5"><MessageCircle size={13} className="text-green-500" /> Téléphone WhatsApp</label>
          <input
            name="guest_phone" type="tel"
            placeholder="237612345678"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className="input-field"
          />
          <p className="text-xs text-dark/40 mt-1">Utilisé pour envoyer le QR code au client après création.</p>
        </div>

        <div>
          <label className="label">Email</label>
          <input name="guest_email" type="email" placeholder="client@exemple.com" className="input-field" />
        </div>
      </div>

      {/* Paiement */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-100 pb-3 flex items-center gap-2">
          <CreditCard size={15} /> Paiement
        </h2>

        <div>
          <label className="label">Mode de paiement <span className="text-red-500">*</span></label>
          <select name="payment_method" required className="input-field">
            <option value="especes">Espèces</option>
            <option value="orange_money">Orange Money</option>
            <option value="virement">Virement bancaire</option>
          </select>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            name="notes" rows={3}
            placeholder="Instructions particulières, demandes spéciales..."
            className="input-field resize-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="btn-primary flex items-center gap-2">
          {isPending ? (
            <><Loader2 size={16} className="animate-spin" /> Création en cours...</>
          ) : (
            <><QrCode size={16} /> Créer la réservation & générer le QR</>
          )}
        </button>
      </div>
    </form>
  )
}
