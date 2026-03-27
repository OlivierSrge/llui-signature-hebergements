'use client'

import { useState, useEffect } from 'react'
import { X, MapPin, Clock } from 'lucide-react'
import Image from 'next/image'
import { resolveImageUrl, formatPrice } from '@/lib/utils'
import PopupCalendrier from './PopupCalendrier'

interface Evenement {
  id: string
  titre: string
  categorie: string
  date_debut: string
  heure?: string
  lieu?: string
  prix?: number
  image_url?: string
}

interface Hebergement {
  id: string
  nom: string
  prix_nuit: number
  image: string
  slug: string
}

interface WeekendData {
  evenements: Evenement[]
  hebergements: Hebergement[]
  total: number
  weekend: { labelSamedi: string; labelDimanche: string }
}

const CAT_EMOJI: Record<string, string> = {
  nature: '🌿', gastronomie: '🍽', culture: '🎭',
  sport: '⚽', wellness: '🧘', nightlife: '🎵',
}

const TODAY_KEY = new Date().toDateString()

function alreadyShownToday(): boolean {
  try {
    return localStorage.getItem('banniere_weekend_vue') === TODAY_KEY
  } catch {
    return false
  }
}

function markShownToday(): void {
  try {
    localStorage.setItem('banniere_weekend_vue', TODAY_KEY)
  } catch { /* noop */ }
}

export default function BanniereWeekend() {
  const [data, setData] = useState<WeekendData | null>(null)
  const [banniereOpen, setBanniereOpen] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)

  // Fetch weekend data
  useEffect(() => {
    fetch('/api/evenements/weekend')
      .then((r) => r.json())
      .then((d: WeekendData) => {
        setData(d)
        // Auto-show after 3s, once per day, only if there are events
        if (d.total > 0 && !alreadyShownToday()) {
          const timer = setTimeout(() => setBanniereOpen(true), 3000)
          return () => clearTimeout(timer)
        }
      })
      .catch(() => {})
  }, [])

  // Listen to global openCalendrier event
  useEffect(() => {
    const handler = () => setPopupOpen(true)
    document.addEventListener('openCalendrier', handler)
    return () => document.removeEventListener('openCalendrier', handler)
  }, [])

  const handleDismiss = () => {
    markShownToday()
    setBanniereOpen(false)
  }

  const handleCTA = () => {
    markShownToday()
    setBanniereOpen(false)
    setPopupOpen(true)
  }

  const preview = data?.evenements.slice(0, 2) ?? []
  const extra = (data?.total ?? 0) - preview.length

  return (
    <>
      {/* Bannière auto-modale centrée */}
      {banniereOpen && data && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center px-4"
          style={{ animation: 'fadeIn 0.2s ease' }}
        >
          {/* Overlay sombre */}
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={handleDismiss}
          />

          {/* Carte */}
          <div
            className="relative w-full max-w-md"
            style={{
              background: '#1A1A1A',
              border: '1px solid #C9A84C',
              borderRadius: 16,
              overflow: 'hidden',
              animation: 'scaleIn 0.25s ease',
            }}
          >
            {/* En-tête */}
            <div className="px-5 pt-5 pb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#1D9E75] animate-pulse inline-block" />
                  <span className="text-[#C9A84C] text-xs font-medium uppercase tracking-wider">Ce weekend à Kribi</span>
                </div>
                <h2 className="text-white font-serif text-xl font-semibold leading-snug">
                  {data.total} activité{data.total > 1 ? 's' : ''} vous attendent
                </h2>
                <p className="text-white/40 text-xs mt-0.5">
                  {data.weekend.labelSamedi} · {data.weekend.labelDimanche}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors flex-shrink-0 ml-4"
                aria-label="Fermer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Événements preview */}
            {preview.length > 0 && (
              <div className="px-5 space-y-2.5 mb-4">
                {preview.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    {ev.image_url && ev.image_url.startsWith('http') ? (
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={resolveImageUrl(ev.image_url)}
                          alt={ev.titre}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl"
                        style={{ background: 'rgba(201,168,76,0.15)' }}
                      >
                        {CAT_EMOJI[ev.categorie] ?? '🗓'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold leading-tight truncate">{ev.titre}</p>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
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
                        <span className="mt-1 inline-block text-[10px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded-full">Gratuit</span>
                      ) : ev.prix ? (
                        <span className="mt-1 inline-block text-[10px] text-[#C9A84C]">{formatPrice(ev.prix)}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
                {extra > 0 && (
                  <p className="text-white/40 text-xs text-center py-1">
                    + {extra} autre{extra > 1 ? 's' : ''} activité{extra > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {/* Hébergements mini */}
            {data.hebergements.length > 0 && (
              <div className="px-5 mb-4">
                <p className="text-white/40 text-xs mb-2">Hébergements disponibles</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {data.hebergements.slice(0, 2).map((h) => (
                    <div
                      key={h.id}
                      className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.06)', minWidth: 140 }}
                    >
                      {h.image && h.image.startsWith('http') ? (
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={resolveImageUrl(h.image)}
                            alt={h.nom}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="36px"
                          />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-[#C9A84C]/20 flex items-center justify-center text-base flex-shrink-0">🏡</div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium truncate">{h.nom}</p>
                        <p className="text-[#C9A84C] text-[10px]">{formatPrice(h.prix_nuit)}/nuit</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-5 pb-5 flex flex-col gap-2">
              <button
                onClick={handleCTA}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-colors"
                style={{ background: '#C9A84C', color: '#1A1A1A' }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#b8943d')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#C9A84C')}
              >
                Voir toutes les activités →
              </button>
              <button
                onClick={handleDismiss}
                className="w-full py-2 text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Passer · Ne plus afficher aujourd&apos;hui
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup calendrier complet */}
      <PopupCalendrier isOpen={popupOpen} onClose={() => setPopupOpen(false)} />

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.92) } to { opacity: 1; transform: scale(1) } }
      `}</style>
    </>
  )
}
