export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import PackRequestsClient from './PackRequestsClient'

async function getPackRequests(status?: string) {
  let query: any = db.collection('pack_requests')
  if (status) query = query.where('status', '==', status)
  const snap = await query.get()
  return snap.docs
    .map((d: any) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => b.created_at?.localeCompare(a.created_at) || 0) as any[]
}

export const metadata = { title: 'Demandes pack – Admin' }

const STATUSES = [
  { value: '', label: 'Toutes' },
  { value: 'nouveau', label: 'Nouvelles' },
  { value: 'traite', label: 'Traitées' },
  { value: 'annule', label: 'Annulées' },
]

export default async function AdminPackRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const sp = await searchParams
  const requests = await getPackRequests(sp.status)

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-dark">Demandes de packs</h1>
        <p className="text-dark/50 text-sm mt-1">{requests.length} demande{requests.length > 1 ? 's' : ''}</p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUSES.map(({ value, label }) => (
          <Link
            key={value}
            href={value ? `/admin/pack-requests?status=${value}` : '/admin/pack-requests'}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
              (sp.status || '') === value
                ? 'bg-dark text-white border-dark'
                : 'bg-white text-dark/60 border-beige-200 hover:border-beige-300'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <PackRequestsClient requests={requests} />
    </div>
  )
}
