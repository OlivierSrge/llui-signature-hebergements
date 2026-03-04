'use client'

import { useState } from 'react'
import { getAmenityIcon } from '@/lib/amenity-icons'

interface Props {
  amenities: string[]
}

const PREVIEW_COUNT = 6

export default function AmenitiesSection({ amenities }: Props) {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? amenities : amenities.slice(0, PREVIEW_COUNT)

  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl font-semibold text-dark mb-4">Pour votre confort</h2>
      <div className="gold-divider mb-5" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
        {displayed.map((amenity) => {
          const Icon = getAmenityIcon(amenity)
          return (
            <div key={amenity} className="flex items-center gap-4 py-3.5 border-b border-beige-100">
              <Icon size={20} className="text-dark flex-shrink-0" strokeWidth={1.5} />
              <span className="text-dark/80 text-sm">{amenity}</span>
            </div>
          )
        })}
      </div>
      {amenities.length > PREVIEW_COUNT && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-5 px-5 py-2.5 border border-dark/30 rounded-xl text-sm font-medium text-dark hover:bg-beige-50 transition-colors"
        >
          {showAll ? 'Afficher moins' : `Afficher les ${amenities.length} équipements`}
        </button>
      )}
    </div>
  )
}
