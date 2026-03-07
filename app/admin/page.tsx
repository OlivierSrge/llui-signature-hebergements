export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import Link from 'next/link'
import {
  TrendingUp, Clock, CalendarDays, Home, ArrowRight, Package,
  Percent, MessageCircle, AlertTriangle, Bell, Plus, Wallet,
  Users, Building2, Cake, Heart,
} from 'lucide-react'
import { formatPrice, formatDate, getReservationStatusColor, getReservationStatusLabel } from '@/lib/utils'
import type { AdminStats } from '@/lib/types'
import DailyReportButton from '@/components/admin/DailyReportButton'
import { getExpiringSubscriptions } from '@/actions/subscriptions'
import { getBirthdayClients, getStayAnniversaryClients } from '@/actions/clients'
import { buildBirthdayWhatsAppUrl, buildStayAnniversaryWhatsAppUrl } from '@/lib/client-utils'
import { RevenueChart, SourcePieChart } from '@/components/admin/DashboardCharts'
import type { RevenueDayData, SourceData } from '@/components/admin/DashboardCharts'
import PaymentRelanceWidget from '@/components/admin/PaymentRelanceWidget'
import type { AlertReservation } from '@/components/admin/PaymentRelanceWidget'

// ── Helpers ────────────────────────────────────────────────────
function formatPhone(phone: string): string {
  const cleaned = (phone || '').replace(/\D/g, '')
  return cleaned.startsWith('237') ? cleaned : `237${cleaned}`
}

function buildRelanceUrl(r: any): string {
  const phone = formatPhone(r.guest_phone || '')
  const name = `${r.guest_first_name} ${r.guest_last_name}`.trim()
  const acc = r.accommodation?.name || r.accommodation_id || ''
  const amount = (r.total_price || 0).toLocaleString('fr-FR')
  const ref = r.confirmation_code || r.id.slice(-8).toUpperCase()
  const msg = `Bonjour ${name}, votre réservation au ${acc} (${r.check_in} → ${r.check_out}) est en attente de paiement de ${amount} FCFA. Merci d'effectuer le paiement via Orange Money au 693407964. Réf : ${ref}.`
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}

// ── Data fetchers ──────────────────────────────────────────────
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

// Widget 2 — Encaissements à recevoir
async function getPendingEncaissements() {
  const snap = await db.collection('reservations').get()
  const pending = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r: any) => r.reservation_status === 'confirmee' && r.payment_status === 'en_attente') as any[]
  return {
    count: pending.length,
    total_amount: pending.reduce((s: number, r: any) => s + (r.total_price || 0), 0),
  }
}

// Widget 1 — Taux d'occupation
async function getOccupancyData() {
  const today = new Date().toISOString().split('T')[0]
  const [accSnap, resSnap] = await Promise.all([
    db.collection('hebergements').where('status', '==', 'active').get(),
    db.collection('reservations').get(),
  ])
  const accommodations = accSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
  const occupiedToday = resSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r: any) =>
      r.reservation_status === 'confirmee' &&
      r.check_in <= today &&
      r.check_out > today
    ) as any[]

  const occupiedAccIds = new Set<string>(occupiedToday.map((r: any) => r.accommodation_id))

  // Fetch partner names for grouping
  const partnerIds = Array.from(new Set<string>(accommodations.map((a: any) => a.partner_id).filter(Boolean)))
  const partnerNames: Record<string, string> = {}
  if (partnerIds.length > 0) {
    const chunks = []
    for (let i = 0; i < partnerIds.length; i += 10) chunks.push(partnerIds.slice(i, i + 10))
    for (const chunk of chunks) {
      const ps = await db.collection('partenaires').where('__name__', 'in', chunk).get()
      ps.docs.forEach((d) => { partnerNames[d.id] = d.data().name })
    }
  }

  const byPartner: Record<string, { partner_name: string; occupied: number; total: number }> = {}
  for (const acc of accommodations) {
    const pid = acc.partner_id || 'direct'
    const name = partnerNames[pid] || 'L&Lui Direct'
    if (!byPartner[pid]) byPartner[pid] = { partner_name: name, occupied: 0, total: 0 }
    byPartner[pid].total++
    if (occupiedAccIds.has(acc.id)) byPartner[pid].occupied++
  }

  const byPartnerArr = Object.entries(byPartner)
    .map(([id, d]) => ({ partner_id: id, ...d, rate: d.total > 0 ? Math.round((d.occupied / d.total) * 100) : 0 }))
    .sort((a, b) => b.rate - a.rate)

  const totalUnits = accommodations.length
  const totalOccupied = Array.from(occupiedAccIds).filter((id) => accommodations.some((a: any) => a.id === id)).length

  return {
    total_occupied: totalOccupied,
    total_units: totalUnits,
    global_rate: totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0,
    by_partner: byPartnerArr,
  }
}

