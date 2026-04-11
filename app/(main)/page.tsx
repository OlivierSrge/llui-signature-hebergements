export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { db } from '@/lib/firebase'
import AccommodationCard from '@/components/accommodations/AccommodationCard'
import AccommodationFilters from '@/components/accommodations/AccommodationFilters'
import { Award, Shield, HeartHandshake, Building2, Star, Crown, ArrowRight, Calendar, MapPin, Clock } from 'lucide-react'
import { resolveAccommodationTypeId, getTypeLabelFromId } from '@/lib/accommodationTypes'
import WeekendCTA from '@/components/home/WeekendCTA'
import BarreWeekend from '@/components/home/BarreWeekend'
import SectionWeekend from '@/components/home/SectionWeekend'
import { resolveImageUrl, formatPrice } from '@/lib/utils'
import PopupBoutique from '@/components/boutique/PopupBoutique'
import PopupEvenements from '@/components/PopupEvenements'

interface SearchParams {
  type?: string
  capacity?: string
  min_price?: string
  max_price?: string
}

async function getAccommodations(filters: SearchParams) {
  const snap = await db.collection('hebergements').where('status', '==', 'active').get()
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]

  results.sort((a, b) => {
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1
    return (b.created_at || '').localeCompare(a.created_at || '')
  })

  if (filters.type) {
    const resolvedFilter = resolveAccommodationTypeId(filters.type) ?? filters.type
    results = results.filter((a) => {
      const resolvedAcc = resolveAccommodationTypeId(a.type) ?? a.type
      return resolvedAcc === resolvedFilter
    })
  }
  if (filters.capacity) results = results.filter((a) => a.capacity >= Number(filters.capacity))
  if (filters.min_price) results = results.filter((a) => a.price_per_night >= Number(filters.min_price))
  if (filters.max_price) results = results.filter((a) => a.price_per_night <= Number(filters.max_price))

  return results
}

async function getProchainEvenements() {
  try {
    const now = new Date()
    const snap = await db.collection('evenements_kribi').where('actif', '==', true).get()
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((ev: any) => {
        const date = ev.date_debut?.toDate ? ev.date_debut.toDate() : new Date(ev.date_debut)
        return date >= now || ev.recurrent
      })
      .sort((a: any, b: any) => {
        const da = a.date_debut?.toDate ? a.date_debut.toDate() : new Date(a.date_debut)
        const db2 = b.date_debut?.toDate ? b.date_debut.toDate() : new Date(b.date_debut)
        return da.getTime() - db2.getTime()
      })
      .slice(0, 3)
      .map((ev: any) => ({
        ...ev,
        date_debut: ev.date_debut?.toDate ? ev.date_debut.toDate().toISOString() : ev.date_debut,
      }))
  } catch {
    return []
  }
}

