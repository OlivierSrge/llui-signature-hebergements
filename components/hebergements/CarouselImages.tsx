'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { resolveImageUrl } from '@/lib/utils'

interface Props {
  images: string[]
  alt?: string
}

export default function CarouselImages({ images, alt = 'Photo' }: Props) {
  const filtered = images.filter(Boolean)
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef<number | null>(null)

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

  const showDots = total <= 5
  const showCounter = total > 5

  return (
    <div
      className="relative overflow-hidden rounded-2xl select-none"
      style={{ height: '400px' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image active */}
      <Image
        src={resolveImageUrl(filtered[current])}
        alt={`${alt} ${current + 1}`}
        fill
        unoptimized
        className="object-cover transition-opacity duration-300"
        sizes="(max-width: 768px) 100vw, 80vw"
        priority={current === 0}
      />

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
                  }`}
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
