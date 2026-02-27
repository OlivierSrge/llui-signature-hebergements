import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Edit, Calendar, Users, Percent } from 'lucide-react'
import { formatPrice, getTypeLabel } from '@/lib/utils'
import type { Accommodation } from '@/lib/types'

async function getAccommodations(): Promise<Accommodation[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('accommodations')
    .select('*, partner:partners(name)')
    .order('created_at', { ascending: false })
  return data || []
}

export const metadata = { title: 'Hébergements' }

export default async function AdminHebergementsPage() {
  const accommodations = await getAccommodations()

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-dark">Hébergements</h1>
          <p className="text-dark/50 text-sm mt-1">{accommodations.length} logement{accommodations.length > 1 ? 's' : ''}</p>
        </div>
        <Link href="/admin/hebergements/nouveau" className="btn-primary">
          <Plus size={16} />
          Nouveau
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {accommodations.map((acc) => (
          <AccommodationAdminCard key={acc.id} accommodation={acc} />
        ))}
      </div>

      {accommodations.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-beige-200">
          <div className="text-5xl mb-4">🏠</div>
          <h3 className="font-serif text-xl text-dark mb-4">Aucun hébergement</h3>
          <Link href="/admin/hebergements/nouveau" className="btn-primary">
            Créer le premier hébergement
          </Link>
        </div>
      )}
    </div>
  )
}

function AccommodationAdminCard({ accommodation: acc }: { accommodation: Accommodation }) {
  const statusColor = acc.status === 'active'
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-700'

  return (
    <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden hover:shadow-card transition-shadow">
      <div className="relative aspect-video">
        <Image
          src={acc.images[0] || 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'}
          alt={acc.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 50vw"
        />
        <div className="absolute top-3 left-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>
            {acc.status === 'active' ? 'Actif' : 'Inactif'}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="text-xs font-medium px-2.5 py-1 bg-white/90 text-dark rounded-full">
            {getTypeLabel(acc.type)}
          </span>
        </div>
      </div>

      <div className="p-5">
        <p className="text-xs text-dark/50 mb-1">{(acc.partner as any)?.name}</p>
        <h3 className="font-semibold text-dark mb-3 line-clamp-1">{acc.name}</h3>

        <div className="grid grid-cols-3 gap-2 text-xs text-dark/60 mb-4">
          <span className="flex items-center gap-1">
            <Users size={11} className="text-gold-500" />
            {acc.capacity} pers.
          </span>
          <span className="flex items-center gap-1">
            <Percent size={11} className="text-gold-500" />
            {acc.commission_rate}%
          </span>
          <span className="font-medium text-dark">
            {formatPrice(acc.price_per_night)}/n
          </span>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/admin/hebergements/${acc.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-beige-100 text-dark/70 rounded-lg text-xs font-medium hover:bg-beige-200 transition-colors"
          >
            <Edit size={12} />
            Modifier
          </Link>
          <Link
            href={`/admin/hebergements/${acc.id}/disponibilites`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-gold-50 text-gold-700 rounded-lg text-xs font-medium hover:bg-gold-100 transition-colors border border-gold-200"
          >
            <Calendar size={12} />
            Disponibilités
          </Link>
        </div>
      </div>
    </div>
  )
}
