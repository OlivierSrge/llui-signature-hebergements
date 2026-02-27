'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, differenceInDays, parseISO } from 'date-fns'
import { type DateRange } from 'react-day-picker'
import { CalendarDays, Users, ChevronDown } from 'lucide-react'
import { formatPrice, countNights } from '@/lib/utils'
import AvailabilityCalendar from '@/components/accommodations/AvailabilityCalendar'
import type { Accommodation } from '@/lib/types'

interface Props {
  accommodation: Accommodation
  unavailableDates: string[]
}

export default function BookingWidget({ accommodation, unavailableDates }: Props) {
  const router = useRouter()
  const [range, setRange] = useState<DateRange | undefined>()
  const [guests, setGuests] = useState(2)
  const [showCalendar, setShowCalendar] = useState(false)

  const checkIn = range?.from ? format(range.from, 'yyyy-MM-dd') : ''
  const checkOut = range?.to ? format(range.to, 'yyyy-MM-dd') : ''
  const nights = checkIn && checkOut ? countNights(checkIn, checkOut) : 0
  const subtotal = nights * accommodation.price_per_night

  const handleReserve = () => {
    if (!checkIn || !checkOut) {
      setShowCalendar(true)
      return
    }
    const params = new URLSearchParams({
      check_in: checkIn,
      check_out: checkOut,
      guests: String(guests),
    })
    router.push(`/reservation/${accommodation.slug}?${params.toString()}`)
  }

  return (
    <div className="bg-white rounded-2xl shadow-card-hover border border-beige-200 overflow-hidden">
      {/* Price header */}
      <div className="px-6 py-5 border-b border-beige-200">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-3xl font-semibold text-dark">
            {formatPrice(accommodation.price_per_night)}
          </span>
          <span className="text-dark/50 text-sm">/nuit</span>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Dates */}
        <div>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="w-full flex items-center justify-between p-3.5 border-2 border-beige-200 rounded-xl hover:border-gold-400 transition-colors group"
          >
            <div className="flex items-center gap-2.5 text-sm">
              <CalendarDays size={16} className="text-gold-500" />
              {checkIn && checkOut ? (
                <span className="text-dark font-medium">
                  {format(parseISO(checkIn), 'dd/MM/yyyy')} → {format(parseISO(checkOut), 'dd/MM/yyyy')}
                </span>
              ) : (
                <span className="text-dark/50">Choisir les dates</span>
              )}
            </div>
            <ChevronDown
              size={16}
              className={`text-dark/40 transition-transform ${showCalendar ? 'rotate-180' : ''}`}
            />
          </button>

          {showCalendar && (
            <div className="mt-2 p-3 bg-beige-50 rounded-xl border border-beige-200 overflow-x-auto animate-slide-up">
              <AvailabilityCalendar
                unavailableDates={unavailableDates}
                selectedRange={range}
                onRangeSelect={setRange}
              />
            </div>
          )}
        </div>

        {/* Guests */}
        <div>
          <label className="label">Nombre de voyageurs</label>
          <div className="relative">
            <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold-500" />
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="input-field pl-10 appearance-none"
            >
              {Array.from({ length: accommodation.capacity }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} voyageur{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/40 pointer-events-none" />
          </div>
        </div>

        {/* Price breakdown */}
        {nights > 0 && (
          <div className="p-4 bg-beige-50 rounded-xl space-y-2 text-sm animate-slide-up">
            <div className="flex justify-between text-dark/70">
              <span>{formatPrice(accommodation.price_per_night)} × {nights} nuit{nights > 1 ? 's' : ''}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between font-semibold text-dark border-t border-beige-200 pt-2 mt-2">
              <span>Total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleReserve}
          className="w-full btn-primary py-4 text-base font-semibold"
        >
          {nights > 0 ? 'Réserver maintenant' : 'Vérifier les disponibilités'}
        </button>

        <p className="text-center text-xs text-dark/40">
          Aucun montant débité avant confirmation
        </p>
      </div>

      {/* Legend */}
      <div className="px-6 pb-5">
        <div className="flex gap-4 text-xs text-dark/50">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gold-500 inline-block" />
            Disponible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-beige-300 inline-block line-through" />
            Non disponible
          </span>
        </div>
      </div>
    </div>
  )
}
