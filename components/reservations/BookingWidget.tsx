'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { type DateRange } from 'react-day-picker'
import { CalendarDays, Users, ChevronDown, MessageCircle, Send, CheckCircle, Phone, Mail, User, Tag, X } from 'lucide-react'
import { formatPrice, countNights } from '@/lib/utils'
import AvailabilityCalendar from '@/components/accommodations/AvailabilityCalendar'
import type { Accommodation, SeasonalPricing } from '@/lib/types'
import { createAvailabilityRequest } from '@/actions/availability-requests'
import { validatePromoCode, type PromoValidationResult } from '@/actions/promo-codes'
import { toast } from 'react-hot-toast'

interface Props {
  accommodation: Accommodation
  unavailableDates: string[]
  seasonalPeriods?: SeasonalPricing[]
}

export default function BookingWidget({ accommodation, unavailableDates, seasonalPeriods = [] }: Props) {
  const [range, setRange] = useState<DateRange | undefined>()
  const [guests, setGuests] = useState(2)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [waText, setWaText] = useState('')
  const [loading, setLoading] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [promoInput, setPromoInput] = useState('')
  const [promoResult, setPromoResult] = useState<PromoValidationResult | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)

  const checkIn = range?.from ? format(range.from, 'yyyy-MM-dd') : ''
  const checkOut = range?.to ? format(range.to, 'yyyy-MM-dd') : ''
  const nights = checkIn && checkOut ? countNights(checkIn, checkOut) : 0

  const applicablePeriod = checkIn
    ? seasonalPeriods.find((p) => checkIn >= p.start_date && checkIn < p.end_date)
    : null
  const pricePerNight = applicablePeriod ? applicablePeriod.price_per_night : accommodation.price_per_night
  const subtotal = nights * pricePerNight
  const promoDiscount = promoResult?.valid ? promoResult.discount_amount : 0
  const totalAfterPromo = Math.max(0, subtotal - promoDiscount)

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return
    setPromoLoading(true)
    const result = await validatePromoCode(promoInput, subtotal)
    setPromoResult(result)
    setPromoLoading(false)
    if (!result.valid) toast.error(result.error)
  }

  const clearPromo = () => {
    setPromoInput('')
    setPromoResult(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast.error('Veuillez remplir les champs obligatoires')
      return
    }
    setLoading(true)

    // Build WhatsApp message immediately (shown regardless of Firebase result)
    const text =
      `Bonjour L&Lui Signature 👋\n\n` +
      `Je souhaite vérifier la disponibilité pour :\n` +
      `🏡 ${accommodation.name}\n` +
      `👤 ${firstName} ${lastName}\n` +
      `📞 ${phone}\n` +
      (checkIn && checkOut ? `📅 ${format(parseISO(checkIn), 'dd/MM/yyyy')} → ${format(parseISO(checkOut), 'dd/MM/yyyy')} (${nights} nuit${nights > 1 ? 's' : ''})\n` : '') +
      `👥 ${guests} voyageur${guests > 1 ? 's' : ''}\n` +
      (subtotal > 0 ? `💰 Estimation : ${new Intl.NumberFormat('fr-FR').format(subtotal)} FCFA\n` : '') +
      (promoResult?.valid ? `🏷️ Code promo : ${promoResult.code} (-${new Intl.NumberFormat('fr-FR').format(promoResult.discount_amount)} FCFA) → ${new Intl.NumberFormat('fr-FR').format(totalAfterPromo)} FCFA\n` : '') +
      (message ? `\n💬 ${message}` : '')

    // Show success screen right away
    setWaText(text)
    setLoading(false)

    // Save to Firebase in the background (non-blocking)
    createAvailabilityRequest({
      product_type: 'hebergement',
      product_id: accommodation.id,
      product_name: accommodation.name,
      guest_first_name: firstName,
      guest_last_name: lastName,
      guest_phone: phone,
      guest_email: email,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      message,
      ...(promoResult?.valid ? { promo_code: promoResult.code, promo_discount: promoResult.discount_amount } : {}),
    }).catch(() => {
      // Firebase failure is non-critical — the WhatsApp message carries all info
    })
  }

  if (waText) {
    return (
      <div className="bg-white rounded-2xl shadow-card-hover border border-beige-200 p-8 text-center space-y-5">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-green-600" />
        </div>
        <div>
          <h3 className="font-serif text-xl font-semibold text-dark mb-2">Demande enregistrée !</h3>
          <p className="text-dark/60 text-sm leading-relaxed">
            Pour que notre équipe soit notifiée immédiatement, envoyez votre demande via WhatsApp.
          </p>
        </div>
        <a
          href={`whatsapp://send?phone=237693407964&text=${encodeURIComponent(waText)}`}
          className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-2xl transition-colors"
        >
          <MessageCircle size={20} />
          Envoyer sur WhatsApp
        </a>
        <p className="text-xs text-dark/40">Aucun paiement demandé à ce stade.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-card-hover border border-beige-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-beige-200">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-3xl font-semibold text-dark">{formatPrice(accommodation.price_per_night)}</span>
          <span className="text-dark/50 text-sm">/nuit</span>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {!showForm ? (
          <>
            <div>
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="w-full flex items-center justify-between p-3.5 border-2 border-beige-200 rounded-xl hover:border-gold-400 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-sm">
                  <CalendarDays size={16} className="text-gold-500" />
                  {checkIn && checkOut ? (
                    <span className="text-dark font-medium">{format(parseISO(checkIn), 'dd/MM/yyyy')} → {format(parseISO(checkOut), 'dd/MM/yyyy')}</span>
                  ) : (
                    <span className="text-dark/50">Choisir des dates souhaitées</span>
                  )}
                </div>
                <ChevronDown size={16} className={`text-dark/40 transition-transform ${showCalendar ? 'rotate-180' : ''}`} />
              </button>
              {showCalendar && (
                <div className="mt-2 p-3 bg-beige-50 rounded-xl border border-beige-200 overflow-x-auto">
                  <AvailabilityCalendar unavailableDates={unavailableDates} selectedRange={range} onRangeSelect={setRange} />
                </div>
              )}
            </div>

            <div>
              <label className="label">Nombre de voyageurs</label>
              <div className="relative">
                <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold-500" />
                <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="input-field pl-10 appearance-none">
                  {Array.from({ length: accommodation.capacity }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n} voyageur{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/40 pointer-events-none" />
              </div>
            </div>

            {nights > 0 && (
              <div className="p-4 bg-beige-50 rounded-xl space-y-2 text-sm">
                {applicablePeriod && (
                  <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-xs">
                    <span className="text-amber-500">☀️</span> {applicablePeriod.label} — tarif spécial
                  </div>
                )}
                <div className="flex justify-between text-dark/70">
                  <span>{formatPrice(pricePerNight)} × {nights} nuit{nights > 1 ? 's' : ''}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {promoResult?.valid && (
                  <div className="flex justify-between text-green-700">
                    <span>Code promo ({promoResult.code})</span>
                    <span>-{formatPrice(promoResult.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-dark border-t border-beige-200 pt-2 mt-2">
                  <span>Estimation totale</span>
                  <span>{formatPrice(promoResult?.valid ? totalAfterPromo : subtotal)}</span>
                </div>
              </div>
            )}

            <button onClick={() => setShowForm(true)} className="w-full btn-primary py-4 text-base font-semibold flex items-center justify-center gap-2">
              <MessageCircle size={18} /> Demander la disponibilité
            </button>
            <p className="text-center text-xs text-dark/40">Confirmation par WhatsApp — aucun paiement immédiat</p>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle size={15} className="text-green-500" />
              <p className="font-semibold text-dark text-sm">Votre demande de disponibilité</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Prénom <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gold-500" />
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="input-field pl-7 text-sm" placeholder="Jean" />
                </div>
              </div>
              <div>
                <label className="label text-xs">Nom <span className="text-red-500">*</span></label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="input-field text-sm" placeholder="Dupont" />
              </div>
            </div>

            <div>
              <label className="label text-xs">Téléphone WhatsApp <span className="text-red-500">*</span></label>
              <div className="relative">
                <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gold-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="input-field pl-7 text-sm"
                  placeholder="237 6XX XXX XXX"
                />
              </div>
              <p className="mt-1 text-xs text-dark/50">
                Indicatif pays sans le <span className="font-semibold">+</span>, puis numéro sans le <span className="font-semibold">0</span> initial.
                Ex : <span className="font-mono font-medium">237 693 407 964</span>
              </p>
            </div>

            <div>
              <label className="label text-xs">Email</label>
              <div className="relative">
                <Mail size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gold-500" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field pl-7 text-sm" placeholder="contact@exemple.com" />
              </div>
            </div>

            {checkIn && checkOut && (
              <div className="p-3 bg-beige-50 rounded-xl border border-beige-200 text-xs text-dark/60">
                <p>📅 {format(parseISO(checkIn), 'dd/MM/yyyy')} → {format(parseISO(checkOut), 'dd/MM/yyyy')} · {nights} nuit{nights > 1 ? 's' : ''} · {guests} pers.</p>
                <p className="font-medium text-dark mt-0.5">Estimation : {formatPrice(subtotal)}</p>
              </div>
            )}

            <div>
              <label className="label text-xs">Message (optionnel)</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="input-field text-sm resize-none" placeholder="Précisez vos besoins, questions..." />
            </div>

            <div>
              <label className="label text-xs">Code promo (optionnel)</label>
              {promoResult?.valid ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-300 rounded-xl text-sm">
                  <Tag size={13} className="text-green-600 flex-shrink-0" />
                  <span className="flex-1 text-green-700 font-medium">{promoResult.code} — -{formatPrice(promoResult.discount_amount)}</span>
                  <button type="button" onClick={clearPromo} className="text-green-600 hover:text-green-800">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gold-500" />
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      className="input-field pl-7 text-sm uppercase"
                      placeholder="PROMO2024"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    className="px-3 py-2 text-xs font-semibold bg-dark text-white rounded-xl hover:bg-dark/80 transition-colors disabled:opacity-40 flex-shrink-0"
                  >
                    {promoLoading ? '...' : 'Appliquer'}
                  </button>
                </div>
              )}
              {promoResult && !promoResult.valid && (
                <p className="mt-1 text-xs text-red-500">{promoResult.error}</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />Envoi...
                </span>
              ) : <><Send size={15} /> Envoyer ma demande</>}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="w-full text-sm text-dark/50 hover:text-dark py-1 transition-colors">← Retour</button>
          </form>
        )}
      </div>

      {!showForm && (
        <div className="px-6 pb-5">
          <div className="flex gap-4 text-xs text-dark/50">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gold-500 inline-block" /> Disponible</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-beige-300 inline-block" /> Non disponible</span>
          </div>
        </div>
      )}
    </div>
  )
}
