'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { User, Mail, Phone, CreditCard, MessageSquare, Loader2, Tag, CheckCircle, XCircle } from 'lucide-react'
import { createReservation } from '@/actions/reservations'
import { validatePromoCode } from '@/actions/promo-codes'
import type { PaymentMethod } from '@/lib/types'
import type { PromoValidationResult } from '@/actions/promo-codes'

interface Props {
  accommodationId: string
  accommodationSlug: string
  checkIn: string
  checkOut: string
  guests: number
  nights: number
  totalPrice: number
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; desc: string; icon: string }[] = [
  {
    value: 'orange_money',
    label: 'Orange Money',
    desc: 'Paiement mobile sécurisé',
    icon: '🟠',
  },
  {
    value: 'virement',
    label: 'Virement bancaire',
    desc: 'IBAN communiqué par email',
    icon: '🏦',
  },
  {
    value: 'especes',
    label: 'Espèces',
    desc: 'À remettre à notre équipe',
    icon: '💵',
  },
]

export default function ReservationForm({
  accommodationId,
  accommodationSlug,
  checkIn,
  checkOut,
  guests,
  nights,
  totalPrice,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('orange_money')

  const [form, setForm] = useState({
    guest_first_name: '',
    guest_last_name: '',
    guest_email: '',
    guest_phone: '',
    notes: '',
  })

  const [promoInput, setPromoInput] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoResult, setPromoResult] = useState<PromoValidationResult | null>(null)

  const finalPrice = promoResult?.valid ? totalPrice - promoResult.discount_amount : totalPrice

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return
    setPromoLoading(true)
    const result = await validatePromoCode(promoInput, totalPrice)
    setPromoResult(result)
    setPromoLoading(false)
    if (result.valid) toast.success('Code promo appliqué !')
  }

  const handleRemovePromo = () => {
    setPromoInput('')
    setPromoResult(null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!checkIn || !checkOut || nights <= 0) {
      toast.error('Veuillez sélectionner des dates valides')
      return
    }

    setLoading(true)

    try {
      const result = await createReservation(accommodationId, {
        ...form,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        payment_method: paymentMethod,
        notes: form.notes || undefined,
        promo_code: promoResult?.valid ? promoResult.code : undefined,
        discount_amount: promoResult?.valid ? promoResult.discount_amount : undefined,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      router.push(`/confirmation?id=${result.reservationId}`)
    } catch (err) {
      toast.error('Une erreur inattendue est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-dark mb-1">
          Vos coordonnées
        </h2>
        <p className="text-dark/50 text-sm mb-6">
          Ces informations vous permettront de recevoir la confirmation par email.
        </p>
      </div>

      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="guest_first_name" className="label">
            Prénom <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark/30" />
            <input
              id="guest_first_name"
              name="guest_first_name"
              type="text"
              required
              value={form.guest_first_name}
              onChange={handleChange}
              placeholder="Amina"
              className="input-field pl-10"
            />
          </div>
        </div>
        <div>
          <label htmlFor="guest_last_name" className="label">
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            id="guest_last_name"
            name="guest_last_name"
            type="text"
            required
            value={form.guest_last_name}
            onChange={handleChange}
            placeholder="Ngono"
            className="input-field"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="guest_email" className="label">
          Email <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark/30" />
          <input
            id="guest_email"
            name="guest_email"
            type="email"
            required
            value={form.guest_email}
            onChange={handleChange}
            placeholder="amina@exemple.cm"
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="guest_phone" className="label">
          Téléphone <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark/30" />
          <input
            id="guest_phone"
            name="guest_phone"
            type="tel"
            required
            value={form.guest_phone}
            onChange={handleChange}
            placeholder="+237 6XX XXX XXX"
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Payment method */}
      <div>
        <label className="label">
          Mode de paiement <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 gap-2.5">
          {PAYMENT_METHODS.map((method) => (
            <label
              key={method.value}
              className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                paymentMethod === method.value
                  ? 'border-gold-500 bg-gold-50'
                  : 'border-beige-200 bg-white hover:border-beige-300'
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value={method.value}
                checked={paymentMethod === method.value}
                onChange={() => setPaymentMethod(method.value)}
                className="hidden"
              />
              <span className="text-2xl">{method.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-dark text-sm">{method.label}</p>
                <p className="text-dark/50 text-xs">{method.desc}</p>
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  paymentMethod === method.value
                    ? 'border-gold-500'
                    : 'border-beige-300'
                }`}
              >
                {paymentMethod === method.value && (
                  <div className="w-2 h-2 rounded-full bg-gold-500" />
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="label">
          Message / Demandes spéciales
        </label>
        <div className="relative">
          <MessageSquare size={15} className="absolute left-3.5 top-3.5 text-dark/30" />
          <textarea
            id="notes"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Heure d'arrivée prévue, demandes particulières..."
            rows={3}
            className="input-field pl-10 resize-none"
          />
        </div>
      </div>

      {/* Promo code */}
      <div>
        <label className="label">Code promo</label>
        {promoResult?.valid ? (
          <div className="flex items-center justify-between p-3.5 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2.5">
              <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">{promoResult.code}</p>
                <p className="text-xs text-green-600">
                  -{promoResult.discount_type === 'percent'
                    ? `${promoResult.discount_value}%`
                    : `${new Intl.NumberFormat('fr-FR').format(promoResult.discount_amount)} FCFA`}
                  {' '}sur le total
                </p>
              </div>
            </div>
            <button type="button" onClick={handleRemovePromo} className="text-green-700 hover:text-green-900 transition-colors">
              <XCircle size={18} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark/30" />
              <input
                type="text"
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value.toUpperCase())
                  if (promoResult && !promoResult.valid) setPromoResult(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyPromo())}
                placeholder="KRIBI10"
                className="input-field pl-10 uppercase tracking-widest"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyPromo}
              disabled={!promoInput.trim() || promoLoading}
              className="px-4 py-2.5 bg-dark text-white text-sm font-medium rounded-xl hover:bg-dark/80 disabled:opacity-40 transition-colors flex-shrink-0"
            >
              {promoLoading ? <Loader2 size={15} className="animate-spin" /> : 'Appliquer'}
            </button>
          </div>
        )}
        {promoResult && !promoResult.valid && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <XCircle size={13} /> {promoResult.error}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || nights <= 0}
        className="w-full btn-primary py-4 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            Traitement en cours...
          </span>
        ) : (
          'Envoyer ma demande de réservation'
        )}
      </button>

      <p className="text-center text-xs text-dark/40 leading-relaxed">
        En soumettant ce formulaire, vous acceptez nos conditions générales.
        Votre réservation sera confirmée par email après validation de notre équipe.
      </p>
    </form>
  )
}
