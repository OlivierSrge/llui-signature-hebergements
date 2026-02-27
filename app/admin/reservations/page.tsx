import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, Filter } from 'lucide-react'
import {
  formatDate, formatPrice, getReservationStatusColor, getReservationStatusLabel,
  getPaymentStatusColor, getPaymentStatusLabel, getPaymentMethodLabel,
} from '@/lib/utils'
import type { Reservation, ReservationStatus } from '@/lib/types'

async function getReservations(status?: string): Promise<Reservation[]> {
  const supabase = await createClient()
  let query = supabase
    .from('reservations')
    .select('*, accommodation:accommodations(name, images, partner:partners(name))')
    .order('created_at', { ascending: false })

  if (status && ['en_attente', 'confirmee', 'annulee'].includes(status)) {
    query = query.eq('reservation_status', status)
  }

  const { data } = await query
  return data || []
}

const STATUS_FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'confirmee', label: 'Confirmées' },
  { value: 'annulee', label: 'Annulées' },
]

export const metadata = { title: 'Réservations' }

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const sp = await searchParams
  const reservations = await getReservations(sp.status)

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-dark">Réservations</h1>
        <p className="text-dark/50 text-sm mt-1">{reservations.length} réservation{reservations.length > 1 ? 's' : ''}</p>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Filter size={14} className="text-dark/40" />
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/reservations?status=${f.value}` : '/admin/reservations'}
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        {reservations.length === 0 ? (
          <div className="text-center py-16 text-dark/40">
            <p>Aucune réservation trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-beige-200 bg-beige-50">
                  {['Réf.', 'Client', 'Hébergement', 'Dates', 'Total / Commission', 'Paiement', 'Statut', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-dark/50 font-semibold uppercase tracking-widest first:pl-6 last:pr-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservations.map((res) => {
                  const acc = res.accommodation as any
                  return (
                    <tr
                      key={res.id}
                      className="border-b border-beige-100 hover:bg-beige-50 transition-colors"
                    >
                      <td className="px-4 pl-6 py-4">
                        <p className="font-mono text-xs font-bold text-gold-600">
                          #{res.id.slice(-8).toUpperCase()}
                        </p>
                        <p className="text-xs text-dark/40">
                          {formatDate(res.created_at, 'dd/MM/yy')}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-dark">
                          {res.guest_first_name} {res.guest_last_name}
                        </p>
                        <p className="text-xs text-dark/40">{res.guest_phone}</p>
                      </td>
                      <td className="px-4 py-4 max-w-[140px]">
                        <p className="text-dark/70 truncate">{acc?.name}</p>
                        <p className="text-xs text-dark/40 truncate">{acc?.partner?.name}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-dark/60">
                        <p>{formatDate(res.check_in, 'dd/MM/yy')}</p>
                        <p>{formatDate(res.check_out, 'dd/MM/yy')}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-dark">{formatPrice(res.total_price)}</p>
                        <p className="text-xs text-gold-600 font-medium">
                          {formatPrice(res.commission_amount)} comm.
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge text-xs ${getPaymentStatusColor(res.payment_status)}`}>
                          {getPaymentStatusLabel(res.payment_status)}
                        </span>
                        <p className="text-xs text-dark/40 mt-1">
                          {getPaymentMethodLabel(res.payment_method)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge ${getReservationStatusColor(res.reservation_status)}`}>
                          {getReservationStatusLabel(res.reservation_status)}
                        </span>
                      </td>
                      <td className="px-4 pr-6 py-4">
                        <Link
                          href={`/admin/reservations/${res.id}`}
                          className="text-gold-600 hover:text-gold-700 p-1.5 rounded-lg hover:bg-gold-50 transition-colors inline-flex"
                        >
                          <ArrowRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
