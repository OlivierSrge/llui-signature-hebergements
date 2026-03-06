export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import Link from 'next/link'
import {
  TrendingUp, Clock, CalendarDays, Home, ArrowRight, Package,
  Percent, MessageCircle, AlertTriangle, Bell, Plus, Send,
} from 'lucide-react'
import { formatPrice, formatDate, getReservationStatusColor, getReservationStatusLabel } from '@/lib/utils'
import type { AdminStats } from '@/lib/types'
import DailyReportButton from '@/components/admin/DailyReportButton'

async function getAdminStats(): Promise<AdminStats> {
  const snap = await db.collection('reservations').get()
  const reservations = snap.docs.map((d) => d.data())
  const confirmed = reservations.filter((r) => r.reservation_status === 'confirmee')
  return {
    total_reservations: reservations.length,
    pending_reservations: reservations.filter((r) => ['en_attente', 'demande'].includes(r.reservation_status)).length,
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
    .slice(0, 6) as any[]
}

async function getPendingDemands() {
  const snap = await db.collection('demandes_disponibilite')
    .where('status', '==', 'en_attente')
    .get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => b.created_at?.localeCompare(a.created_at) || 0) as any[]
}

async function getPackRequestsData() {
  const snap = await db.collection('pack_requests').get()
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
  const sorted = all.sort((a, b) => b.created_at?.localeCompare(a.created_at) || 0)
  return {
    nouveau: all.filter((r) => r.status === 'nouveau').length,
    recent: sorted.slice(0, 3),
  }
}

async function get24hPaymentAlerts() {
  const snap = await db.collection('reservations').get()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r: any) =>
      r.whatsapp_payment_request_sent_at &&
      r.whatsapp_payment_request_sent_at < cutoff &&
      r.payment_status !== 'paye' &&
      r.reservation_status !== 'annulee'
    ) as any[]
}

async function getDailyReport() {
  const todayStr = new Date().toISOString().split('T')[0]
  const snap = await db.collection('reservations').get()
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
  const todayPaid = all.filter((r: any) => r.payment_date?.startsWith(todayStr))
  const demandesSnap = await db.collection('demandes_disponibilite')
    .where('status', '==', 'en_attente').get()
  return {
    reservations_today: all.filter((r: any) => r.created_at?.startsWith(todayStr)).length,
    payments_today: todayPaid.length,
    revenue_today: todayPaid.reduce((s: number, r: any) => s + (r.total_price || 0), 0),
    commissions_today: todayPaid.reduce((s: number, r: any) => s + (r.commission_amount || 0), 0),
    pending_demands: demandesSnap.size,
  }
}

export const metadata = { title: 'Dashboard' }

