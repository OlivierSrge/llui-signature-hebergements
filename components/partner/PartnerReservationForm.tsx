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

interface InitialValues {
  accommodation_id?: string
  check_in?: string
  check_out?: string
  guests?: string
  guest_first_name?: string
  guest_last_name?: string
  guest_phone?: string
  guest_email?: string
  notes?: string
}

interface Props {
  accommodations: Accommodation[]
  initialValues?: InitialValues
  fromDemandId?: string | null
  prescripteurActif?: { nom_complet: string; expire_at: string } | null
}

export default function PartnerReservationForm({ accommodations, initialValues, fromDemandId, prescripteurActif }: Props) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ reservationId: string; confirmationCode: string; qrCodeUrl: string; qr_reservation_url?: string; code_manuel_prescripteur?: string; guestPhone?: string } | null>(null)
  const [checkIn, setCheckIn] = useState(initialValues?.check_in || '')
  const [checkOut, setCheckOut] = useState(initialValues?.check_out || '')
  const [guestPhone, setGuestPhone] = useState(initialValues?.guest_phone || '')

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

      setResult({
        reservationId: res.reservationId,
        confirmationCode: res.confirmationCode,
        qrCodeUrl,
        qr_reservation_url: res.qr_reservation_url,
        code_manuel_prescripteur: res.code_manuel_prescripteur,
        guestPhone: guestPhone || undefined,
      })
      toast.success('Disponibilité confirmée — QR généré !')
    })
  }

  // ─── Écran post-création : disponibilité confirmée ───────────────────────
  if (result) {
    return (
      <div className="bg-white rounded-2xl border border-beige-200 p-8 text-center space-y-6">
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 size={48} className="text-green-500" />
          <h2 className="font-serif text-2xl font-semibold text-dark">Disponibilité confirmée !</h2>
          {result.guestPhone && (
            <p className="text-dark/50 text-sm">QR envoyé à {result.guestPhone}</p>
          )}
        </div>

        {/* ── QR Arrivée client ── */}
        <div className="w-full rounded-xl bg-beige-50 border border-beige-200 p-4 text-left">
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-widest mb-2">
            QR Arrivee Client
          </p>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.qrCodeUrl} alt="QR arrivee" width={80} height={80} className="rounded-lg border border-beige-200 shrink-0" />
            <div>
              <p className="font-mono text-base font-bold text-dark tracking-widest">{result.confirmationCode}</p>
              <p className="text-xs text-dark/50 mt-1">A scanner par le partenaire a l&apos;arrivee du client</p>
              {result.guestPhone && (
                <p className="text-xs text-green-600 mt-1">Envoye au client par WhatsApp</p>
              )}
            </div>
          </div>
        </div>

        {/* ── QR Prescripteur (moto-taxi) ── */}
        {result.qr_reservation_url && (
          <div className="w-full rounded-xl bg-amber-50 border-2 border-amber-300 p-4 text-left">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1">
              🏍 QR Prescripteur
            </p>
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.qr_reservation_url}
                alt="QR prescripteur"
                width={100}
                height={100}
                className="rounded-xl border border-amber-200 shrink-0"
              />
              <div className="flex-1">
                <p className="text-xs text-amber-800 font-medium mb-2">
                  A scanner par le moto-taxi APRES confirmation du paiement
                </p>
                <p className="text-xs text-amber-600 mb-1">Ce QR est DIFFERENT du QR arrivee ci-dessus.</p>
                {result.code_manuel_prescripteur && (
                  <div className="mt-2">
                    <p className="text-xs text-amber-700 font-semibold">Code manuel :</p>
                    <p className="font-mono text-xl font-bold text-dark tracking-[0.2em]">
                      {result.code_manuel_prescripteur.slice(0, 3)} {result.code_manuel_prescripteur.slice(3)}
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Dictez ce code si le scan est impossible
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ETAPE SUIVANTE */}
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 text-left">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-3">ÉTAPE SUIVANTE</p>
          <button
            type="button"
            disabled
            className="w-full py-3 rounded-xl bg-amber-200 text-amber-700 text-sm font-medium cursor-not-allowed opacity-70"
          >
            En attente du paiement client...
          </button>
          <p className="text-xs text-amber-600 mt-2 text-center">
            Confirmez le paiement depuis la page de réservation
          </p>
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
      {/* Prescripteur present */}
      {prescripteurActif && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 flex items-center gap-2">
          <span>🏍</span>
          <div>
            <strong>Prescripteur présent :</strong> {prescripteurActif.nom_complet}
            <span className="text-green-600 ml-2">— Commission : 1 500 FCFA</span>
          </div>
        </div>
      )}

      {/* Hébergement */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-100 pb-3">Hébergement</h2>
        <div>
          <label className="label">Hébergement <span className="text-red-500">*</span></label>
          <select name="accommodation_id" required className="input-field" defaultValue={initialValues?.accommodation_id || ''}>
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
          <input name="guests" type="number" min={1} max={20} defaultValue={initialValues?.guests || 2} required className="input-field" />
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
            <input name="guest_first_name" type="text" required placeholder="Prénom" defaultValue={initialValues?.guest_first_name || ''} className="input-field" />
          </div>
          <div>
            <label className="label">Nom <span className="text-red-500">*</span></label>
            <input name="guest_last_name" type="text" required placeholder="Nom" defaultValue={initialValues?.guest_last_name || ''} className="input-field" />
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
          <input name="guest_email" type="email" placeholder="client@exemple.com" defaultValue={initialValues?.guest_email || ''} className="input-field" />
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
            defaultValue={initialValues?.notes || ''}
            className="input-field resize-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="btn-primary flex items-center gap-2">
          {isPending ? (
            <><Loader2 size={16} className="animate-spin" /> Création en cours...</>
          ) : (
            <><QrCode size={16} /> Confirmer disponibilité + Envoyer QR client</>
          )}
        </button>
      </div>
    </form>
  )
}
