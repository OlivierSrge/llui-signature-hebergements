export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/firebase'
import { Plus, Building2 } from 'lucide-react'
import type { Pack } from '@/lib/types'

const PACK_LABEL: Record<string, string> = {
  f3: 'Pack F3',
  vip: 'Pack VIP',
  signature: 'Pack Signature',
}

async function getPacks(): Promise<Pack[]> {
  const snap = await db.collection('packs').get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Pack)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export const metadata = { title: 'Packs – Admin' }

export default async function AdminPacksPage() {
  const packs = await getPacks()
  const fallback = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-dark">Packs logements</h1>
          <p className="text-dark/50 text-sm mt-1">{packs.length} pack{packs.length > 1 ? 's' : ''} au total</p>
        </div>
        <Link href="/admin/packs/nouveau" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nouveau pack
        </Link>
      </div>

      {packs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-beige-200">
          <Building2 size={40} className="mx-auto mb-4 text-dark/20" />
          <h3 className="font-serif text-xl text-dark mb-2">Aucun pack</h3>
          <p className="text-dark/50 mb-6">Créez votre premier pack logements.</p>
          <Link href="/admin/packs/nouveau" className="btn-primary">Créer un pack</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {packs.map((pack) => (
            <Link key={pack.id} href={`/admin/packs/${pack.id}`} className="group block bg-white rounded-2xl border border-beige-200 hover:shadow-card transition-shadow overflow-hidden">
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={pack.images?.[0] || fallback}
                  alt={pack.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    pack.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {pack.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="px-2.5 py-1 bg-dark/70 text-white text-xs font-medium rounded-full">
                    {PACK_LABEL[pack.pack_type] || pack.pack_type}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-dark mb-1 truncate">{pack.name}</h3>
                <p className="text-dark/50 text-xs mb-2 line-clamp-2">{pack.short_description}</p>
                <div className="flex items-center gap-1 text-xs text-dark/40">
                  <Building2 size={11} />
                  {pack.accommodation_ids?.length || 0} logement{(pack.accommodation_ids?.length || 0) > 1 ? 's' : ''}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
