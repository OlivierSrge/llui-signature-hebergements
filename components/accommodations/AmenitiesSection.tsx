'use client'

import { useState } from 'react'
import {
  Wifi, Waves, Tv, Car, Wind, UtensilsCrossed, Dumbbell, TreePine,
  Shield, Flame, ArrowUpDown, Shirt, Check, Utensils, Coffee,
  Snowflake, Sun, Bike, Baby, PawPrint, WifiOff, Zap, Droplets,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const AMENITY_ICONS: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ['wifi', 'internet', 'fibre', 'haut débit'], icon: Wifi },
  { keywords: ['sans wifi', 'sans internet'], icon: WifiOff },
  { keywords: ['piscine', 'pool', 'natation', 'baignade'], icon: Waves },
  { keywords: ['télé', 'tv', 'télévision', 'écran'], icon: Tv },
  { keywords: ['lave-linge', 'machine à laver', 'linge', 'laverie'], icon: Shirt },
  { keywords: ['parking', 'stationnement', 'garage', 'voiture'], icon: Car },
  { keywords: ['sauna', 'hammam', 'spa', 'jacuzzi', 'bain à remous'], icon: Flame },
  { keywords: ['ascenseur', 'élévateur'], icon: ArrowUpDown },
  { keywords: ['climatisation', 'air conditionné', 'air cond'], icon: Snowflake },
  { keywords: ['ventil', 'brasseur', 'ventilateur'], icon: Wind },
  { keywords: ['cuisine équipée', 'cuisiné', 'kitchenette', 'cuisine complète'], icon: UtensilsCrossed },
  { keywords: ['cuisine', 'cuisinier'], icon: Utensils },
  { keywords: ['café', 'machine à café', 'nespresso'], icon: Coffee },
  { keywords: ['gym', 'fitness', 'musculation', 'salle de sport'], icon: Dumbbell },
  { keywords: ['jardin', 'verdure', 'parc', 'espace vert'], icon: TreePine },
  { keywords: ['terrasse', 'balcon', 'patio', 'véranda'], icon: Sun },
  { keywords: ['sécurité', 'gardien', 'alarme', 'caméra', 'badge'], icon: Shield },
  { keywords: ['vélo', 'bicycle', 'deux-roues'], icon: Bike },
  { keywords: ['bébé', 'enfant', 'lit bébé', 'chaise haute'], icon: Baby },
  { keywords: ['animal', 'animaux', 'chien', 'chat', 'pet'], icon: PawPrint },
  { keywords: ['générateur', 'groupe électrogène', 'électricité'], icon: Zap },
  { keywords: ['eau chaude', 'chauffe-eau', 'douche chaude'], icon: Droplets },
]

function getAmenityIcon(amenity: string): LucideIcon {
  const lower = amenity.toLowerCase()
  for (const { keywords, icon } of AMENITY_ICONS) {
    if (keywords.some((k) => lower.includes(k))) return icon
  }
  return Check
}

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
