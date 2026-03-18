export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import Link from 'next/link'
import { Filter, Plus, Download } from 'lucide-react'
import ReservationsTable from '@/components/admin/ReservationsTable'

async function getReservations(status?: string, source?: string) {
  const snap = await db.collection('reservations').get()
  let reservations = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => b.created_at?.localeCompare(a.created_at) || 0) as any[]

  if (status && ['demande', 'en_attente', 'confirmee', 'annulee'].includes(status)) {
    reservations = reservations.filter((r) => r.reservation_status === status)
  }
  if (source && ['direct', 'partenaire', 'admin'].includes(source)) {
    reservations = reservations.filter((r) => r.source === source)
  }
  return reservations
}

const STATUS_FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'demande', label: 'Demandes' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'confirmee', label: 'Confirmées' },
  { value: 'annulee', label: 'Annulées' },
]

const SOURCE_FILTERS = [
  { value: '', label: 'Toutes sources' },
  { value: 'direct', label: 'Direct' },
  { value: 'partenaire', label: 'Partenaire' },
  { value: 'admin', label: 'Admin' },
]

export const metadata = { title: 'Réservations' }

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string }>
}) {
  const sp = await searchParams
  const reservations = await getReservations(sp.status, sp.source)

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-dark">Réservations</h1>
          <p className="text-dark/50 text-sm mt-1">{reservations.length} réservation{reservations.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/export/reservations${sp.status || sp.source ? `?${sp.status ? `status=${sp.status}` : ''}${sp.status && sp.source ? '&' : ''}${sp.source ? `source=${sp.source}` : ''}` : ''}`}
            download
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-beige-200 text-dark/60 rounded-xl text-sm font-medium hover:border-dark/30 transition-colors"
          >
            <Download size={15} /> Exporter CSV
          </a>
          <Link href="/admin/reservations/nouvelle" className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> Nouvelle réservation
          </Link>
        </div>
      </div>

      {/* Filtres statut */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Filter size={14} className="text-dark/40" />
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/reservations?status=${f.value}${sp.source ? `&source=${sp.source}` : ''}` : `/admin/reservations${sp.source ? `?source=${sp.source}` : ''}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              (sp.status || '') === f.value
                ? 'bg-dark text-white'
                : 'bg-white text-dark/60 border border-beige-200 hover:border-dark/30'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Filtres source */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {SOURCE_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/reservations?source=${f.value}${sp.status ? `&status=${sp.status}` : ''}` : `/admin/reservations${sp.status ? `?status=${sp.status}` : ''}`}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              (sp.source || '') === f.value
                ? 'bg-gold-500 text-white'
                : 'bg-white text-dark/50 border border-beige-200 hover:border-gold-300'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <ReservationsTable reservations={reservations} />
    </div>
  )
}
