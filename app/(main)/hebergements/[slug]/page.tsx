import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Users, BedDouble, Bath, MapPin, Check, ChevronLeft, Star, Building2
} from 'lucide-react'
import { formatPrice, getTypeLabel } from '@/lib/utils'
import BookingWidget from '@/components/reservations/BookingWidget'
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

async function getUnavailableDates(accommodationId: string): Promise<string[]> {
  const supabase = await createClient()

  // Dates explicitement bloquées
  const { data: blocked } = await supabase
    .from('availability')
    .select('date')
    .eq('accommodation_id', accommodationId)
    .eq('is_available', false)
    .gte('date', new Date().toISOString().split('T')[0])

  // Dates issues de réservations confirmées
  const { data: reservations } = await supabase
    .from('reservations')
    .select('check_in, check_out')
    .eq('accommodation_id', accommodationId)
    .eq('reservation_status', 'confirmee')
    .gte('check_out', new Date().toISOString().split('T')[0])

  const unavailable = new Set<string>()

  blocked?.forEach(({ date }) => unavailable.add(date))

  reservations?.forEach(({ check_in, check_out }) => {
    const start = new Date(check_in)
    const end = new Date(check_out)
    const current = new Date(start)
    while (current < end) {
      unavailable.add(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }
  })

  return Array.from(unavailable)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const acc = await getAccommodation(slug)
  if (!acc) return { title: 'Hébergement non trouvé' }
  return {
    title: acc.name,
    description: acc.short_description,
  }
}

export default async function AccommodationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [accommodation, unavailableDates] = await Promise.all([
    getAccommodation(slug),
    getAccommodation(slug).then((acc) =>
      acc ? getUnavailableDates(acc.id) : []
    ),
  ])

  if (!accommodation) notFound()

  const acc = accommodation

  return (
    <div className="pt-20">
      {/* ============================================
          IMAGE GALLERY
      ============================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark transition-colors mb-6"
        >
          <ChevronLeft size={16} />
          Retour aux hébergements
        </Link>

        {/* Gallery grid */}
        <div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-2xl overflow-hidden h-[400px] sm:h-[500px]">
          {acc.images.slice(0, 5).map((img, i) => (
            <div
              key={i}
              className={`relative overflow-hidden ${
                i === 0 ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'
              }`}
            >
              <Image
                src={img}
                alt={`${acc.name} - photo ${i + 1}`}
                fill
                className="object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              {i === 4 && acc.images.length > 5 && (
                <div className="absolute inset-0 bg-dark/50 flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    +{acc.images.length - 5} photos
                  </span>
                </div>
              )}
            </div>
          ))}
          {/* Fill missing spots */}
          {acc.images.length < 5 &&
            Array.from({ length: 5 - acc.images.length }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-beige-200" />
            ))}
        </div>
      </div>

      {/* ============================================
          CONTENT + BOOKING WIDGET
      ============================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* LEFT: Détails */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-gold-50 border border-gold-200 text-gold-700 text-xs font-medium rounded-full">
                  {getTypeLabel(acc.type)}
                </span>
                {acc.featured && (
                  <span className="flex items-center gap-1 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium rounded-full">
                    <Star size={10} fill="currentColor" />
                    Coup de cœur
                  </span>
                )}
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-dark mb-3">
                {acc.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-dark/50 text-sm">
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-gold-500" />
                  {acc.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 size={14} className="text-gold-500" />
                  {(acc.partner as any)?.name}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 p-5 bg-beige-50 rounded-2xl mb-8 border border-beige-200">
              <StatBox
                icon={Users}
                value={`${acc.capacity} pers.`}
                label="Capacité max."
              />
              <StatBox
                icon={BedDouble}
                value={`${acc.bedrooms} ch.`}
                label={`Chambre${acc.bedrooms > 1 ? 's' : ''}`}
              />
              <StatBox
                icon={Bath}
                value={`${acc.bathrooms} sdb.`}
                label={`Salle${acc.bathrooms > 1 ? 's' : ''} de bain`}
              />
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="font-serif text-2xl font-semibold text-dark mb-4">
                À propos de ce logement
              </h2>
              <div className="gold-divider mb-4" />
              <p className="text-dark/70 leading-relaxed text-[15px] whitespace-pre-line">
                {acc.description}
              </p>
            </div>

            {/* Équipements */}
            {acc.amenities.length > 0 && (
              <div className="mb-8">
                <h2 className="font-serif text-2xl font-semibold text-dark mb-4">
                  Équipements & services
                </h2>
                <div className="gold-divider mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {acc.amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-xl border border-beige-200 text-sm text-dark/70"
                    >
                      <Check size={14} className="text-gold-500 flex-shrink-0" />
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Partner info */}
            <div className="p-6 bg-beige-50 rounded-2xl border border-beige-200">
              <h3 className="font-serif text-lg font-semibold text-dark mb-2">
                Proposé par
              </h3>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={20} className="text-gold-600" />
                </div>
                <div>
                  <p className="font-semibold text-dark">{(acc.partner as any)?.name}</p>
                  <p className="text-dark/60 text-sm mt-1">{(acc.partner as any)?.description}</p>
                  {(acc.partner as any)?.address && (
                    <p className="text-dark/40 text-xs mt-1 flex items-center gap-1">
                      <MapPin size={11} />
                      {(acc.partner as any).address}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Booking Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <BookingWidget
                accommodation={acc}
                unavailableDates={unavailableDates}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType
  value: string
  label: string
}) {
  return (
    <div className="text-center">
      <Icon size={20} className="text-gold-500 mx-auto mb-1.5" />
      <p className="font-semibold text-dark text-base">{value}</p>
      <p className="text-dark/50 text-xs">{label}</p>
    </div>
  )
}