// Widget 4 — Arrivées du jour
async function getTodayArrivals() {
  const today = new Date().toISOString().split('T')[0]
  const snap = await db.collection('reservations').get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r: any) => r.check_in === today && r.reservation_status !== 'annulee')
    .sort((a: any, b: any) => (a.guest_last_name || '').localeCompare(b.guest_last_name || '')) as any[]
}

// Widget 5 — Revenus 30 jours
async function getRevenueLast30Days(): Promise<RevenueDayData[]> {
  const snap = await db.collection('reservations').get()
  const all = snap.docs.map((d) => d.data()) as any[]
  const days: RevenueDayData[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    const dayRevs = all.filter((r) => r.payment_status === 'paye' && r.payment_date?.startsWith(dateStr))
    days.push({
      label,
      revenue: dayRevs.reduce((s, r) => s + (r.total_price || 0), 0),
      commission: dayRevs.reduce((s, r) => s + (r.commission_amount || 0), 0),
    })
  }
  return days
}

// Widget 7 — Performance partenaires (mois en cours)
async function getPartnerPerformance() {
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const snap = await db.collection('reservations').get()
  const paid = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r: any) => r.payment_status === 'paye' && (r.payment_date || '') >= monthStart) as any[]

  const byPartner: Record<string, { partner_id: string; partner_name: string; count: number; revenue: number; commission: number }> = {}
  for (const r of paid) {
    const pid = r.partner_id || r.source || 'direct'
    const name = r.partner_name || (r.source === 'partenaire' ? 'Partenaire' : r.source === 'admin' ? 'Admin' : 'Client direct')
    if (!byPartner[pid]) byPartner[pid] = { partner_id: pid, partner_name: name, count: 0, revenue: 0, commission: 0 }
    byPartner[pid].count++
    byPartner[pid].revenue += r.total_price || 0
    byPartner[pid].commission += r.commission_amount || 0
  }
  return Object.values(byPartner).sort((a, b) => b.revenue - a.revenue).slice(0, 8)
}

// Widget 8 — Répartition par source
async function getSourceDistribution(): Promise<SourceData[]> {
  const snap = await db.collection('reservations').get()
  const counts = { direct: 0, partenaire: 0, admin: 0 }
  for (const d of snap.docs) {
    const src = (d.data().source || 'direct') as keyof typeof counts
    if (src in counts) counts[src]++
    else counts.direct++
  }
  return [
    { source: 'direct', label: 'Client direct', count: counts.direct },
    { source: 'partenaire', label: 'Via partenaire', count: counts.partenaire },
    { source: 'admin', label: 'Via admin', count: counts.admin },
  ].filter((d) => d.count > 0)
}

// Widget 3 — Alertes relances 24h enrichies
async function getPaymentAlerts(): Promise<AlertReservation[]> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const snap = await db.collection('reservations').get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r: any) =>
      r.whatsapp_payment_request_sent_at &&
      r.whatsapp_payment_request_sent_at < cutoff &&
      r.payment_status !== 'paye' &&
      r.reservation_status !== 'annulee'
    )
    .map((r: any) => ({
      id: r.id,
      guest_first_name: r.guest_first_name,
      guest_last_name: r.guest_last_name,
      accommodation_name: r.accommodation?.name || r.accommodation_id || '—',
      total_price: r.total_price || 0,
      whatsapp_payment_request_sent_at: r.whatsapp_payment_request_sent_at,
      wa_relance_url: buildRelanceUrl(r),
    })) as AlertReservation[]
}