export default async function AdminDashboard() {
  const [stats, recent, pendingDemands, packRequests, alerts, daily] = await Promise.all([
    getAdminStats(),
    getRecentReservations(),
    getPendingDemands(),
    getPackRequestsData(),
    get24hPaymentAlerts(),
    getDailyReport(),
  ])

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-dark">Dashboard</h1>
          <p className="text-dark/50 text-sm mt-1">Vue d&apos;ensemble — L&amp;Lui Signature</p>
        </div>
        <DailyReportButton dailyData={daily} />
      </div>

      {/* Alertes 24h */}
      {alerts.length > 0 && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-300 rounded-2xl">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-orange-800 text-sm">
                {alerts.length} demande{alerts.length > 1 ? 's' : ''} de paiement sans réponse depuis +24h
              </p>
              <div className="mt-2 space-y-1">
                {alerts.slice(0, 3).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <p className="text-xs text-orange-700">
                      {r.guest_first_name} {r.guest_last_name} — {r.accommodation?.name} — {formatPrice(r.total_price)}
                    </p>
                    <Link
                      href={`/admin/reservations/${r.id}`}
                      className="text-xs font-medium text-orange-600 underline hover:text-orange-800"
                    >
                      Relancer →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <KpiCard title="Total réservations" value={String(stats.total_reservations)} icon={CalendarDays} color="bg-blue-50 text-blue-600" sub={`${stats.confirmed_reservations} confirmées`} />
        <KpiCard title="En attente" value={String(stats.pending_reservations)} icon={Clock} color="bg-amber-50 text-amber-600" sub="À traiter" urgent={stats.pending_reservations > 0} />
        <KpiCard title="Chiffre d'affaires" value={formatPrice(stats.total_revenue)} icon={TrendingUp} color="bg-green-50 text-green-600" sub="Réservations confirmées" />
        <KpiCard title="Commissions L&Lui" value={formatPrice(stats.total_commission)} icon={Percent} color="bg-gold-50 text-gold-600" sub={`${formatPrice(stats.pending_payment)} à encaisser`} />
        <KpiCard title="Demandes clients" value={String(pendingDemands.length)} icon={Bell} color="bg-red-50 text-red-600" sub="Disponibilité demandée" urgent={pendingDemands.length > 0} />
      </div>

      {/* Rapport journalier */}
      <div className="bg-white rounded-2xl border border-beige-200 p-5 mb-6">
        <h2 className="font-semibold text-dark mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-gold-500" /> Rapport du jour — {new Date().toLocaleDateString('fr-FR')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
          <div className="text-center p-3 bg-beige-50 rounded-xl">
            <p className="text-xl font-bold text-dark">{daily.reservations_today}</p>
            <p className="text-xs text-dark/50">Nouvelles rés.</p>
          </div>
          <div className="text-center p-3 bg-beige-50 rounded-xl">
            <p className="text-xl font-bold text-dark">{daily.payments_today}</p>
            <p className="text-xs text-dark/50">Paiements reçus</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <p className="text-base font-bold text-green-700">{formatPrice(daily.revenue_today)}</p>
            <p className="text-xs text-dark/50">Revenu du jour</p>
          </div>
          <div className="text-center p-3 bg-gold-50 rounded-xl">
            <p className="text-base font-bold text-gold-700">{formatPrice(daily.commissions_today)}</p>
            <p className="text-xs text-dark/50">Commissions</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-xl">
            <p className="text-xl font-bold text-red-600">{daily.pending_demands}</p>
            <p className="text-xs text-dark/50">Demandes en att.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Demandes en attente */}
        <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-beige-200 flex items-center justify-between">
            <h2 className="font-semibold text-dark flex items-center gap-2">
              <Bell size={16} className="text-red-500" /> Demandes en attente
              {pendingDemands.length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {pendingDemands.length}
                </span>
              )}
            </h2>
            <Link href="/admin/demandes" className="text-xs text-gold-600 hover:text-gold-700 flex items-center gap-1">
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>
          {pendingDemands.length === 0 ? (
            <div className="py-10 text-center text-dark/40 text-sm">Aucune demande en attente</div>
          ) : (
            <div className="divide-y divide-beige-100">
              {pendingDemands.slice(0, 5).map((req: any) => (
                <div key={req.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-dark text-sm">{req.guest_first_name} {req.guest_last_name}</p>
                    <p className="text-xs text-dark/50 truncate">{req.product_name}</p>
                    {req.check_in && <p className="text-xs text-dark/40">{formatDate(req.check_in, 'dd/MM')} → {req.check_out && formatDate(req.check_out, 'dd/MM/yyyy')} · {req.guests} pers.</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/admin/reservations/nouvelle?from_demand=${req.id}&product_id=${req.product_id}&check_in=${req.check_in}&check_out=${req.check_out}&guests=${req.guests}&first_name=${req.guest_first_name}&last_name=${req.guest_last_name}&phone=${req.guest_phone}`}
                      className="text-xs bg-gold-500 text-white px-2.5 py-1 rounded-lg hover:bg-gold-600 flex items-center gap-1 whitespace-nowrap"
                    >
                      <Plus size={10} /> Créer réservation
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline réservations récentes */}
        <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-beige-200 flex items-center justify-between">
            <h2 className="font-semibold text-dark flex items-center gap-2">
              <MessageCircle size={16} className="text-green-500" /> Pipeline récent
            </h2>
            <Link href="/admin/reservations" className="text-xs text-gold-600 hover:text-gold-700 flex items-center gap-1">
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-beige-100">
            {recent.slice(0, 5).map((res: any) => {
              const isPaid = res.payment_status === 'paye'
              const isConfirmed = res.reservation_status === 'confirmee'
              const step1 = !!res.whatsapp_proposal_sent_at || isPaid || isConfirmed
              const step2 = !!res.whatsapp_payment_request_sent_at || isPaid || isConfirmed
              const step3 = isPaid
              const step4 = !!res.whatsapp_confirmation_sent_at || isConfirmed
              return (
                <Link key={res.id} href={`/admin/reservations/${res.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-beige-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark">{res.guest_first_name} {res.guest_last_name}</p>
                    <p className="text-xs text-dark/40 truncate">{res.accommodation?.name}</p>
                  </div>
                  <div className="flex gap-1 items-center flex-shrink-0">
                    {[step1, step2, step3, step4].map((done, i) => (
                      <div key={i} className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center
                        ${done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {done ? '✓' : i + 1}
                      </div>
                    ))}
                  </div>
                  <span className={`badge text-xs px-2 py-0.5 flex-shrink-0 ${getReservationStatusColor(res.reservation_status)}`}>
                    {getReservationStatusLabel(res.reservation_status)}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Pack requests */}
      {packRequests.recent.length > 0 && (
        <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-beige-200 flex items-center justify-between">
            <h2 className="font-semibold text-dark flex items-center gap-2">
              <Package size={16} className="text-purple-500" /> Demandes de packs
              {packRequests.nouveau > 0 && (
                <span className="bg-purple-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{packRequests.nouveau}</span>
              )}
            </h2>
            <Link href="/admin/pack-requests" className="text-xs text-gold-600 hover:text-gold-700 flex items-center gap-1">Voir tout <ArrowRight size={12} /></Link>
          </div>
          <div className="divide-y divide-beige-100">
            {packRequests.recent.map((req: any) => (
              <div key={req.id} className="px-6 py-3 flex items-center gap-4 hover:bg-beige-50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-dark text-sm">{req.first_name} {req.last_name}</p>
                  <p className="text-xs text-dark/50 truncate">{req.pack_name} · {req.email}</p>
                </div>
                <span className={`badge text-xs px-2.5 py-1 flex-shrink-0 ${req.status === 'nouveau' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                  {req.status === 'nouveau' ? 'Nouveau' : 'Traité'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/admin/hebergements/nouveau" className="flex items-center gap-4 p-5 bg-white rounded-xl border border-beige-200 hover:shadow-card transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-gold-100 flex items-center justify-center"><Home size={18} className="text-gold-600" /></div>
          <div><p className="font-semibold text-dark text-sm">Ajouter un hébergement</p><p className="text-dark/50 text-xs">Créer une nouvelle fiche logement</p></div>
          <ArrowRight size={16} className="text-dark/30 ml-auto" />
        </Link>
        <Link href="/admin/reservations?status=en_attente" className="flex items-center gap-4 p-5 bg-white rounded-xl border border-beige-200 hover:shadow-card transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Clock size={18} className="text-amber-600" /></div>
          <div><p className="font-semibold text-dark text-sm">Traiter les demandes</p><p className="text-dark/50 text-xs">{stats.pending_reservations} en attente</p></div>
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
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-bold text-dark truncate">{value}</p>
      <p className="text-xs font-medium text-dark/70 mt-0.5">{title}</p>
      <p className="text-xs text-dark/40 mt-1">{sub}</p>
    </div>
  )
}
