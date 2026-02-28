export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { db } from '@/lib/firebase'
import { ChevronLeft, Building2, Users, BedDouble, Bath, MapPin } from 'lucide-react'
import { getTypeLabel, formatPrice } from '@/lib/utils'
import PackRequestForm from '@/components/packs/PackRequestForm'
import type { Pack, Accommodation } from '@/lib/types'

async function getPack(slug: string): Promise<Pack | null> {
  const snap = await db.collection('packs').where('slug', '==', slug).where('status', '==', 'active').limit(1).get()
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Pack
}

async function getAccommodations(ids: string[]): Promise<Accommodation[]> {
  if (!ids.length) return []
  const results: Accommodation[] = []
  for (const id of ids) {
    const doc = await db.collection('hebergements').doc(id).get()
    if (doc.exists) results.push({ id: doc.id, ...doc.data() } as Accommodation)
  }
  return results
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const pack = await getPack(slug)
  if (!pack) return { title: 'Pack introuvable' }
  return { title: `${pack.name} – L&Lui Signature`, description: pack.short_description }
}

const PACK_LABEL: Record<string, string> = {
  f3: 'Pack F3',
  vip: 'Pack VIP',
  signature: 'Pack Signature',
}

export default async function PackDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const pack = await getPack(slug)
  if (!pack) notFound()

  const accommodations = await getAccommodations(pack.accommodation_ids || [])
  const fallback = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'

  return (
    <div className="pt-20">
      {/* Hero image */}
      <div className="relative h-[50vh] min-h-[320px] overflow-hidden">
        <Image
          src={pack.images?.[0] || fallback}
          alt={pack.name}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dark/30 via-dark/20 to-dark/60" />
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 lg:px-8 pb-8 max-w-7xl mx-auto">
          <Link href="/packs" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            <ChevronLeft size={16} /> Retour aux packs
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full border border-white/30">
              {PACK_LABEL[pack.pack_type] || pack.pack_type}
            </span>
            <span className="flex items-center gap-1.5 text-white/80 text-xs">
              <Building2 size={12} />
              {accommodations.length} logement{accommodations.length > 1 ? 's' : ''}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white">{pack.name}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: description + accommodations */}
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-dark mb-4">À propos de ce pack</h2>
              <div className="gold-divider mb-4" />
              <p className="text-dark/70 leading-relaxed text-[15px] whitespace-pre-line">
                {pack.description || pack.short_description}
              </p>
            </div>

            {/* Gallery (if more images) */}
            {pack.images && pack.images.length > 1 && (
              <div>
                <h2 className="font-serif text-2xl font-semibold text-dark mb-4">Photos</h2>
                <div className="gold-divider mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {pack.images.slice(1).map((img, i) => (
                    <div key={i} className="relative aspect-video rounded-xl overflow-hidden">
                      <Image src={img} alt={`${pack.name} ${i + 2}`} fill className="object-cover hover:scale-105 transition-transform duration-300" sizes="200px" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Included accommodations */}
            <div>
              <h2 className="font-serif text-2xl font-semibold text-dark mb-4">
                Logements inclus
              </h2>
              <div className="gold-divider mb-6" />
              {accommodations.length === 0 ? (
                <p className="text-dark/50">Aucun logement trouvé.</p>
              ) : (
                <div className="space-y-4">
                  {accommodations.map((acc) => (
                    <div key={acc.id} className="flex gap-4 p-4 bg-white rounded-2xl border border-beige-200 hover:shadow-card transition-shadow">
                      <div className="relative w-24 h-20 rounded-xl overflow-hidden flex-shrink-0">
                        <Image
                          src={acc.images?.[0] || fallback}
                          alt={acc.name}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 bg-beige-100 rounded-full text-dark/60">{getTypeLabel(acc.type)}</span>
                        </div>
                        <h3 className="font-semibold text-dark text-sm mb-1 truncate">{acc.name}</h3>
                        {acc.location && (
                          <p className="text-xs text-dark/50 flex items-center gap-1 mb-2">
                            <MapPin size={10} />{acc.location}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-dark/50">
                          <span className="flex items-center gap-1"><Users size={10} className="text-gold-500" />{acc.capacity} pers.</span>
                          <span className="flex items-center gap-1"><BedDouble size={10} className="text-gold-500" />{acc.bedrooms} ch.</span>
                          <span className="flex items-center gap-1"><Bath size={10} className="text-gold-500" />{acc.bathrooms} sdb.</span>
                          <span className="font-semibold text-dark ml-auto">{formatPrice(acc.price_per_night)}<span className="font-normal text-dark/40">/nuit</span></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: contact form */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <PackRequestForm packName={pack.name} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
