import Link from 'next/link'
import Image from 'next/image'
import { Users, BedDouble, Bath, MapPin, Star } from 'lucide-react'
import { formatPrice, getTypeLabel, resolveImageUrl } from '@/lib/utils'
import type { Accommodation } from '@/lib/types'

interface Props {
  accommodation: Accommodation
}

export default function AccommodationCard({ accommodation: acc }: Props) {
  return (
    <Link href={`/hebergements/${acc.slug}`} className="group block">
      <article className="card h-full flex flex-col">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={resolveImageUrl(acc.images?.[0]) || 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'}
            alt={acc.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-dark/40 via-transparent to-transparent" />

          {/* Type badge */}
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-dark text-xs font-medium rounded-full">
              {getTypeLabel(acc.type)}
            </span>
          </div>

          {/* Featured badge */}
          {acc.featured && (
            <div className="absolute top-3 right-3">
              <span className="flex items-center gap-1 px-2.5 py-1 bg-gold-500 text-white text-xs font-medium rounded-full">
                <Star size={10} fill="currentColor" />
                Coup de cœur
              </span>
            </div>
          )}

          {/* Partner name */}
          <div className="absolute bottom-3 left-3">
            <span className="text-white/90 text-xs font-medium drop-shadow">
              {acc.partner?.name}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          {/* Location */}
          <div className="flex items-center gap-1 text-dark/50 text-xs mb-2">
            <MapPin size={11} />
            <span>{acc.location}</span>
          </div>

          {/* Name */}
          <h3 className="font-serif text-lg font-semibold text-dark mb-2 group-hover:text-gold-600 transition-colors line-clamp-1">
            {acc.name}
          </h3>

          {/* Description */}
          <p className="text-dark/60 text-sm leading-relaxed line-clamp-2 mb-4 flex-1">
            {acc.short_description}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-dark/50 mb-4">
            <span className="flex items-center gap-1">
              <Users size={12} className="text-gold-500" />
              {acc.capacity} pers.
            </span>
            <span className="flex items-center gap-1">
              <BedDouble size={12} className="text-gold-500" />
              {acc.bedrooms} ch.
            </span>
            <span className="flex items-center gap-1">
              <Bath size={12} className="text-gold-500" />
              {acc.bathrooms} sdb.
            </span>
          </div>

          {/* Price */}
          <div className="flex items-end justify-between pt-4 border-t border-beige-200">
            <div>
              <span className="text-xl font-semibold text-dark">
                {formatPrice(acc.price_per_night)}
              </span>
              <span className="text-dark/50 text-xs ml-1">/nuit</span>
            </div>
            <span className="text-xs font-medium text-gold-600 group-hover:underline">
              Voir détails →
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
