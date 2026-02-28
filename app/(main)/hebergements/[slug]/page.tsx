import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { db } from '@/lib/firebase'
import { Users, BedDouble, Bath, MapPin, Check, ChevronLeft, Star, Building2 } from 'lucide-react'
import { formatPrice, getTypeLabel } from '@/lib/utils'
import BookingWidget from '@/components/reservations/BookingWidget'

async function getAccommodation(slug: string) {
  const snap = await db.collection('hebergements').where('slug', '==', slug).where('status', '==', 'active').limit(1).get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...doc.data() } as any
}

async function getUnavailableDates(accommodationId: string): Promise<string[]> {
  const today = new Date().toISOString().split('T')[0]

  const blockedSnap = await db.collection('disponibilites')
    .where('accommodation_id', '==', accommodationId)
    .get()
  const unavailable = new Set<string>(blockedSnap.docs.map((d) => d.data().date as string))

  const resSnap = await db.collection('reservations')
    .where('accommodation_id', '==', accommodationId)
    .where('reservation_status', '==', 'confirmee')
    .get()

  resSnap.docs.forEach((d) => {
    const { check_in, check_out } = d.data()
    for (let date = new Date(check_in); date < new Date(check_out); date.setDate(date.getDate() + 1)) {
      unavailable.add(date.toISOString().split('T')[0])
    }
  })

  return Array.from(unavailable).filter((d) => d >= today)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const acc = await getAccommodation(slug)
  if (!acc) return { title: 'Hébergement non trouvé' }
  return { title: acc.name, description: acc.short_description }
}

export default async function AccommodationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const accommodation = await getAccommodation(slug)
  if (!accommodation) notFound()

  const unavailableDates = await getUnavailableDates(accommodation.id)
  const acc = accommodation

  return (
    <div className="pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark transition-colors mb-6">
          <ChevronLeft size={16} /> Retour aux hébergements
        </Link>
        <div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-2xl overflow-hidden h-[400px] sm:h-[500px]">
          {(acc.images?.length ? acc.images : ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800']).slice(0, 5).map((img: string, i: number) => (
            <div key={i} className={`relative overflow-hidden ${i === 0 ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'}`}>
              <Image src={img} alt={`${acc.name} - photo ${i + 1}`} fill className="object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" sizes="(max-width: 768px) 50vw, 25vw" />
              {i === 4 && acc.images.length > 5 && (
                <div className="absolute inset-0 bg-dark/50 flex items-center justify-center">
                  <span className="text-white font-medium text-sm">+{acc.images.length - 5} photos</span>
                </div>
              )}
            </div>
          ))}
          {(acc.images || []).length < 5 && Array.from({ length: 5 - (acc.images?.length || 0) }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-beige-200" />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-gold-50 border border-gold-200 text-gold-700 text-xs font-medium rounded-full">{getTypeLabel(acc.type)}</span>
                {acc.featured && (
                  <span className="flex items-center gap-1 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium rounded-full">
                    <Star size={10} fill="currentColor" /> Coup de cœur
                  </span>
                )}
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-dark mb-3">{acc.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-dark/50 text-sm">
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-gold-500" />{acc.location}</span>
                <span className="flex items-center gap-1.5"><Building2 size={14} className="text-gold-500" />{acc.partner?.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 p-5 bg-beige-50 rounded-2xl mb-8 border border-beige-200">
              <div className="text-center"><Users size={20} className="text-gold-500 mx-auto mb-1.5" /><p className="font-semibold text-dark text-base">{acc.capacity} pers.</p><p className="text-dark/50 text-xs">Capacité max.</p></div>
              <div className="text-center"><BedDouble size={20} className="text-gold-500 mx-auto mb-1.5" /><p className="font-semibold text-dark text-base">{acc.bedrooms} ch.</p><p className="text-dark/50 text-xs">Chambre{acc.bedrooms > 1 ? 's' : ''}</p></div>
              <div className="text-center"><Bath size={20} className="text-gold-500 mx-auto mb-1.5" /><p className="font-semibold text-dark text-base">{acc.bathrooms} sdb.</p><p className="text-dark/50 text-xs">Salle{acc.bathrooms > 1 ? 's' : ''} de bain</p></div>
            </div>

            <div className="mb-8">
              <h2 className="font-serif text-2xl font-semibold text-dark mb-4">À propos de ce logement</h2>
              <div className="gold-divider mb-4" />
              <p className="text-dark/70 leading-relaxed text-[15px] whitespace-pre-line">{acc.description}</p>
            </div>

            {(acc.amenities || []).length > 0 && (
              <div className="mb-8">
                <h2 className="font-serif text-2xl font-semibold text-dark mb-4">Équipements & services</h2>
                <div className="gold-divider mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {acc.amenities.map((amenity: string) => (
                    <div key={amenity} className="flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-xl border border-beige-200 text-sm text-dark/70">
                      <Check size={14} className="text-gold-500 flex-shrink-0" />{amenity}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-6 bg-beige-50 rounded-2xl border border-beige-200">
              <h3 className="font-serif text-lg font-semibold text-dark mb-2">Proposé par</h3>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0"><Building2 size={20} className="text-gold-600" /></div>
                <div>
                  <p className="font-semibold text-dark">{acc.partner?.name}</p>
                  <p className="text-dark/60 text-sm mt-1">{acc.partner?.description}</p>
                  {acc.partner?.address && <p className="text-dark/40 text-xs mt-1 flex items-center gap-1"><MapPin size={11} />{acc.partner.address}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <BookingWidget accommodation={acc} unavailableDates={unavailableDates} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
