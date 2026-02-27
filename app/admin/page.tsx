import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  TrendingUp, Clock, CheckCircle, XCircle,
  DollarSign, Percent, CalendarDays, Home, ArrowRight
} from 'lucide-react'
import { formatPrice, formatDate, getReservationStatusColor, getReservationStatusLabel } from '@/lib/utils'
import type { AdminStats, Reservation } from '@/lib/types'

async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient()
  const { data } = await supabase.from('admin_stats').select('*').single()
  return data || {
    total_reservations: 0, pending_reservations: 0, confirmed_reservations: 0,
    cancelled_reservations: 0, total_revenue: 0, total_commission: 0, pending_payment: 0,
  }
}

async function getRecentReservations(): Promise<Reservation[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reservations')
    .select('*, accommodation:accommodations(name, images)')
    .order('created_at', { ascending: false })
    .limit(8)
  return data || []
}

export const metadata = { title: 'Dashboard' }

export default async function AdminDashboard() {
  const [stats, recent] = await Promise.all([getAdminStats(), getRecentReservations()])

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-dark">Dashboard</h1>
        <p className="text-dark/50 text-sm mt-1">
          Vue d&apos;ensemble — L&amp;Lui Signature
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Total réservations"
          value={String(stats.total_reservations)}
          icon={CalendarDays}
          color="bg-blue-50 text-blue-600"
          sub={`${stats.confirmed_reservations} confirmées`}
        />
        <KpiCard
          title="En attente"
          value={String(stats.pending_reservations)}
          icon={Clock}
          color="bg-amber-50 text-amber-600"
          sub="À traiter"
          urgent={stats.pending_reservations > 0}
        />
        <KpiCard
          title="Chiffre d'affaires"
          value={formatPrice(stats.total_revenue)}
          icon={TrendingUp}
          color="bg-green-50 text-green-600"
          sub="Réservations confirmées"
        />
        <KpiCard
          title="Commissions L&Lui"
          value={formatPrice(stats.total_commission)}
          icon={Percent}
          color="bg-gold-50 text-gold-600"
          sub={`${formatPrice(stats.pending_payment)} à encaisser`}
        />
      </div>

      {/* Recent reservations */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-beige-200 flex items-center justify-between">
          <h2 className="font-semibold text-dark">Réservations récentes</h2>
          <Link
            href="/admin/reservations"
            className="text-sm text-gold-600 hover:text-gold-700 flex items-center gap-1"
          >
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
                  <th className="text-left px-6 py-3 text-xs text-dark/50 font-semibold uppercase tracking-widest">
                    Réf.
                  </th>
                  <th className="text-left px-6 py-3 text-xs text-dark/50 font-semibold uppercase tracking-widest">
                    Client
                  </th>
                  <th className="text-left px-6 py-3 text-xs text-dark/50 font-semibold uppercase tracking-widest hidden md:table-cell">
                    Hébergement
                  </th>
                  <th className="text-left px-6 py-3 text-xs text-dark/50 font-semibold uppercase tracking-widest hidden lg:table-cell">
                    Dates
                  </th>
                  <th className="text-right px-6 py-3 text-xs text-dark/50 font-semibold uppercase tracking-widest">
                    Total
                  </th>
                  <th className="text-center px-6 py-3 text-xs text-dark/50 font-semibold uppercase tracking-widest">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((res) => {
                  const acc = res.accommodation as any
                  return (
                    <tr
                      key={res.id}
                      className="border-b border-beige-100 hover:bg-beige-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/reservations/${res.id}`}
                          className="font-mono text-xs font-bold text-gold-600 hover:underline"
                        >
                          #{res.id.slice(-8).toUpperCase()}
                        </Link>
                        <p className="text-xs text-dark/40 mt-0.5">
                          {formatDate(res.created_at, 'dd/MM')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-dark">
                          {res.guest_first_name} {res.guest_last_name}
                        </p>
                        <p className="text-xs text-dark/40">{res.guest_email}</p>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <p className="text-dark/70 truncate max-w-[140px]">{acc?.name}</p>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell text-dark/60">
                        {formatDate(res.check_in, 'dd/MM')} → {formatDate(res.check_out, 'dd/MM/yy')}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-dark">
                        {formatPrice(res.total_price)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`badge ${getReservationStatusColor(res.reservation_status)}`}>
                          {getReservationStatusLabel(res.reservation_status)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <Link
          href="/admin/hebergements/nouveau"
          className="flex items-center gap-4 p-5 bg-white rounded-xl border border-beige-200 hover:shadow-card transition-shadow"
        >
          <div className="w-10 h-10 rounded-xl bg-gold-100 flex items-center justify-center">
            <Home size={18} className="text-gold-600" />
          </div>
          <div>
            <p className="font-semibold text-dark text-sm">Ajouter un hébergement</p>
            <p className="text-dark/50 text-xs">Créer une nouvelle fiche logement</p>
          </div>
          <ArrowRight size={16} className="text-dark/30 ml-auto" />
        </Link>

        <Link
          href="/admin/reservations?status=en_attente"
          className="flex items-center gap-4 p-5 bg-white rounded-xl border border-beige-200 hover:shadow-card transition-shadow"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Clock size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-dark text-sm">Traiter les demandes</p>
            <p className="text-dark/50 text-xs">
              {stats.pending_reservations} réservation{stats.pending_reservations > 1 ? 's' : ''} en attente
            </p>
          </div>
          <ArrowRight size={16} className="text-dark/30 ml-auto" />
        </Link>
      </div>
    </div>
  )
}

function KpiCard({
  title, value, icon: Icon, color, sub, urgent,
}: {
  title: string; value: string; icon: React.ElementType
  color: string; sub: string; urgent?: boolean
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
