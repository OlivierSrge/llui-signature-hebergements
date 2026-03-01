import Link from 'next/link'
import Image from 'next/image'
import { Users, Building2, Star } from 'lucide-react'
import { resolveImageUrl } from '@/lib/utils'
import type { Pack } from '@/lib/types'

const PACK_TYPE_CONFIG = {
  f3: { label: 'Pack F3', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  vip: { label: 'Pack VIP', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  signature: { label: 'Pack Signature', color: 'bg-gold-50 text-gold-700 border-gold-200' },
}

interface Props {
  pack: Pack
}

export default function PackCard({ pack }: Props) {
  const config = PACK_TYPE_CONFIG[pack.pack_type]
  const fallback = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'

  return (
    <Link href={`/packs/${pack.slug}`} className="group block">
      <article className="card h-full flex flex-col">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={resolveImageUrl(pack.images?.[0]) || fallback}
            alt={pack.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark/40 via-transparent to-transparent" />

          <div className="absolute top-3 left-3">
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full border bg-white/90 backdrop-blur-sm text-dark`}>
              {config.label}
            </span>
          </div>

          {pack.featured && (
            <div className="absolute top-3 right-3">
              <span className="flex items-center gap-1 px-2.5 py-1 bg-gold-500 text-white text-xs font-medium rounded-full">
                <Star size={10} fill="currentColor" />
                Coup de cœur
              </span>
            </div>
          )}

          <div className="absolute bottom-3 left-3">
            <span className="flex items-center gap-1.5 text-white/90 text-xs font-medium drop-shadow">
              <Building2 size={11} />
              {pack.accommodation_ids?.length || 0} logement{(pack.accommodation_ids?.length || 0) > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-serif text-lg font-semibold text-dark mb-2 group-hover:text-gold-600 transition-colors line-clamp-1">
            {pack.name}
          </h3>
          <p className="text-dark/60 text-sm leading-relaxed line-clamp-2 mb-4 flex-1">
            {pack.short_description}
          </p>
          <div className="flex items-center justify-between pt-4 border-t border-beige-200">
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${config.color}`}>
              {config.label}
            </span>
            <span className="text-xs font-medium text-gold-600 group-hover:underline">
              Découvrir →
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
