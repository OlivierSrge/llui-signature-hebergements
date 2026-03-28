'use client'
// Section sombre "Ce weekend à Kribi" — entre le hero et la section confiance

import { useState, useEffect } from 'react'
import { Clock, MapPin, Calendar } from 'lucide-react'
import Image from 'next/image'
import { resolveImageUrl, formatPrice } from '@/lib/utils'

interface Evenement {
  id: string
  titre: string
  categorie: string
  heure?: string
  lieu?: string
  prix?: number
  image_url?: string
}

interface WeekendData {
  evenements: Evenement[]
  total: number
  weekend: { labelSamedi: string; labelDimanche: string }
}

const CAT_EMOJI: Record<string, string> = {
  nature: '🌿', gastronomie: '🍽', culture: '🎭',
  sport: '⚽', wellness: '🧘', nightlife: '🎵',
}

export default function SectionWeekend() {
  const [data, setData] = useState<WeekendData | null>(null)
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/evenements/weekend')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data || data.total === 0) return null

  const preview = data.evenements.slice(0, 3)
  const open = () => document.dispatchEvent(new CustomEvent('openCalendrier'))

  return (
    <section className="py-16 px-4 sm:px-6" style={{ background: '#1A1A1A' }}>
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#1D9E75] inline-block animate-pulse" />
            <p className="text-[#1D9E75] text-xs font-medium tracking-widest uppercase">En ce moment</p>
          </div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white">
                Ce weekend à Kribi
              </h2>
              <p className="text-white/40 text-sm mt-1">
                {data.weekend.labelSamedi} · {data.weekend.labelDimanche} · {data.total} activité{data.total > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="h-px mt-4" style={{ background: 'linear-gradient(to right, #C9A84C, transparent)' }} />
        </div>

        {/* Cartes événements */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {preview.map((ev) => (
            <button
              key={ev.id}
              onClick={open}
              className="text-left rounded-2xl overflow-hidden transition-transform hover:scale-[1.02]"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {ev.image_url && ev.image_url.startsWith('http') && !brokenImages.has(ev.id) ? (
                <div className="relative h-36 w-full">
                  <Image
                    src={resolveImageUrl(ev.image_url)}
                    alt={ev.titre}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 33vw"
                    onError={() => setBrokenImages((prev) => new Set(prev).add(ev.id))}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              ) : (
                <div
                  className="h-36 w-full flex items-center justify-center text-5xl"
                  style={{ background: 'rgba(201,168,76,0.1)' }}
                >
                  {CAT_EMOJI[ev.categorie] ?? '🗓'}
                </div>
              )}
              <div className="p-4">
                <span className="text-[#C9A84C] text-xs font-medium uppercase tracking-wide">
                  {ev.categorie}
                </span>
                <h3 className="font-semibold text-white mt-1 mb-2 leading-snug text-sm">{ev.titre}</h3>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {ev.heure && (
                    <span className="text-white/40 text-xs flex items-center gap-1">
                      <Clock size={9} /> {ev.heure}
                    </span>
                  )}
                  {ev.lieu && (
                    <span className="text-white/40 text-xs flex items-center gap-1">
                      <MapPin size={9} /> {ev.lieu}
                    </span>
                  )}
                </div>
                {ev.prix === 0 ? (
                  <span className="mt-2 inline-block text-[10px] bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full">Gratuit</span>
                ) : ev.prix ? (
                  <span className="mt-2 inline-block text-[10px] text-[#C9A84C] font-medium">{formatPrice(ev.prix)}</span>
                ) : null}
              </div>
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={open}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
            style={{ background: '#C9A84C', color: '#1A1A1A' }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#b8943d')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#C9A84C')}
          >
            <Calendar size={15} />
            Voir tout le calendrier du weekend
          </button>
        </div>
      </div>
    </section>
  )
}
