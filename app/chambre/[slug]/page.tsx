export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Image from 'next/image'
import { db } from '@/lib/firebase'
import { Users, BedDouble, Bath, MapPin } from 'lucide-react'
import { formatPrice, getTypeLabel, resolveImageUrl } from '@/lib/utils'
import BookingWidget from '@/components/reservations/BookingWidget'
import { getSeasonalPricing } from '@/actions/seasonal-pricing'
import AmenitiesSection from '@/components/accommodations/AmenitiesSection'
import { trackPageView } from '@/actions/stats'

async function getAccommodation(slug: string) {
  const snap = await db
    .collection('hebergements')
    .where('slug', '==', slug)
    .where('status', '==', 'active')
    .limit(1)
    .get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...doc.data() } as any
}

async function getUnavailableDates(accommodationId: string): Promise<string[]> {
  const today = new Date().toISOString().split('T')[0]

  const blockedSnap = await db
    .collection('disponibilites')
    .where('accommodation_id', '==', accommodationId)
    .get()
  const unavailable = new Set<string>(blockedSnap.docs.map((d) => d.data().date as string))

  const resSnap = await db
    .collection('reservations')
    .where('accommodation_id', '==', accommodationId)
    .where('reservation_status', '==', 'confirmee')
    .get()

  resSnap.docs.forEach((d) => {
    const { check_in, check_out } = d.data()
    for (
      let date = new Date(check_in);
      date < new Date(check_out);
      date.setDate(date.getDate() + 1)
    ) {
      unavailable.add(date.toISOString().split('T')[0])
    }
  })

  return Array.from(unavailable).filter((d) => d >= today)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const acc = await getAccommodation(slug)
  if (!acc) return { title: 'Logement introuvable' }
  return { title: acc.name, description: acc.short_description }
}

export default async function ChambrePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const accommodation = await getAccommodation(slug)
  if (!accommodation) notFound()

  const [unavailableDates, seasonalPeriods] = await Promise.all([
    getUnavailableDates(accommodation.id),
    getSeasonalPricing(accommodation.id),
    trackPageView(accommodation.id),
  ])

  const acc = accommodation
  const images: string[] = acc.images?.length
    ? acc.images
    : ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800']

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F0E8', color: '#1A1A1A' }}>
      {/* Galerie photos */}
      <div className="w-full">
        {images.length === 1 ? (
          <div className="relative h-64 sm:h-80 w-full">
            <Image
              src={resolveImageUrl(images[0])}
              alt={acc.name}
              fill
              unoptimized
              className="object-cover"
              sizes="100vw"
              priority
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1 h-64 sm:h-80">
            <div className="relative col-span-1 row-span-1">
              <Image
                src={resolveImageUrl(images[0])}
                alt={`${acc.name} - 1`}
                fill
                unoptimized
                className="object-cover"
                sizes="50vw"
                priority
              />
            </div>
            <div className="grid grid-rows-2 gap-1">
              {images.slice(1, 3).map((img: string, i: number) => (
                <div key={i} className="relative">
                  <Image
                    src={resolveImageUrl(img)}
                    alt={`${acc.name} - ${i + 2}`}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="25vw"
                  />
                  {i === 1 && images.length > 3 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">+{images.length - 3} photos</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Titre + localisation */}
        <div>
          {acc.type && (
            <span
              className="inline-block text-xs font-medium px-2.5 py-1 rounded-full border mb-2"
              style={{ background: '#C9A84C15', borderColor: '#C9A84C50', color: '#9A7A30' }}
            >
              {getTypeLabel(acc.type)}
            </span>
          )}
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1A1A1A] leading-snug">
            {acc.name}
          </h1>
          {acc.location && (
            <p className="flex items-center gap-1.5 text-sm text-[#1A1A1A]/50 mt-1.5">
              <MapPin size={13} style={{ color: '#C9A84C' }} /> {acc.location}
            </p>
          )}
        </div>

        {/* Caractéristiques */}
        <div
          className="grid grid-cols-3 gap-3 p-4 rounded-2xl border"
          style={{ background: 'white', borderColor: '#C9A84C30' }}
        >
          {acc.capacity && (
            <div className="text-center">
              <Users size={18} style={{ color: '#C9A84C' }} className="mx-auto mb-1" />
              <p className="font-semibold text-[#1A1A1A] text-sm">{acc.capacity} pers.</p>
              <p className="text-[10px] text-[#1A1A1A]/40">Capacité</p>
            </div>
          )}
          {acc.bedrooms && (
            <div className="text-center">
              <BedDouble size={18} style={{ color: '#C9A84C' }} className="mx-auto mb-1" />
              <p className="font-semibold text-[#1A1A1A] text-sm">{acc.bedrooms} ch.</p>
              <p className="text-[10px] text-[#1A1A1A]/40">Chambre{acc.bedrooms > 1 ? 's' : ''}</p>
            </div>
          )}
          {acc.bathrooms && (
            <div className="text-center">
              <Bath size={18} style={{ color: '#C9A84C' }} className="mx-auto mb-1" />
              <p className="font-semibold text-[#1A1A1A] text-sm">{acc.bathrooms} sdb.</p>
              <p className="text-[10px] text-[#1A1A1A]/40">Salle{acc.bathrooms > 1 ? 's' : ''} de bain</p>
            </div>
          )}
        </div>

        {/* Description */}
        {acc.description && (
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#1A1A1A] mb-2">À propos</h2>
            <div className="h-px mb-3" style={{ background: '#C9A84C' }} />
            <p className="text-[#1A1A1A]/70 leading-relaxed text-[15px] whitespace-pre-line">
              {acc.description}
            </p>
          </div>
        )}

        {/* Équipements */}
        {(acc.amenities || []).length > 0 && <AmenitiesSection amenities={acc.amenities} />}

        {/* Prix */}
        <div
          className="flex items-center justify-between p-4 rounded-2xl border"
          style={{ background: 'white', borderColor: '#C9A84C30' }}
        >
          <span className="text-[#1A1A1A]/60 text-sm">Prix par nuit</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-[#1A1A1A]">
              {formatPrice(acc.price_per_night)}
            </span>
            <span className="text-xs text-[#1A1A1A]/50 ml-1">/nuit</span>
          </div>
        </div>

        {/* Widget demande */}
        <BookingWidget
          accommodation={acc}
          unavailableDates={unavailableDates}
          seasonalPeriods={seasonalPeriods}
        />
      </main>

      {/* Footer minimal */}
      <footer className="border-t py-5 text-center mt-4" style={{ borderColor: '#C9A84C30' }}>
        <p className="text-xs" style={{ color: '#1A1A1A40' }}>Propulsé par L&amp;Lui Signature</p>
      </footer>
    </div>
  )
}