const CAT_EMOJI: Record<string, string> = {
  nature: '🌿', gastronomie: '🍽', culture: '🎭',
  sport: '⚽', wellness: '🧘', nightlife: '🎵',
}

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const [accommodations, prochainEvenements] = await Promise.all([
    getAccommodations(sp),
    getProchainEvenements(),
  ])

  return (
    <div>
      <PopupBoutique />
      <PopupEvenements />
      {/* ── Barre weekend dynamique (Élément A) ── */}
      <BarreWeekend />

      {/* ── Hero Section ── */}
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
          {/* Surtitle */}
          <p className="text-gold-300 text-sm font-medium tracking-[0.2em] uppercase mb-4">
            Kribi — Cameroun
          </p>
          {/* Titre */}
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-semibold leading-tight mb-6">
            Votre séjour de rêve<br /><em className="text-gold-300">vous attend</em>
          </h1>
          {/* Sous-titre multi-public */}
          <p className="text-white/80 text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            L&amp;Lui Signature sélectionne pour vous les plus belles adresses de Kribi — pour un weekend en famille, une escapade romantique, un mariage inoubliable ou simplement profiter de la mer.
          </p>
          {/* CTA */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="#hebergements" className="btn-primary text-base px-8 py-4 inline-flex">
              Découvrir les hébergements
            </a>
            <WeekendCTA />
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 animate-bounce">
          <div className="w-0.5 h-8 bg-white/30 rounded-full" />
        </div>
      </section>

      {/* ── Section Ce weekend à Kribi (client, fetches /api/evenements/weekend) ── */}
      <SectionWeekend />

      {/* ── Confiance ── */}
      <section className="bg-beige-100 py-14 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { icon: Award, title: 'Sélection premium', desc: 'Chaque hébergement est rigoureusement sélectionné par notre équipe pour son excellence.' },
            { icon: Shield, title: 'Réservation sécurisée', desc: "Vos données et paiements sont protégés. Réservez l'esprit tranquille." },
            { icon: HeartHandshake, title: 'Service personnalisé', desc: "Notre équipe L&Lui vous accompagne de la réservation jusqu'au check-out." },
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

      {/* ── Élément B — Section "Prochainement à Kribi" ── */}
      {prochainEvenements.length > 0 && (
        <section className="py-16 px-4 sm:px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10">
              <p className="text-gold-600 text-sm font-medium tracking-widest uppercase mb-2">Agenda</p>
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="section-title">Prochainement à Kribi</h2>
                  <p className="text-dark/50 text-sm mt-1">Mis à jour chaque semaine par l&apos;équipe L&amp;Lui</p>
                </div>
              </div>
              <div className="gold-divider mt-4" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
              {prochainEvenements.map((ev: any) => (
                <div key={ev.id} className="bg-[#F5F0E8] rounded-2xl overflow-hidden border border-beige-200 hover:border-gold-300 transition-colors">
                  {ev.image_url && ev.image_url.startsWith('http') ? (
                    <div className="relative h-40 w-full">
                      <Image
                        src={resolveImageUrl(ev.image_url)}
                        alt={ev.titre}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="h-40 w-full bg-gold-100 flex items-center justify-center text-5xl">
                      {CAT_EMOJI[ev.categorie] ?? '🗓'}
                    </div>
                  )}
                  <div className="p-4">
                    <span className="text-xs text-gold-600 font-medium uppercase tracking-wide">
                      {ev.categorie}
                    </span>
                    <h3 className="font-semibold text-dark mt-1 mb-2 leading-snug">{ev.titre}</h3>
                    <div className="flex flex-col gap-1 text-xs text-dark/50">
                      {ev.heure && (
                        <span className="flex items-center gap-1.5">
                          <Clock size={11} className="text-gold-500" />
                          {ev.heure}
                        </span>
                      )}
                      {ev.lieu && (
                        <span className="flex items-center gap-1.5">
                          <MapPin size={11} className="text-gold-500" />
                          {ev.lieu}
                        </span>
                      )}
                    </div>
                    {ev.prix === 0 ? (
                      <span className="mt-3 inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Gratuit</span>
                    ) : ev.prix ? (
                      <span className="mt-3 inline-block text-xs bg-gold-100 text-gold-700 px-2 py-0.5 rounded-full font-medium">{formatPrice(ev.prix)}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <button
                onClick={undefined}
                className="inline-flex items-center gap-2 text-sm font-medium text-gold-600 hover:text-gold-700 transition-colors border border-gold-300 rounded-xl px-5 py-2.5 hover:bg-gold-50"
                data-open-calendrier
              >
                <Calendar size={15} />
                Voir tout le calendrier
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Packs section ── */}
      <section className="py-16 px-4 sm:px-6 bg-dark">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gold-400 text-sm font-medium tracking-widest uppercase mb-2">Offres groupées</p>
            <h2 className="font-serif text-4xl font-semibold text-white mb-4">Nos Packs Logements</h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
              Pour vos mariages, séminaires et séjours en groupe à Kribi — découvrez nos packs regroupant plusieurs logements sélectionnés.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            {[
              { href: '/packs#f3', icon: Building2, label: 'Packs F3', desc: 'Logements familiaux spacieux pour groupes', color: 'bg-blue-600' },
              { href: '/packs#vip', icon: Star, label: 'Packs VIP', desc: 'Logements premium haut de gamme', color: 'bg-amber-500' },
              { href: '/packs#signature', icon: Crown, label: 'Packs Signature', desc: "Notre sélection d'excellence", color: 'bg-gold-500' },
            ].map(({ href, icon: Icon, label, desc, color }) => (
              <a key={href} href={href} className="group flex flex-col items-center text-center p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mb-4`}>
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-white mb-2">{label}</h3>
                <p className="text-white/50 text-sm">{desc}</p>
              </a>
            ))}
          </div>
          <div className="text-center">
            <a href="/packs" className="inline-flex items-center gap-2 btn-primary px-8 py-3.5">
              Voir tous nos packs <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ── Hébergements ── */}
      <section id="hebergements" className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <p className="text-gold-600 text-sm font-medium tracking-widest uppercase mb-2">Nos hébergements</p>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <h2 className="section-title">{sp.type ? `${getTypeLabelFromId(sp.type)} — disponibles` : 'Tous les hébergements'}</h2>
              <span className="text-dark/50 text-sm">{accommodations.length} résultat{accommodations.length > 1 ? 's' : ''}</span>
            </div>
            <div className="gold-divider mt-4" />
          </div>
          <Suspense fallback={<div className="h-24 bg-beige-100 rounded-2xl animate-pulse" />}>
            <div className="mb-8"><AccommodationFilters /></div>
          </Suspense>
          {accommodations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {accommodations.map((acc) => <AccommodationCard key={acc.id} accommodation={acc} />)}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🏖️</div>
              <h3 className="font-serif text-2xl text-dark mb-2">Aucun hébergement trouvé</h3>
              <p className="text-dark/50 mb-6">Essayez de modifier vos critères de recherche</p>
              <a href="/" className="btn-outline-gold text-sm">Réinitialiser les filtres</a>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA mariage ── */}
      <section className="py-20 px-4 bg-dark">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gold-400 text-sm font-medium tracking-[0.2em] uppercase mb-4">Organisez votre mariage</p>
          <h2 className="font-serif text-4xl font-semibold text-white mb-6">Vous préparez un mariage à Kribi ?</h2>
          <p className="text-white/60 text-lg mb-8 leading-relaxed">
            L&amp;Lui Signature, c&apos;est bien plus que la réservation d&apos;hébergements. Notre agence vous accompagne dans l&apos;organisation complète de votre jour J.
          </p>
          <a href="mailto:contact@l-et-lui.com?subject=Organisation%20mariage%20Kribi" className="btn-primary px-10 py-4 text-base">Nous contacter</a>
        </div>
      </section>
    </div>
  )
}