export const metadata = { title: 'Dashboard' }

export default async function AdminDashboard() {
  const [
    stats, recent, pendingDemands, packRequests, daily,
    pending, occupancy, arrivals, revenueDays, partnerPerf, sources, alerts, expiringSubscriptions,
    birthdayClients, stayAnniversaryClients,
  ] = await Promise.all([
    getAdminStats(),
    getRecentReservations(),
    getPendingDemands(),
    getPackRequestsData(),
    getDailyReport(),
    getPendingEncaissements(),
    getOccupancyData(),
    getTodayArrivals(),
    getRevenueLast30Days(),
    getPartnerPerformance(),
    getSourceDistribution(),
    getPaymentAlerts(),
    getExpiringSubscriptions(),
    getBirthdayClients(),
    getStayAnniversaryClients(),
  ])

  const totalRevenue30 = revenueDays.reduce((s, d) => s + d.revenue, 0)
  const totalComm30 = revenueDays.reduce((s, d) => s + d.commission, 0)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-dark">Dashboard</h1>
          <p className="text-dark/50 text-sm mt-1">Vue d&apos;ensemble — L&Lui Signature</p>
        </div>
        <DailyReportButton dailyData={daily} />
      </div>

      {/* ── LIGNE 1 : KPIs + Encaissements à recevoir ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Total réservations" value={String(stats.total_reservations)} icon={CalendarDays} color="bg-blue-50 text-blue-600" sub={`${stats.confirmed_reservations} confirmées`} />
        <KpiCard title="En attente" value={String(stats.pending_reservations)} icon={Clock} color="bg-amber-50 text-amber-600" sub="À traiter" urgent={stats.pending_reservations > 0} />
        <KpiCard title="Chiffre d'affaires" value={formatPrice(stats.total_revenue)} icon={TrendingUp} color="bg-green-50 text-green-600" sub="Réservations confirmées" />
        <KpiCard title="Commissions L&Lui" value={formatPrice(stats.total_commission)} icon={Percent} color="bg-gold-50 text-gold-600" sub={`${formatPrice(stats.pending_payment)} à encaisser`} />
        <KpiCard title="Demandes clients" value={String(pendingDemands.length)} icon={Bell} color="bg-red-50 text-red-600" sub="Disponibilité demandée" urgent={pendingDemands.length > 0} />
        {/* Widget 2 — Encaissements à recevoir */}
        <Link href="/admin/reservations?status=confirmee" className="block">
          <div className={`bg-white rounded-xl border p-5 h-full transition-shadow hover:shadow-md ${pending.count > 0 ? 'border-orange-300 shadow-orange-100 shadow-sm' : 'border-beige-200'}`}>
            <div className={`w-9 h-9 rounded-lg ${pending.count > 0 ? 'bg-orange-50 text-orange-500' : 'bg-beige-50 text-dark/40'} flex items-center justify-center mb-3`}>
              <Wallet size={18} />
            </div>
            <p className={`text-2xl font-bold truncate ${pending.count > 0 ? 'text-orange-600' : 'text-dark'}`}>
              {pending.count > 0 ? formatPrice(pending.total_amount) : '—'}
            </p>
            <p className="text-xs font-medium text-dark/70 mt-0.5">Encaissements à recevoir</p>
            <p className="text-xs text-dark/40 mt-1">{pending.count} rés. confirmée{pending.count > 1 ? 's' : ''} non payée{pending.count > 1 ? 's' : ''}</p>
          </div>
        </Link>
      </div>

      {/* Rapport journalier */}
      <div className="bg-white rounded-2xl border border-beige-200 p-5">
        <h2 className="font-semibold text-dark mb-4 flex items-center gap-2 text-sm">
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

      {/* ── LIGNE 2 : Widget 1 — Taux d'occupation ── */}
      <div className="bg-white rounded-2xl border border-beige-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-dark flex items-center gap-2 text-sm">
              <Building2 size={16} className="text-gold-500" /> Taux d&apos;occupation — ce soir
            </h2>
            <p className="text-xs text-dark/40 mt-0.5">{today}</p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${occupancy.global_rate >= 70 ? 'text-green-600' : occupancy.global_rate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
              {occupancy.global_rate}%
            </p>
            <p className="text-xs text-dark/40">{occupancy.total_occupied}/{occupancy.total_units} logements</p>
          </div>
        </div>
        {/* Barre globale */}
        <div className="w-full h-2.5 bg-beige-100 rounded-full mb-5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${occupancy.global_rate >= 70 ? 'bg-green-500' : occupancy.global_rate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
            style={{ width: `${occupancy.global_rate}%` }}
          />
        </div>
        {occupancy.by_partner.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {occupancy.by_partner.map((p) => (
              <div key={p.partner_id} className="p-3 bg-beige-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-dark truncate">{p.partner_name}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.rate >= 70 ? 'bg-green-100 text-green-700' : p.rate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                    {p.rate}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-beige-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${p.rate >= 70 ? 'bg-green-500' : p.rate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${p.rate}%` }}
                  />
                </div>
                <p className="text-xs text-dark/40 mt-1">{p.occupied}/{p.total} logements</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-dark/40 text-center py-4">Aucun hébergement actif</p>
        )}
      </div>

      {/* ── LIGNE 3 : Widget 5 (2/3) + Widget 8 (1/3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={revenueDays} totalRevenue={totalRevenue30} totalCommission={totalComm30} />
        </div>
        <div className="lg:col-span-1">
          <SourcePieChart data={sources} />
        </div>
      </div>

      {/* ── LIGNE 4 : Widget 4 Arrivées (1/2) + Widget 7 Performance (1/2) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget 4 — Arrivées du jour */}
        <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-beige-200 flex items-center justify-between">
            <h2 className="font-semibold text-dark flex items-center gap-2 text-sm">
              🏨 Arrivées du jour
              {arrivals.length > 0 && (
                <span className="bg-blue-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {arrivals.length}
                </span>
              )}
            </h2>
            <Link href={`/admin/reservations?status=confirmee`} className="text-xs text-gold-600 hover:text-gold-700 flex items-center gap-1">
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>
          {arrivals.length === 0 ? (
            <div className="py-10 text-center text-dark/40 text-sm">Aucune arrivée prévue aujourd&apos;hui</div>
          ) : (
            <div className="divide-y divide-beige-100">
              {arrivals.map((r: any) => {
                const isPaid = r.payment_status === 'paye'
                const waPhone = formatPhone(r.guest_phone || '')
                const waMsg = `Bonjour ${r.guest_first_name}, nous vous attendons aujourd'hui pour votre arrivée au ${r.accommodation?.name || ''}. Merci d'effectuer votre paiement de ${(r.total_price || 0).toLocaleString('fr-FR')} FCFA via Orange Money au 693407964.`
                return (
                  <div key={r.id} className="px-5 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-dark text-sm">{r.guest_first_name} {r.guest_last_name}</p>
                        {!isPaid && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">Paiement manquant</span>
                        )}
                        {isPaid && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Payé ✓</span>
                        )}
                      </div>
                      <p className="text-xs text-dark/50 truncate">{r.accommodation?.name || r.accommodation_id}</p>
                      <p className="text-xs text-dark/40 mt-0.5">
                        {r.guests} pers. · {formatPrice(r.total_price)}
                        {r.partner_name && <span className="ml-1">· 🤝 {r.partner_name}</span>}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 items-center">
                      {!isPaid && (
                        <a
                          href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors whitespace-nowrap"
                        >
                          <MessageCircle size={11} /> Relancer
                        </a>
                      )}
                      <Link href={`/admin/reservations/${r.id}`} className="p-1.5 text-dark/30 hover:text-dark/60">
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Widget 7 — Performance partenaires */}
        <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-beige-200">
            <h2 className="font-semibold text-dark flex items-center gap-2 text-sm">
              <Users size={16} className="text-gold-500" /> Performance partenaires — ce mois
            </h2>
          </div>
          {partnerPerf.length === 0 ? (
            <div className="py-10 text-center text-dark/40 text-sm">Aucune donnée ce mois</div>
          ) : (
            <div className="divide-y divide-beige-100">
              {partnerPerf.map((p, idx) => (
                <Link
                  key={p.partner_id}
                  href={p.partner_id !== 'direct' && p.partner_id !== 'admin' ? `/admin/partenaires/${p.partner_id}` : '/admin/partenaires'}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-beige-50 transition-colors"
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${idx === 0 ? 'bg-gold-100 text-gold-700' : idx === 1 ? 'bg-gray-100 text-gray-600' : 'bg-beige-100 text-dark/40'}`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-dark text-sm truncate">{p.partner_name}</p>
                    <p className="text-xs text-dark/40">{p.count} rés. · {formatPrice(p.commission)} comm.</p>
                  </div>
                  <p className="text-sm font-bold text-dark flex-shrink-0">{formatPrice(p.revenue)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── LIGNE 5 : Widget 3 — Alertes relances ── */}
      <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-orange-200 flex items-center justify-between bg-orange-50/50">
          <h2 className="font-semibold text-dark flex items-center gap-2 text-sm">
            <AlertTriangle size={16} className="text-orange-500" /> Relances paiement en attente
            {alerts.length > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {alerts.length}
              </span>
            )}
          </h2>
          <p className="text-xs text-orange-600">Demande envoyée depuis +24h sans paiement</p>
        </div>
        <PaymentRelanceWidget alerts={alerts} />
      </div>

      {/* ── Renouvellements abonnements à venir ── */}
      {expiringSubscriptions.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-200 flex items-center justify-between bg-amber-50/50">
            <h2 className="font-semibold text-dark flex items-center gap-2 text-sm">
              <AlertTriangle size={16} className="text-amber-500" /> Abonnements expirant dans 7 jours
              <span className="bg-amber-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {expiringSubscriptions.length}
              </span>
            </h2>
            <Link href="/admin/partenaires" className="text-xs text-gold-600 hover:text-gold-700 flex items-center gap-1">
              Gérer <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-amber-100">
            {expiringSubscriptions.map((p) => {
              const endDate = new Date(p.subscriptionEndDate).toLocaleDateString('fr-FR')
              const planLabel = p.subscriptionPlan.charAt(0).toUpperCase() + p.subscriptionPlan.slice(1)
              const waPhone = p.whatsapp_number
                ? (p.whatsapp_number.replace(/\D/g, '').startsWith('237') ? p.whatsapp_number.replace(/\D/g, '') : `237${p.whatsapp_number.replace(/\D/g, '')}`)
                : null
              const waMsg = waPhone
                ? encodeURIComponent(`Bonjour ${p.name}, votre abonnement L&Lui Signature ${planLabel} expire le ${endDate}. Renouvelez maintenant pour continuer à gérer vos logements sans interruption. Contactez-nous pour procéder au renouvellement.`)
                : null
              return (
                <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-dark text-sm">{p.name}</p>
                    <p className="text-xs text-dark/50">Plan {planLabel} · Expire le {endDate}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {waMsg && waPhone && (
                      <a
                        href={`https://wa.me/${waPhone}?text=${waMsg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-medium whitespace-nowrap"
                        style={{ background: '#25D366' }}
                      >
                        <MessageCircle size={11} /> Envoyer rappel
                      </a>
                    )}
                    <Link href={`/admin/partenaires/${p.id}`} className="p-1.5 text-dark/30 hover:text-dark/60">
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Demandes en attente + Pipeline récent ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-beige-200 flex items-center justify-between">
            <h2 className="font-semibold text-dark flex items-center gap-2 text-sm">
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
                  <Link
                    href={`/admin/reservations/nouvelle?from_demand=${req.id}&product_id=${req.product_id}&check_in=${req.check_in}&check_out=${req.check_out}&guests=${req.guests}&first_name=${req.guest_first_name}&last_name=${req.guest_last_name}&phone=${req.guest_phone}`}
                    className="text-xs bg-gold-500 text-white px-2.5 py-1 rounded-lg hover:bg-gold-600 flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                  >
                    <Plus size={10} /> Créer réservation
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-beige-200 flex items-center justify-between">
            <h2 className="font-semibold text-dark flex items-center gap-2 text-sm">
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
                      <div key={i} className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center ${done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
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
        <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-beige-200 flex items-center justify-between">
            <h2 className="font-semibold text-dark flex items-center gap-2 text-sm">
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

      {/* ── Widget anniversaires clients ── */}
      {(birthdayClients.length > 0 || stayAnniversaryClients.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Anniversaires de naissance */}
          {birthdayClients.length > 0 && (
            <div className="bg-white rounded-2xl border border-pink-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-pink-200 flex items-center justify-between bg-pink-50/50">
                <h2 className="font-semibold text-dark flex items-center gap-2 text-sm">
                  <Cake size={16} className="text-pink-500" /> Anniversaires aujourd&apos;hui 🎂
                  <span className="bg-pink-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {birthdayClients.length}
                  </span>
                </h2>
                <Link href="/admin/clients" className="text-xs text-gold-600 hover:text-gold-700 flex items-center gap-1">
                  Clients <ArrowRight size={12} />
                </Link>
              </div>
              <div className="divide-y divide-pink-100">
                {birthdayClients.map((c) => {
                  const waUrl = buildBirthdayWhatsAppUrl(c)
                  const age = c.birthDate
                    ? new Date().getFullYear() - new Date(c.birthDate).getFullYear()
                    : null
                  return (
                    <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-xs font-bold text-pink-600 flex-shrink-0">
                        {c.firstName?.[0]}{c.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-dark text-sm">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-dark/40">
                          {age ? `${age} ans aujourd'hui · ` : ''}{c.niveau} · {c.memberCode}
                        </p>
                      </div>
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-medium flex-shrink-0 whitespace-nowrap"
                          style={{ background: '#25D366' }}
                        >
                          <MessageCircle size={11} /> Souhaiter
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Anniversaires de premier séjour */}
          {stayAnniversaryClients.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-amber-200 flex items-center justify-between bg-amber-50/50">
                <h2 className="font-semibold text-dark flex items-center gap-2 text-sm">
                  <Heart size={16} className="text-amber-500" /> Anniversaire de séjour 🏡
                  <span className="bg-amber-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {stayAnniversaryClients.length}
                  </span>
                </h2>
                <Link href="/admin/clients" className="text-xs text-gold-600 hover:text-gold-700 flex items-center gap-1">
                  Clients <ArrowRight size={12} />
                </Link>
              </div>
              <div className="divide-y divide-amber-100">
                {stayAnniversaryClients.map((c) => {
                  const waUrl = buildStayAnniversaryWhatsAppUrl(c)
                  const years = c.joinedAt
                    ? new Date().getFullYear() - new Date(c.joinedAt).getFullYear()
                    : 1
                  return (
                    <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-600 flex-shrink-0">
                        {c.firstName?.[0]}{c.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-dark text-sm">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-dark/40">
                          {years} an{years > 1 ? 's' : ''} de fidélité · {c.totalSejours} séjours · {c.niveau}
                        </p>
                      </div>
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-medium flex-shrink-0 whitespace-nowrap"
                          style={{ background: '#25D366' }}
                        >
                          <MessageCircle size={11} /> Envoyer
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions rapides */}
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
