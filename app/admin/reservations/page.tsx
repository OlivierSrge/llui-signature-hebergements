export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import Link from 'next/link'
import { ArrowRight, Filter, Handshake, Plus, MessageCircle, AlertTriangle, Download } from 'lucide-react'
import {
  formatDate, formatPrice, getReservationStatusColor, getReservationStatusLabel,
  getPaymentStatusColor, getPaymentStatusLabel, getPaymentMethodLabel,
} from '@/lib/utils'

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

const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

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

      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        {reservations.length === 0 ? (
          <div className="text-center py-16 text-dark/40"><p>Aucune réservation trouvée</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-beige-200 bg-beige-50">
                  {['Réf.', 'Client', 'Hébergement', 'Dates', 'Total', 'Pipeline', 'Paiement', 'Statut', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-dark/50 font-semibold uppercase tracking-widest first:pl-6 last:pr-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservations.map((res) => {
                  const isPaid = res.payment_status === 'paye'
                  const isConfirmed = res.reservation_status === 'confirmee'
                  const step1 = !!res.whatsapp_proposal_sent_at || isPaid || isConfirmed
                  const step2 = !!res.whatsapp_payment_request_sent_at || isPaid || isConfirmed
                  const step3 = isPaid
                  const step4 = !!res.whatsapp_confirmation_sent_at || isConfirmed
                  const isAlert = !!res.whatsapp_payment_request_sent_at && !isPaid && res.whatsapp_payment_request_sent_at < cutoff24h && res.reservation_status !== 'annulee'

                  return (
                    <tr key={res.id} className={`border-b border-beige-100 hover:bg-beige-50 transition-colors ${isAlert ? 'bg-orange-50/50' : ''}`}>
                      <td className="px-4 pl-6 py-4">
                        <p className="font-mono text-xs font-bold text-gold-600">#{res.id.slice(-8).toUpperCase()}</p>
                        <p className="text-xs text-dark/40">{formatDate(res.created_at, 'dd/MM/yy')}</p>
                        {res.source === 'partenaire' && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">
                            <Handshake size={10} /> Partenaire
                          </span>
                        )}
                        {isAlert && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
                            <AlertTriangle size={9} /> +24h
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-dark">{res.guest_first_name} {res.guest_last_name}</p>
                        <p className="text-xs text-dark/40">{res.guest_phone}</p>
                      </td>
                      <td className="px-4 py-4 max-w-[130px]">
                        <p className="text-dark/70 truncate">{res.accommodation?.name || res.pack_name || '—'}</p>
                        <p className="text-xs text-dark/40 truncate">{res.accommodation?.partner?.name}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-dark/60">
                        <p>{res.check_in ? formatDate(res.check_in, 'dd/MM/yy') : '—'}</p>
                        <p>{res.check_out ? formatDate(res.check_out, 'dd/MM/yy') : '—'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-dark">{formatPrice(res.total_price)}</p>
                        <p className="text-xs text-gold-600 font-medium">{formatPrice(res.commission_amount)} comm.</p>
                      </td>
                      {/* Pipeline visual */}
                      <td className="px-4 py-4">
                        <div className="flex gap-1">
                          {[step1, step2, step3, step4].map((done, i) => (
                            <div key={i} title={['Proposition', 'Paiement demandé', 'Paiement confirmé', 'Fiche envoyée'][i]}
                              className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center
                              ${done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                              {done ? '✓' : i + 1}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge text-xs ${getPaymentStatusColor(res.payment_status)}`}>{getPaymentStatusLabel(res.payment_status)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge ${getReservationStatusColor(res.reservation_status)}`}>{getReservationStatusLabel(res.reservation_status)}</span>
                      </td>
                      <td className="px-4 pr-6 py-4">
                        <Link href={`/admin/reservations/${res.id}`} className="text-gold-600 hover:text-gold-700 p-1.5 rounded-lg hover:bg-gold-50 transition-colors inline-flex">
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
