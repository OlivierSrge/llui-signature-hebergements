export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { db } from '@/lib/firebase'
import { Users, BedDouble, MapPin, Building2 } from 'lucide-react'
import { formatPrice, resolveImageUrl } from '@/lib/utils'
import AccommodationTypeBadge from '@/components/AccommodationTypeBadge'

async function getPartnerWithAccommodations(partnerSlug: string) {
  const doc = await db.collection('partenaires').doc(partnerSlug).get()
  if (!doc.exists) return null
  const partner = { id: doc.id, ...doc.data() } as any

  const snap = await db
    .collection('hebergements')
    .where('partner_id', '==', partner.id)
    .where('status', '==', 'active')
    .get()

  const seen = new Set<string>()
  const accommodations = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((a: any) => {
      if (seen.has(a.name)) return false
      seen.add(a.name)
      return true
    }) as any[]

  return { partner, accommodations }
}

export async function generateMetadata({ params }: { params: Promise<{ partnerSlug: string }> }) {
  const { partnerSlug } = await params
  const data = await getPartnerWithAccommodations(partnerSlug)
  if (!data) return { title: 'Partenaire introuvable' }
  return {
    title: data.partner.name,
    description: data.partner.description ?? `Logements proposés par ${data.partner.name}`,
  }
}

export default async function PartnerMiniSitePage({
  params,
}: {
  params: Promise<{ partnerSlug: string }>
}) {
  const { partnerSlug } = await params
  const data = await getPartnerWithAccommodations(partnerSlug)
  if (!data) notFound()

  const { partner, accommodations } = data

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F0E8', color: '#1A1A1A' }}>
      {/* Header partenaire */}
      <header className="bg-white border-b-2 border-[#C9A84C] px-4 py-6">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-3 text-center">
          {partner.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveImageUrl(partner.logo_url)}
              alt={partner.name}
              className="h-16 w-auto object-contain"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#C9A84C]/20 flex items-center justify-center">
              <Building2 size={28} className="text-[#C9A84C]" />
            </div>
          )}
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[#1A1A1A]">{partner.name}</h1>
            {partner.description && (
              <p className="text-sm text-[#1A1A1A]/60 mt-1 max-w-md">{partner.description}</p>
            )}
            {partner.address && (
              <p className="text-xs text-[#1A1A1A]/40 mt-1 flex items-center justify-center gap-1">
                <MapPin size={11} /> {partner.address}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Liste logements */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-5">
        {accommodations.length === 0 ? (
          <div className="text-center py-16 text-[#1A1A1A]/40">
            <Building2 size={36} className="mx-auto mb-3 opacity-30" />
            <p>Aucun logement disponible pour le moment.</p>
          </div>
        ) : (
          accommodations.map((acc: any) => {
            const thumb = acc.images?.[0]
              ? resolveImageUrl(acc.images[0])
              : 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600'
            return (
              <div
                key={acc.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#C9A84C]/20"
              >
                {/* Photo */}
                <div className="relative h-48 w-full">
                  <Image
                    src={thumb}
                    alt={acc.name}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 640px"
                  />
                  {acc.type && (
                    <span className="absolute top-3 left-3 bg-white/90 text-[#1A1A1A] text-xs font-medium px-2.5 py-1 rounded-full border border-[#C9A84C]/30">
                      <AccommodationTypeBadge typeId={acc.type} variant="compact" />
                    </span>
                  )}
                </div>

                {/* Infos */}
                <div className="p-4">
                  <h2 className="font-serif text-lg font-semibold text-[#1A1A1A] leading-snug mb-1">
                    {acc.name}
                  </h2>
                  {acc.location && (
                    <p className="text-xs text-[#1A1A1A]/50 flex items-center gap-1 mb-3">
                      <MapPin size={11} /> {acc.location}
                    </p>
                  )}

                  {/* Capacités */}
                  <div className="flex flex-wrap gap-3 text-xs text-[#1A1A1A]/60 mb-4">
                    {acc.capacity && (
                      <span className="flex items-center gap-1">
                        <Users size={12} className="text-[#C9A84C]" /> {acc.capacity} pers. max.
                      </span>
                    )}
                    {acc.bedrooms && (
                      <span className="flex items-center gap-1">
                        <BedDouble size={12} className="text-[#C9A84C]" /> {acc.bedrooms} chambre{acc.bedrooms > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Prix + CTA */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <span className="text-xl font-bold text-[#1A1A1A]">
                        {formatPrice(acc.price_per_night)}
                      </span>
                      <span className="text-xs text-[#1A1A1A]/50 ml-1">/nuit</span>
                    </div>
                    <Link
                      href={`/chambre/${acc.slug}`}
                      className="flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ background: '#C9A84C' }}
                    >
                      Demander la disponibilité
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </main>

      {/* Footer minimal */}
      <footer className="border-t border-[#C9A84C]/20 py-5 text-center">
        <p className="text-xs text-[#1A1A1A]/40">Propulsé par L&amp;Lui Signature</p>
      </footer>
    </div>
  )
}
