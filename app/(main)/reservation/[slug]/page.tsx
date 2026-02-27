import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReservationForm from '@/components/reservations/ReservationForm'
import { formatPrice, formatDate, countNights, getTypeLabel } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, MapPin, Users, Moon } from 'lucide-react'
import type { Accommodation } from '@/lib/types'

async function getAccommodation(slug: string): Promise<Accommodation | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('accommodations')
    .select('*, partner:partners(*)')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()
  return data
}

export const metadata = { title: 'Réservation' }

export default async function ReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ check_in?: string; check_out?: string; guests?: string }>
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  const accommodation = await getAccommodation(slug)

  if (!accommodation) notFound()

  const checkIn = sp.check_in || ''
  const checkOut = sp.check_out || ''
  const guests = sp.guests ? Number(sp.guests) : 2
  const nights = checkIn && checkOut ? countNights(checkIn, checkOut) : 0
  const subtotal = nights * accommodation.price_per_night

  return (
    <div className="pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Link
          href={`/hebergements/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark transition-colors mb-8"
        >
          <ChevronLeft size={16} />
          Retour au logement
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* LEFT: Récapitulatif */}
          <div className="order-2 lg:order-1">
            <h1 className="font-serif text-3xl font-semibold text-dark mb-8">
              Votre réservation
            </h1>

            {/* Accommodation summary */}
            <div className="card mb-6 flex flex-row gap-4 p-4">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src={accommodation.images[0]}
                  alt={accommodation.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gold-600 font-medium mb-0.5">
                  {getTypeLabel(accommodation.type)}
                </p>
                <h3 className="font-serif text-base font-semibold text-dark line-clamp-1">
                  {accommodation.name}
                </h3>
                <p className="text-xs text-dark/50 flex items-center gap-1 mt-1">
                  <MapPin size={11} />
                  {accommodation.location}
                </p>
              </div>
            </div>

            {/* Dates & summary */}
            {nights > 0 ? (
              <div className="bg-beige-50 border border-beige-200 rounded-2xl p-6 mb-6 space-y-4">
                <h3 className="font-semibold text-dark">Récapitulatif du séjour</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-beige-200">
                    <p className="text-xs text-dark/50 mb-1">Arrivée</p>
                    <p className="font-semibold text-dark text-sm">{formatDate(checkIn)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-beige-200">
                    <p className="text-xs text-dark/50 mb-1">Départ</p>
                    <p className="font-semibold text-dark text-sm">{formatDate(checkOut)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-dark/70">
                  <span className="flex items-center gap-1.5">
                    <Users size={14} className="text-gold-500" />
                    {guests} voyageur{guests > 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Moon size={14} className="text-gold-500" />
                    {nights} nuit{nights > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="border-t border-beige-200 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-dark/70">
                    <span>{formatPrice(accommodation.price_per_night)} × {nights} nuit{nights > 1 ? 's' : ''}</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-dark text-base border-t border-beige-200 pt-2">
                    <span>Total à payer</span>
                    <span className="text-gold-600">{formatPrice(subtotal)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
                ⚠️ Aucune date sélectionnée. Retournez sur la page du logement pour choisir vos dates.
              </div>
            )}

            {/* Payment info */}
            <div className="bg-gold-50 border border-gold-200 rounded-xl p-4 text-sm text-dark/70">
              <p className="font-medium text-dark mb-1">💳 Comment ça marche ?</p>
              <p>Après soumission, votre demande sera examinée par notre équipe. Vous recevrez un email de confirmation avec les instructions de paiement selon le mode choisi.</p>
            </div>
          </div>

          {/* RIGHT: Form */}
          <div className="order-1 lg:order-2">
            <ReservationForm
              accommodationId={accommodation.id}
              accommodationSlug={slug}
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
              nights={nights}
              totalPrice={subtotal}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
