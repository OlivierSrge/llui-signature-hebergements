'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Calendar, MapPin, Clock, ChevronRight, BellRing } from 'lucide-react'
import { resolveImageUrl, formatPrice } from '@/lib/utils'

interface Evenement {
  id: string
  titre: string
  categorie: string
  date_debut: string
  heure?: string
  lieu?: string
  prix?: number
  image_url?: string
  recurrent?: boolean
}

interface Props {
  evenements: Evenement[]
  labelSamedi: string
  labelDimanche: string
}

const CATEGORIES = [
  { id: 'tous', label: 'Tous', emoji: '' },
  { id: 'nature', label: 'Nature', emoji: '🌊' },
  { id: 'gastronomie', label: 'Gastro', emoji: '🍽️' },
  { id: 'culture', label: 'Culture', emoji: '🥁' },
  { id: 'sport', label: 'Sport', emoji: '🏄' },
  { id: 'wellness', label: 'Bien-être', emoji: '🧖' },
  { id: 'nightlife', label: 'Soirée', emoji: '🎵' },
]

const CAT_COLORS: Record<string, { bg: string; badge: string; text: string }> = {
  nature:      { bg: '#E1F5EE', badge: '#085041', text: '#fff' },
  gastronomie: { bg: '#FAECE7', badge: '#712B13', text: '#fff' },
  culture:     { bg: '#EEEDFE', badge: '#3C3489', text: '#fff' },
  sport:       { bg: '#E6F1FB', badge: '#0C447C', text: '#fff' },
  wellness:    { bg: '#FBEAF0', badge: '#72243E', text: '#fff' },
  nightlife:   { bg: '#1A1A1A', badge: '#C9A84C', text: '#412402' },
}

function formatWeekendDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
  } catch {
    return ''
  }
}

export default function KribiClient({ evenements, labelSamedi, labelDimanche }: Props) {
  const [activeFilter, setActiveFilter] = useState('tous')

  const filtered =
    activeFilter === 'tous'
      ? evenements
      : evenements.filter((ev) => ev.categorie === activeFilter)

  return (
    <div>
      {/* ── Filtres catégories ── */}
      <section className="sticky top-0 z-10 py-3 px-4 border-b border-white/8 overflow-x-auto" style={{ background: '#1A1A1A' }}>
        <div className="flex gap-2 w-max mx-auto pr-4">
          {CATEGORIES.map((cat) => {
            const isActive = activeFilter === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all font-medium"
                style={
                  isActive
                    ? { background: '#C9A84C', color: '#412402', border: '1px solid #C9A84C' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.15)' }
                }
              >
                {cat.emoji && <span>{cat.emoji}</span>}
                {cat.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Liste événements ── */}
      <section className="px-4 py-8" style={{ background: '#F5F0E8' }}>
        <div className="max-w-lg mx-auto">
          {filtered.length === 0 ? (
            /* État vide */
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🏖️</div>
              {evenements.length === 0 ? (
                <>
                  <h3 className="font-serif text-xl font-semibold text-[#1A1A1A] mb-3">
                    Aucune activité programmée ce weekend
                  </h3>
                  <p className="text-[#1A1A1A]/50 text-sm leading-relaxed mb-6">
                    Revenez vendredi — nous mettons à jour<br />le calendrier chaque semaine.
                  </p>
                  <a
                    href="#abonnement"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
                    style={{ background: '#C9A84C', color: '#1A1A1A' }}
                  >
                    <BellRing size={15} />
                    S&apos;abonner pour être averti →
                  </a>
                </>
              ) : (
                <>
                  <p className="text-[#1A1A1A]/50 text-sm">
                    Aucune activité dans cette catégorie ce weekend.
                  </p>
                  <button
                    onClick={() => setActiveFilter('tous')}
                    className="mt-4 text-sm text-[#C9A84C] underline underline-offset-2"
                  >
                    Voir toutes les activités
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((ev) => {
                const colors = CAT_COLORS[ev.categorie] ?? { bg: '#F5F0E8', badge: '#1A1A1A', text: '#fff' }
                const isNightlife = ev.categorie === 'nightlife'

                return (
                  <article
                    key={ev.id}
                    className="rounded-2xl overflow-hidden shadow-sm"
                    style={{ background: colors.bg, border: isNightlife ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(0,0,0,0.06)' }}
                  >
                    {/* Image ou fond coloré */}
                    {ev.image_url && ev.image_url.startsWith('http') ? (
                      <div className="relative h-44 w-full">
                        <Image
                          src={resolveImageUrl(ev.image_url)}
                          alt={ev.titre}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 512px"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      </div>
                    ) : null}

                    <div className="p-4">
                      {/* Badge catégorie */}
                      <span
                        className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2 uppercase tracking-wide"
                        style={{ background: colors.badge, color: colors.text }}
                      >
                        {ev.categorie}
                      </span>

                      {/* Titre */}
                      <h3
                        className="font-serif text-lg font-semibold mb-3 leading-snug"
                        style={{ color: isNightlife ? '#fff' : '#1A1A1A' }}
                      >
                        {ev.titre}
                      </h3>

                      {/* Infos */}
                      <div className="flex flex-col gap-1.5 mb-4">
                        <span
                          className="text-sm flex items-center gap-1.5"
                          style={{ color: isNightlife ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,26,0.55)' }}
                        >
                          <Calendar size={13} className="flex-shrink-0" style={{ color: '#C9A84C' }} />
                          {formatWeekendDate(ev.date_debut)}
                          {ev.heure && <span>· {ev.heure}</span>}
                        </span>
                        {ev.lieu && (
                          <span
                            className="text-sm flex items-center gap-1.5"
                            style={{ color: isNightlife ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,26,0.55)' }}
                          >
                            <MapPin size={13} className="flex-shrink-0" style={{ color: '#C9A84C' }} />
                            {ev.lieu}
                          </span>
                        )}
                        {ev.heure && (
                          <span
                            className="text-sm flex items-center gap-1.5"
                            style={{ color: isNightlife ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,26,0.55)' }}
                          >
                            <Clock size={13} className="flex-shrink-0" style={{ color: '#C9A84C' }} />
                            {ev.heure}
                          </span>
                        )}
                      </div>

                      {/* Prix + CTA */}
                      <div className="flex items-center justify-between">
                        {ev.prix === 0 ? (
                          <span className="text-sm font-semibold text-[#085041] bg-[#E1F5EE] px-3 py-1 rounded-full">
                            Gratuit
                          </span>
                        ) : ev.prix ? (
                          <span className="text-sm font-semibold" style={{ color: '#C9A84C' }}>
                            {formatPrice(ev.prix)}
                          </span>
                        ) : (
                          <span />
                        )}
                        <button
                          className="flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-75"
                          style={{ color: isNightlife ? '#C9A84C' : colors.badge }}
                        >
                          En savoir plus <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
