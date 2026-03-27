'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import { resolveImageUrl } from '@/lib/utils'

// SVG placeholder inline — fond #F5F0E8, texte #C9A84C, sans dépendance fichier
const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%23F5F0E8'/%3E%3C/svg%3E"

// FIX 1 — filtre robuste : rejette null, undefined, "", " ", et toute URL non-http
function isValidImageUrl(url: unknown): url is string {
  return (
    typeof url === 'string' &&
    url.trim() !== '' &&
    url.startsWith('http')
  )
}

interface Props {
  images: string[]
  alt?: string
}

export default function CarouselImages({ images, alt = 'Photo' }: Props) {
  // FIX 1 — filtre appliqué dès la props
  const filtered = images.filter(isValidImageUrl)

  const [current, setCurrent] = useState(0)
  const touchStartX = useRef<number | null>(null)
  // FIX 2/4 — suivi des images cassées par index
  const [brokenIndexes, setBrokenIndexes] = useState<Set<number>>(new Set())

  if (!filtered.length) return null

  const total = filtered.length
  const prev = () => setCurrent((c) => (c - 1 + total) % total)
  const next = () => setCurrent((c) => (c + 1) % total)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev()
    touchStartX.current = null
  }

  // FIX 2 — marquer l'index comme cassé → affichage du placeholder
  const handleImageError = (index: number) => {
    setBrokenIndexes((prev) => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
  }

  const showDots = total <= 5
  const showCounter = total > 5
  const isBroken = brokenIndexes.has(current)

  return (
    <div
      className="relative overflow-hidden rounded-2xl select-none"
      style={{ height: '400px' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* FIX 4 — Indicateur visuel si image cassée */}
      {isBroken ? (
        <div
          className="w-full h-full flex flex-col items-center justify-center gap-3"
          style={{ background: '#F5F0E8' }}
        >
          <ImageOff size={40} style={{ color: '#C9A84C', opacity: 0.6 }} />
          <p className="text-sm font-medium" style={{ color: '#C9A84C' }}>
            Photo non disponible
          </p>
        </div>
      ) : (
        /* FIX 2 — onError déclenche le fallback */
        <Image
          key={filtered[current]}
          src={resolveImageUrl(filtered[current])}
          alt={`${alt} ${current + 1}`}
          fill
          unoptimized
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 768px) 100vw, 80vw"
          priority={current === 0}
          onError={() => handleImageError(current)}
        />
      )}

      {/* Gradient bas pour lisibilité des contrôles */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

      {total > 1 && (
        <>
          {/* Flèche gauche */}
          <button
            type="button"
            onClick={prev}
            aria-label="Photo précédente"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors backdrop-blur-sm"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Flèche droite */}
          <button
            type="button"
            onClick={next}
            aria-label="Photo suivante"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors backdrop-blur-sm"
          >
            <ChevronRight size={20} />
          </button>

          {/* Points (≤ 5 images) */}
          {showDots && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {filtered.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-label={`Photo ${i + 1}`}
                  className={`rounded-full transition-all duration-200 ${
                    i === current
                      ? 'w-4 h-2 bg-white'
                      : 'w-2 h-2 bg-white/55 hover:bg-white/80'
                  }${brokenIndexes.has(i) ? ' opacity-40' : ''}`}
                />
              ))}
            </div>
          )}

          {/* Compteur (> 5 images) */}
          {showCounter && (
            <div
              className="absolute bottom-4 right-4 text-white text-xs font-medium px-2.5 py-1 pointer-events-none"
              style={{
                background: 'rgba(0,0,0,0.45)',
                borderRadius: '20px',
                fontSize: '12px',
              }}
            >
              {current + 1} / {total}
            </div>
          )}
        </>
      )}
    </div>
  )
}
