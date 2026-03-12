export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, CheckCircle2, Clock, DollarSign, Download } from 'lucide-react'
import { RevenueBarChart, ReservationsLineChart } from '@/components/partner/PartnerRevenueCharts'
import type { MonthlyData } from '@/components/partner/PartnerRevenueCharts'

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

async function getPartnerRevenueData(partnerId: string) {
  const snap = await db.collection('reservations')
    .where('accommodation_id', 'in', await getPartnerAccommodationIds(partnerId))
    .get()

  const now = new Date()
  const currentYear = now.getFullYear()

  // Initialise 12 mois de l'année courante
  const byMonth: Record<string, { revenue: number; confirmed: number; pending: number; cancelled: number }> = {}
  for (let m = 0; m < 12; m++) {
    const key = `${currentYear}-${String(m + 1).padStart(2, '0')}`
    byMonth[key] = { revenue: 0, confirmed: 0, pending: 0, cancelled: 0 }
  }

  const allReservations = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]

  let totalRevenue = 0
  let totalConfirmed = 0
  let totalPending = 0
  let totalNights = 0
  let avgNights = 0

  for (const r of allReservations) {
    const month = (r.created_at as string || '').substring(0, 7)
    if (!byMonth[month]) continue

    if (r.reservation_status === 'confirmee') {
      const price = Number(r.total_price) || 0
      byMonth[month].revenue += price
      byMonth[month].confirmed += 1
      totalConfirmed += 1
      totalNights += Number(r.nights) || 0
      // Revenus totaux : ceux avec paiement validé
      if (r.payment_status === 'paye') totalRevenue += price
    } else if (r.reservation_status === 'en_attente') {
      byMonth[month].pending += 1
      totalPending += 1
    } else if (r.reservation_status === 'annulee') {
      byMonth[month].cancelled += 1
    }
  }

  avgNights = totalConfirmed > 0 ? Math.round(totalNights / totalConfirmed) : 0

  // Préparer les données graphiques (12 mois)
  const chartData: MonthlyData[] = Object.entries(byMonth).map(([key, v]) => {
    const mIdx = parseInt(key.split('-')[1]) - 1
    return { month: MONTH_LABELS[mIdx], revenue: v.revenue, confirmed: v.confirmed }
  })

  // Mois en cours
  const currentMonthKey = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentMonth = byMonth[currentMonthKey] || { revenue: 0, confirmed: 0, pending: 0, cancelled: 0 }

  // Mois précédent pour comparaison
  const prevDate = new Date(currentYear, now.getMonth() - 1, 1)
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const prevMonth = byMonth[prevKey] || { revenue: 0, confirmed: 0, pending: 0, cancelled: 0 }

  const revenueEvol = prevMonth.revenue > 0
    ? Math.round(((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100)
    : null

  return {
    chartData,
    totalRevenue,
    totalConfirmed,
    totalPending,
    avgNights,
    currentMonth,
    prevMonth,
    revenueEvol,
  }
}

async function getPartnerAccommodationIds(partnerId: string): Promise<string[]> {
  const snap = await db.collection('hebergements')
    .where('partner_id', '==', partnerId)
    .get()
  const ids = snap.docs.map((d) => d.id)
  return ids.length > 0 ? ids : ['__none__']
}

async function getRecentReservations(partnerId: string) {
  const accIds = await getPartnerAccommodationIds(partnerId)
  if (accIds[0] === '__none__') return []

  const chunks: string[][] = []
  for (let i = 0; i < accIds.length; i += 10) chunks.push(accIds.slice(i, i + 10))
  const results: any[] = []
  for (const chunk of chunks) {
    const s = await db.collection('reservations')
      .where('accommodation_id', 'in', chunk)
      .where('reservation_status', '==', 'confirmee')
      .get()
    s.docs.forEach((d) => results.push({ id: d.id, ...d.data() }))
  }
  return results
    .sort((a, b) => (b.confirmed_at || b.created_at || '').localeCompare(a.confirmed_at || a.created_at || ''))
    .slice(0, 8)
}

export default async function PartnerRevenuePage() {
  const cookieStore = cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) redirect('/partenaire')

  const [data, recent] = await Promise.all([
    getPartnerRevenueData(partnerId),
    getRecentReservations(partnerId),
  ])

  const { chartData, totalRevenue, totalConfirmed, totalPending, avgNights, currentMonth, revenueEvol } = data

  return (
    <div className="min-h-screen bg-beige-50">
      <header className="bg-white border-b border-beige-200 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/partenaire/dashboard" className="p-2 rounded-xl hover:bg-beige-50 transition-colors text-dark/50 hover:text-dark">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-xs text-dark/40">Espace partenaire</p>
            <h1 className="font-serif text-xl font-semibold text-dark flex items-center gap-2">
              <TrendingUp size={18} className="text-gold-500" /> Tableau de bord revenus
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gold-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={14} className="text-gold-500" />
              <p className="text-xs text-dark/50">Revenus encaissés</p>
            </div>
            <p className="text-xl font-bold text-gold-600 leading-tight">{totalRevenue.toLocaleString('fr-FR')}</p>
            <p className="text-xs text-gold-500">FCFA (année)</p>
          </div>
          <div className="bg-white rounded-2xl border border-beige-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={14} className="text-green-500" />
              <p className="text-xs text-dark/50">Réservations confirmées</p>
            </div>
            <p className="text-2xl font-bold text-dark">{totalConfirmed}</p>
            <p className="text-xs text-dark/40">ce mois : {currentMonth.confirmed}</p>
          </div>
          <div className="bg-white rounded-2xl border border-beige-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-amber-500" />
              <p className="text-xs text-dark/50">En attente</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{totalPending}</p>
            <p className="text-xs text-dark/40">à confirmer</p>
          </div>
          <div className="bg-white rounded-2xl border border-beige-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-blue-500" />
              <p className="text-xs text-dark/50">Durée moyenne</p>
            </div>
            <p className="text-2xl font-bold text-dark">{avgNights}</p>
            <p className="text-xs text-dark/40">nuits / séjour</p>
          </div>
        </div>

        {/* Évolution mois en cours */}
        {revenueEvol !== null && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
            revenueEvol >= 0
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <span className="text-lg">{revenueEvol >= 0 ? '📈' : '📉'}</span>
            <span>
              Revenus ce mois : <strong>{currentMonth.revenue.toLocaleString('fr-FR')} FCFA</strong> —
              {' '}{revenueEvol >= 0 ? '+' : ''}{revenueEvol}% vs mois précédent
            </span>
          </div>
        )}

        {/* Graphiques */}
        <RevenueBarChart data={chartData} />
        <ReservationsLineChart data={chartData} />

        {/* Réservations confirmées récentes */}
        {recent.length > 0 && (
          <div>
            <h2 className="font-semibold text-dark text-lg mb-4">Réservations confirmées récentes</h2>
            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              <div className="divide-y divide-beige-100">
                {recent.map((r: any) => (
                  <Link
                    key={r.id}
                    href={`/partenaire/reservations/${r.id}`}
                    className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-beige-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-dark text-sm">{r.guest_first_name} {r.guest_last_name}</p>
                      <p className="text-xs text-dark/40">{r.accommodation?.name || r.accommodation_id} · {r.check_in} → {r.check_out}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-dark text-sm">{Number(r.total_price).toLocaleString('fr-FR')} FCFA</p>
                      <p className="text-xs text-dark/40">{r.nights} nuit{r.nights > 1 ? 's' : ''}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Export CSV */}
        <div className="flex justify-end">
          <a
            href="/api/export/reservations?source=partenaire"
            download
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-beige-200 text-dark/60 rounded-xl text-sm font-medium hover:border-dark/30 transition-colors"
          >
            <Download size={15} /> Exporter mes réservations CSV
          </a>
        </div>

      </main>
    </div>
  )
}
