import { Star } from 'lucide-react'
import type { AccommodationRatings } from '@/lib/types'

const CATEGORIES = [
  { key: 'cleanliness', label: 'Propreté' },
  { key: 'accuracy', label: 'Exactitude' },
  { key: 'checkin', label: 'Arrivée' },
  { key: 'communication', label: 'Communication' },
  { key: 'location', label: 'Emplacement' },
  { key: 'value', label: 'Rapport qualité-prix' },
]

interface Props {
  ratings: AccommodationRatings
  featured?: boolean
}

export default function RatingsSection({ ratings, featured }: Props) {
  const showFavorite = featured || ratings.overall >= 4.8

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-5">
        <Star size={20} fill="currentColor" className="text-dark" />
        <span className="font-serif text-2xl font-semibold text-dark">{ratings.overall.toFixed(1)}</span>
        <span className="text-dark/30">·</span>
        <span className="text-dark/60 text-sm">{ratings.count} avis</span>
      </div>

      {showFavorite && (
        <div className="flex items-center gap-4 p-4 border border-beige-200 rounded-2xl mb-5 bg-beige-50">
          <div className="flex-shrink-0 text-3xl leading-none select-none">🏆</div>
          <div>
            <p className="font-semibold text-dark text-sm">Coup de cœur voyageurs</p>
            <p className="text-dark/60 text-xs mt-0.5">
              Ce logement fait partie des 10 % les plus appréciés
            </p>
          </div>
        </div>
      )}

      <div className="gold-divider mb-5" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5">
        {CATEGORIES.map(({ key, label }) => {
          const value = ratings[key as keyof AccommodationRatings] as number
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-dark/70">{label}</span>
                <span className="text-sm font-semibold text-dark">{value.toFixed(1)}</span>
              </div>
              <div className="h-1 bg-beige-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-dark rounded-full"
                  style={{ width: `${(value / 5) * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
