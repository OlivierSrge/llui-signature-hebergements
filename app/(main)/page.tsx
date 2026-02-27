import { Suspense } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import AccommodationCard from '@/components/accommodations/AccommodationCard'
import AccommodationFilters from '@/components/accommodations/AccommodationFilters'
import type { Accommodation, AccommodationFilters as Filters } from '@/lib/types'
import { Award, Shield, HeartHandshake } from 'lucide-react'

interface SearchParams {
  type?: string
  check_in?: string
  check_out?: string
  capacity?: string
  min_price?: string
  max_price?: string
}

async function getAccommodations(filters: Filters): Promise<Accommodation[]> {
  const supabase = await createClient()

  let query = supabase
    .from('accommodations')
    .select('*, partner:partners(*)')
    .eq('status', 'active')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.type) query = query.eq('type', filters.type)
  if (filters.capacity) query = query.gte('capacity', filters.capacity)
  if (filters.min_price) query = query.gte('price_per_night', filters.min_price)
  if (filters.max_price) query = query.lte('price_per_night', filters.max_price)

  const { data } = await query
  return data || []
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const filters: Filters = {
    type: (sp.type as Filters['type']) || '',
    check_in: sp.check_in,
    check_out: sp.check_out,
    capacity: sp.capacity ? Number(sp.capacity) : undefined,
    min_price: sp.min_price ? Number(sp.min_price) : undefined,
    max_price: sp.max_price ? Number(sp.max_price) : undefined,
  }

  const accommodations = await getAccommodations(filters)

  return (
    <div>
      {/* ============================================
          HERO
      ============================================ */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1920"
          alt="Kribi plage tropicale"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dark/50 via-dark/30 to-dark/60" />

        <div className="relative z-10 text-center text-white px-4 sm:px-6 max-w-4xl mx-auto animate-fade-in">
          <p className="text-gold-300 text-sm font-medium tracking-[0.2em] uppercase mb-4">
            Hébergements d&apos;exception à Kribi
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-semibold leading-tight mb-6">
            Votre séjour de rêve<br />
            <em className="text-gold-300">vous attend</em>
          </h1>
          <p className="text-white/80 text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            L&amp;Lui Signature sélectionne pour vous les plus belles adresses
            autour de Kribi — villas, appartements et chambres de prestige au cœur du Cameroun.
          </p>
          <a
            href="#hebergements"
            className="btn-primary text-base px-8 py-4 inline-flex"
          >
            Découvrir les hébergements
          </a>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 animate-bounce">
          <div className="w-0.5 h-8 bg-white/30 rounded-full" />
        </div>
      </section>

      {/* ============================================
          VALEURS
      ============================================ */}
      <section className="bg-beige-100 py-14 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            {
              icon: Award,
              title: 'Sélection premium',
              desc: 'Chaque hébergement est rigoureusement sélectionné par notre équipe pour son excellence.',
            },
            {
              icon: Shield,
              title: 'Réservation sécurisée',
              desc: 'Vos données et paiements sont protégés. Réservez l\'esprit tranquille.',
            },
            {
              icon: HeartHandshake,
              title: 'Service personnalisé',
              desc: 'Notre équipe L&Lui vous accompagne de la réservation jusqu\'au check-out.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-gold-500 flex items-center justify-center mb-4">
                <Icon size={22} className="text-white" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-dark mb-2">{title}</h3>
              <p className="text-dark/60 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================
          LISTING
      ============================================ */}
      <section id="hebergements" className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Heading */}
          <div className="mb-10">
            <p className="text-gold-600 text-sm font-medium tracking-widest uppercase mb-2">
              Nos hébergements
            </p>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <h2 className="section-title">
                {filters.type
                  ? `${filters.type.charAt(0).toUpperCase() + filters.type.slice(1)}s disponibles`
                  : 'Tous les hébergements'
                }
              </h2>
              <span className="text-dark/50 text-sm">
                {accommodations.length} résultat{accommodations.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="gold-divider mt-4" />
          </div>

          {/* Filters */}
          <Suspense fallback={<div className="h-24 bg-beige-100 rounded-2xl animate-pulse" />}>
            <div className="mb-8">
              <AccommodationFilters />
            </div>
          </Suspense>

          {/* Grid */}
          {accommodations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {accommodations.map((acc) => (
                <AccommodationCard key={acc.id} accommodation={acc} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🏖️</div>
              <h3 className="font-serif text-2xl text-dark mb-2">Aucun hébergement trouvé</h3>
              <p className="text-dark/50 mb-6">
                Essayez de modifier vos critères de recherche
              </p>
              <a href="/" className="btn-outline-gold text-sm">
                Réinitialiser les filtres
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ============================================
          CTA MARIAGE
      ============================================ */}
      <section className="py-20 px-4 bg-dark">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gold-400 text-sm font-medium tracking-[0.2em] uppercase mb-4">
            Organisez votre mariage
          </p>
          <h2 className="font-serif text-4xl font-semibold text-white mb-6">
            Vous préparez un mariage à Kribi ?
          </h2>
          <p className="text-white/60 text-lg mb-8 leading-relaxed">
            L&amp;Lui Signature, c&apos;est bien plus que la réservation d&apos;hébergements.
            Notre agence vous accompagne dans l&apos;organisation complète de votre jour J.
          </p>
          <a
            href="mailto:contact@llui-signature.cm?subject=Organisation%20mariage%20Kribi"
            className="btn-primary px-10 py-4 text-base"
          >
            Nous contacter
          </a>
        </div>
      </section>
    </div>
  )
}
