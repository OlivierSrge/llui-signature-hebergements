export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import Link from 'next/link'
import {
  TrendingUp, Clock, CalendarDays, Home, ArrowRight, Package,
  Percent,
} from 'lucide-react'
import { formatPrice, formatDate, getReservationStatusColor, getReservationStatusLabel } from '@/lib/utils'
import type { AdminStats } from '@/lib/types'

async function getAdminStats(): Promise<AdminStats> {
  const snap = await db.collection('reservations').get()
  const reservations = snap.docs.map((d) => d.data())
  const confirmed = reservations.filter((r) => r.reservation_status === 'confirmee')
  return {
    total_reservations: reservations.length,
    pending_reservations: reservations.filter((r) => r.reservation_status === 'en_attente').length,
    confirmed_reservations: confirmed.length,
    cancelled_reservations: reservations.filter((r) => r.reservation_status === 'annulee').length,
    total_revenue: confirmed.reduce((sum, r) => sum + (r.total_price || 0), 0),
    total_commission: confirmed.reduce((sum, r) => sum + (r.commission_amount || 0), 0),
    pending_payment: confirmed
      .filter((r) => r.payment_status === 'en_attente')
      .reduce((sum, r) => sum + (r.commission_amount || 0), 0),
  }
}

async function getRecentReservations() {
  const snap = await db.collection('reservations').get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => b.created_at?.localeCompare(a.created_at) || 0)
    .slice(0, 8) as any[]
}

async function getPackRequestsData() {
  const snap = await db.collection('pack_requests').get()
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
  const sorted = all.sort((a, b) => b.created_at?.localeCompare(a.created_at) || 0)
  return {
    nouveau: all.filter((r) => r.status === 'nouveau').length,
    recent: sorted.slice(0, 5),
  }
}

export const metadata = { title: 'Dashboard' }

export default async function AdminDashboard() {
  const [stats, recent, packRequests] = await Promise.all([getAdminStats(), getRecentReservations(), getPackRequestsData()])

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-dark">Dashboard</h1>
        <p className="text-dark/50 text-sm mt-1">Vue d&apos;ensemble — L&amp;Lui Signature</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <KpiCard title="Total réservations" value={String(stats.total_reservations)} icon={CalendarDays} color="bg-blue-50 text-blue-600" sub={`${stats.confirmed_reservations} confirmées`} />
        <KpiCard title="En attente" value={String(stats.pending_reservations)} icon={Clock} color="bg-amber-50 text-amber-600" sub="À traiter" urgent={stats.pending_reservations > 0} />
        <KpiCard title="Chiffre d'affaires" value={formatPrice(stats.total_revenue)} icon={TrendingUp} color="bg-green-50 text-green-600" sub="Réservations confirmées" />
        <KpiCard title="Commissions L&Lui" value={formatPrice(stats.total_commission)} icon={Percent} color="bg-gold-50 text-gold-600" sub={`${formatPrice(stats.pending_payment)} à encaisser`} />
        <KpiCard title="Demandes pack" value={String(packRequests.nouveau)} icon={Package} color="bg-purple-50 text-purple-600" sub="Nouvelles demandes" urgent={packRequests.nouveau > 0} />
      </div>

      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-beige-200 flex items-center justify-between">
          <h2 className="font-semibold text-dark">Réservations récentes</h2>
          <Link href="/admin/reservations" className="text-sm text-gold-600 hover:text-gold-700 flex items-center gap-1">
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="text-center py-12 text-dark/40">
            <CalendarDays size={32} className="mx-auto mb-3 opacity-30" />
            <p>Aucune réservation pour l&apos;instant</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-beige-200">
                  {['Réf.', 'Client', 'Hébergement', 'Dates', 'Total', 'Statut'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs text-dark/50 font-semibold uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((res) => (
                  <tr key={res.id} className="border-b border-beige-100 hover:bg-beige-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/admin/reservations/${res.id}`} className="font-mono text-xs font-bold text-gold-600 hover:underline">
                        #{res.id.slice(-8).toUpperCase()}
                      </Link>
                      <p className="text-xs text-dark/40 mt-0.5">{formatDate(res.created_at, 'dd/MM')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-dark">{res.guest_first_name} {res.guest_last_name}</p>
                      <p className="text-xs text-dark/40">{res.guest_email}</p>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <p className="text-dark/70 truncate max-w-[140px]">{res.accommodation?.name}</p>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-dark/60">
                      {formatDate(res.check_in, 'dd/MM')} → {formatDate(res.check_out, 'dd/MM/yy')}
                    </td>
                    <td className="px-6 py-4 font-semibold text-dark">{formatPrice(res.total_price)}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${getReservationStatusColor(res.reservation_status)}`}>
                        {getReservationStatusLabel(res.reservation_status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pack requests */}
      {packRequests.recent.length > 0 && (
        <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-beige-200 flex items-center justify-between">
            <h2 className="font-semibold text-dark flex items-center gap-2">
              <Package size={16} className="text-purple-500" /> Demandes de packs récentes
            </h2>
            <Link href="/admin/pack-requests" className="text-sm text-gold-600 hover:text-gold-700 flex items-center gap-1">
              Voir tout <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-beige-100">
            {packRequests.recent.map((req: any) => (
              <div key={req.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-beige-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-dark text-sm">{req.first_name} {req.last_name}</p>
                  <p className="text-xs text-dark/50 truncate">{req.pack_name} · {req.email}</p>
                </div>
                {req.promo_code && (
                  <span className="font-mono text-xs font-bold text-gold-600 bg-gold-50 px-2 py-1 rounded-lg hidden sm:block">{req.promo_code}</span>
                )}
                <span className={`badge text-xs px-2.5 py-1 flex-shrink-0 ${req.status === 'nouveau' ? 'bg-purple-100 text-purple-700' : req.status === 'traite' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {req.status === 'nouveau' ? 'Nouveau' : req.status === 'traite' ? 'Traité' : 'Annulé'}
                </span>
                <p className="text-xs text-dark/40 flex-shrink-0 hidden md:block">{formatDate(req.created_at, 'dd/MM')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <Link href="/admin/hebergements/nouveau" className="flex items-center gap-4 p-5 bg-white rounded-xl border border-beige-200 hover:shadow-card transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-gold-100 flex items-center justify-center">
            <Home size={18} className="text-gold-600" />
          </div>
          <div>
            <p className="font-semibold text-dark text-sm">Ajouter un hébergement</p>
            <p className="text-dark/50 text-xs">Créer une nouvelle fiche logement</p>
          </div>
          <ArrowRight size={16} className="text-dark/30 ml-auto" />
        </Link>

        <Link href="/admin/reservations?status=en_attente" className="flex items-center gap-4 p-5 bg-white rounded-xl border border-beige-200 hover:shadow-card transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Clock size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-dark text-sm">Traiter les demandes</p>
            <p className="text-dark/50 text-xs">{stats.pending_reservations} réservation{stats.pending_reservations > 1 ? 's' : ''} en attente</p>
          </div>
          <ArrowRight size={16} className="text-dark/30 ml-auto" />
        </Link>
      </div>
    </div>
  )
}

function KpiCard({ title, value, icon: Icon, color, sub, urgent }: {
  title: string; value: string; icon: React.ElementType; color: string; sub: string; urgent?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${urgent ? 'border-amber-300 shadow-amber-100 shadow-md' : 'border-beige-200'}`}>
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3 bg-opacity-20`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-bold text-dark truncate">{value}</p>
      <p className="text-xs font-medium text-dark/70 mt-0.5">{title}</p>
      <p className="text-xs text-dark/40 mt-1">{sub}</p>
    </div>
  )
}
