'use client'

import { useState, useEffect, useRef } from 'react'
import { X, MapPin, Clock, Tag, ExternalLink, Share2 } from 'lucide-react'
import Image from 'next/image'
import { resolveImageUrl, formatPrice } from '@/lib/utils'

type Categorie = 'tous' | 'nature' | 'gastronomie' | 'culture' | 'sport' | 'wellness' | 'nightlife'

const CATEGORIES: { id: Categorie; label: string; emoji: string }[] = [
  { id: 'tous', label: 'Tous', emoji: '🗓' },
  { id: 'nature', label: 'Nature', emoji: '🌿' },
  { id: 'gastronomie', label: 'Gastro', emoji: '🍽' },
  { id: 'culture', label: 'Culture', emoji: '🎭' },
  { id: 'sport', label: 'Sport', emoji: '⚽' },
  { id: 'wellness', label: 'Bien-être', emoji: '🧘' },
  { id: 'nightlife', label: 'Soirée', emoji: '🎵' },
]

interface Evenement {
  id: string
  titre: string
  description?: string
  categorie: Categorie
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

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function PopupCalendrier({ isOpen, onClose }: Props) {
  const [data, setData] = useState<WeekendData | null>(null)
  const [loading, setLoading] = useState(false)
  const [categorie, setCategorie] = useState<Categorie>('tous')
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && !data) {
      setLoading(true)
      fetch('/api/evenements/weekend')
        .then((r) => r.json())
        .then((d) => setData(d))
        .catch(() => setData(null))
        .finally(() => setLoading(false))
    }
  }, [isOpen, data])

  // Fermeture clavier Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Bloquer le scroll du body
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const filtered = data?.evenements.filter(
    (ev) => categorie === 'tous' || ev.categorie === categorie
  ) ?? []

  const handleShare = () => {
    const text = `Ce weekend à Kribi 🌊\n${data?.evenements.slice(0, 3).map((e) => `• ${e.titre}`).join('\n')}\n\nRéservez votre hébergement → https://l-et-lui.com`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel — slide up depuis le bas */}
      <div
        className="relative w-full sm:max-w-2xl sm:mx-4 bg-white sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col animate-slide-up"
        style={{ maxHeight: '92vh' }}
      >
        {/* En-tête */}
        <div className="bg-[#1A1A1A] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-serif text-xl font-semibold">Ce weekend à Kribi</h2>
            {data && (
              <p className="text-white/50 text-xs mt-0.5">
                {data.weekend.labelSamedi} · {data.weekend.labelDimanche}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto flex-shrink-0 border-b border-gray-100 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategorie(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                categorie === cat.id
                  ? 'bg-[#C9A84C] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              Chargement des événements…
            </div>
          )}

          {!loading && data && filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              <div className="text-3xl mb-3">🌊</div>
              Aucun événement pour cette catégorie ce weekend.
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="px-4 py-4 space-y-3">
              {filtered.map((ev) => (
                <div
                  key={ev.id}
                  className="flex gap-3 p-3 bg-[#F5F0E8] rounded-xl"
                >
                  {ev.image_url && isValidUrl(ev.image_url) ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={resolveImageUrl(ev.image_url)}
                        alt={ev.titre}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#C9A84C]/20 flex items-center justify-center flex-shrink-0 text-2xl">
                      {CATEGORIES.find((c) => c.id === ev.categorie)?.emoji ?? '🗓'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 justify-between">
                      <p className="font-semibold text-[#1A1A1A] text-sm leading-tight">{ev.titre}</p>
                      {ev.prix === 0 ? (
                        <span className="flex-shrink-0 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Gratuit</span>
                      ) : ev.prix ? (
                        <span className="flex-shrink-0 text-xs bg-[#C9A84C]/20 text-[#8B6B1A] px-2 py-0.5 rounded-full font-medium">{formatPrice(ev.prix)}</span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {ev.heure && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={10} /> {ev.heure}
                        </span>
                      )}
                      {ev.lieu && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin size={10} /> {ev.lieu}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hébergements disponibles ce weekend */}
          {!loading && data && data.hebergements.length > 0 && (
            <div className="px-4 pb-4">
              <div className="border-t border-gray-100 pt-4 mb-3">
                <p className="font-semibold text-[#1A1A1A] text-sm">
                  Hébergements disponibles ce weekend
                </p>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
                {data.hebergements.map((h) => (
                  <a
                    key={h.id}
                    href={`/hebergements/${h.slug}`}
                    className="flex-shrink-0 w-44 bg-[#F5F0E8] rounded-xl overflow-hidden group"
                  >
                    <div className="relative h-24 w-full">
                      {h.image && isValidUrl(h.image) ? (
                        <Image
                          src={resolveImageUrl(h.image)}
                          alt={h.nom}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="176px"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#C9A84C]/20 flex items-center justify-center text-2xl">🏡</div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-[#1A1A1A] truncate">{h.nom}</p>
                      <p className="text-xs text-[#C9A84C] font-medium mt-0.5">
                        {formatPrice(h.prix_nuit)} / nuit
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0 bg-white">
          <a
            href="#hebergements"
            onClick={onClose}
            className="flex-1 text-center text-sm font-medium text-[#1A1A1A] hover:text-[#C9A84C] transition-colors flex items-center justify-center gap-1.5"
          >
            Voir tout le calendrier <ExternalLink size={13} />
          </a>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#1D9E75] text-white hover:bg-[#17855f] transition-colors"
          >
            <Share2 size={14} /> WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}

function isValidUrl(url: string) {
  return typeof url === 'string' && url.trim() !== '' && url.startsWith('http')
}
