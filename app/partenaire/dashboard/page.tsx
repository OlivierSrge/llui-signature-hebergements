export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { LogOut, Calendar, Home, Plus, QrCode, Star, ArrowRight, BarChart2 } from 'lucide-react'
import { logoutPartner } from '@/actions/partners'
import PartnerCalendar from '@/components/partner/PartnerCalendar'

async function getPartner(partnerId: string) {
  const doc = await db.collection('partenaires').doc(partnerId).get()
  if (!doc.exists) return null
  const d = doc.data()!
  return {
    id: doc.id,
    name: d.name as string,
    access_code: d.access_code as string,
    reliability_score: (d.reliability_score as number | null) ?? null,
  }
}

async function getPartnerAccommodations(partnerId: string) {
  const snap = await db.collection('hebergements')
    .where('partner_id', '==', partnerId)
    .where('status', '==', 'active')
    .get()
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
  // Déduplique par nom pour éviter les doublons Firestore
  const seen = new Set<string>()
  return all.filter((a) => {
    if (seen.has(a.name)) return false
    seen.add(a.name)
    return true
  })
}

async function getUnavailableDates(accommodationId: string): Promise<string[]> {
  const snap = await db.collection('disponibilites')
    .where('accommodation_id', '==', accommodationId)
    .get()
  return snap.docs.map((d) => d.data().date as string)
}

async function getAccommodationReservations(accommodationId: string) {
  const today = new Date().toISOString().split('T')[0]
  const snap = await db.collection('reservations')
    .where('accommodation_id', '==', accommodationId)
    .where('reservation_status', 'in', ['confirmee', 'en_attente'])
    .get()
  const all = snap.docs
    .map((d) => d.data())
    .filter((r: any) => r.check_out >= today)
  const toRange = (r: any) => ({
    check_in: r.check_in as string,
    check_out: r.check_out as string,
    guest_name: `${r.guest_first_name} ${r.guest_last_name}`,
  })
  return {
    confirmed: all.filter((r: any) => r.reservation_status === 'confirmee').map(toRange),
    pending: all.filter((r: any) => r.reservation_status === 'en_attente').map(toRange),
  }
}

async function getPartnerReservations(partnerId: string) {
  // Pas d'orderBy pour éviter l'exigence d'index composite Firestore
  const snap = await db.collection('reservations')
    .where('partner_id', '==', partnerId)
    .where('source', '==', 'partenaire')
    .get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 10) as any[]
}

async function getPartnerStats(partnerId: string) {
  const snap = await db.collection('reservations')
    .where('partner_id', '==', partnerId)
    .get()

  const allReservations = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]

  const currentMonth = new Date().toISOString().substring(0, 7) // "YYYY-MM"

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  const weekLater = new Date(today)
  weekLater.setDate(weekLater.getDate() + 7)
  const weekLaterStr = weekLater.toISOString().split('T')[0]

  // revenue_month: sum total_price where payment_status='paye' AND payment_date starts with currentMonth
  const revenue_month = allReservations
    .filter((r: any) =>
      r.payment_status === 'paye' &&
      typeof r.payment_date === 'string' &&
      r.payment_date.startsWith(currentMonth)
    )
    .reduce((sum: number, r: any) => sum + (Number(r.total_price) || 0), 0)

  // arrivals_week: count check_in between today and today+7 (inclusive) AND status in ['confirmee', 'en_attente']
  const arrivals_week = allReservations.filter((r: any) =>
    r.check_in >= todayStr &&
    r.check_in <= weekLaterStr &&
    ['confirmee', 'en_attente'].includes(r.reservation_status)
  ).length

  // pending_count: count status in ['en_attente', 'demande']
  const pending_count = allReservations.filter((r: any) =>
    ['en_attente', 'demande'].includes(r.reservation_status)
  ).length

  // monthly_confirmed: count status='confirmee' AND confirmed_at starts with currentMonth
  const monthly_confirmed = allReservations.filter((r: any) =>
    r.reservation_status === 'confirmee' &&
    typeof r.confirmed_at === 'string' &&
    r.confirmed_at.startsWith(currentMonth)
  ).length

  // Niveau partenaire
  let level: string
  let stars: number
  let nextTarget: number | null

  if (monthly_confirmed >= 31) {
    level = 'Excellence'
    stars = 3
    nextTarget = null
  } else if (monthly_confirmed >= 11) {
    level = 'Premium'
    stars = 2
    nextTarget = 31
  } else {
    level = 'Actif'
    stars = 1
    nextTarget = 11
  }

  return { revenue_month, arrivals_week, pending_count, monthly_confirmed, level, stars, nextTarget }
}

const STATUS_LABEL: Record<string, string> = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  annulee: 'Annulée',
}
const STATUS_COLOR: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-800',
  confirmee: 'bg-green-100 text-green-800',
  annulee: 'bg-red-100 text-red-800',
}

async function handleLogout() {
  'use server'
  await logoutPartner()
  redirect('/partenaire')
}

export default async function PartnerDashboardPage() {
  const cookieStore = cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) redirect('/partenaire')

  const [partner, accommodations, reservations, stats] = await Promise.all([
    getPartner(partnerId),
    getPartnerAccommodations(partnerId),
    getPartnerReservations(partnerId),
    getPartnerStats(partnerId),
  ])

  if (!partner) redirect('/partenaire')

  const progressPercent = stats.nextTarget
    ? Math.min(100, Math.round((stats.monthly_confirmed / stats.nextTarget) * 100))
    : 100

  const unavailableMap: Record<string, string[]> = {}
  const confirmedReservationsMap: Record<string, { check_in: string; check_out: string; guest_name: string }[]> = {}
  const pendingReservationsMap: Record<string, { check_in: string; check_out: string; guest_name: string }[]> = {}
  await Promise.all(
    accommodations.map(async (acc: any) => {
      const [unavail, accReservations] = await Promise.all([
        getUnavailableDates(acc.id),
        getAccommodationReservations(acc.id),
      ])
      unavailableMap[acc.id] = unavail
      confirmedReservationsMap[acc.id] = accReservations.confirmed
      pendingReservationsMap[acc.id] = accReservations.pending
    })
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-beige-200 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-dark/40 mb-0.5">Espace partenaire</p>
            <h1 className="font-serif text-xl font-semibold text-dark flex items-center gap-2">
              {partner.name}
              {partner.reliability_score !== null && (
                <span className="flex items-center gap-1 text-xs font-normal bg-gold-50 text-gold-700 border border-gold-200 px-2 py-0.5 rounded-full">
                  <Star size={11} className="fill-gold-400 text-gold-400" />
                  {partner.reliability_score}% fiabilité
                </span>
              )}
            </h1>
          </div>
          {/* BLOC 9 — Badge partenaire dans le header */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 bg-gold-50 border border-gold-200 text-gold-700 px-3 py-1 rounded-full text-xs font-medium">
                {'⭐'.repeat(stats.stars)}
                <span className="ml-1">{stats.level}</span>
              </div>
              {stats.nextTarget !== null ? (
                <div className="w-40">
                  <p className="text-[10px] text-dark/40 mb-0.5 text-right">
                    {stats.monthly_confirmed}/{stats.nextTarget} pour niveau suivant
                  </p>
                  <div className="h-1.5 rounded-full bg-beige-200 overflow-hidden">
                    <div
                      className="h-full bg-gold-500 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-green-600 font-medium">🏆 Niveau Excellence atteint !</p>
              )}
            </div>
            <form action={handleLogout}>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 text-sm text-dark/60 border border-beige-200 rounded-xl hover:bg-beige-50 transition-colors"
              >
                <LogOut size={14} /> Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Quick actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/partenaire/reservations/nouveau"
            className="flex items-center gap-2 px-4 py-2.5 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 transition-colors"
          >
            <Plus size={15} /> Nouvelle réservation
          </Link>
          <Link
            href="/partenaire/scanner"
            className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 text-white rounded-xl text-sm font-medium hover:bg-gold-600 transition-colors"
          >
            <QrCode size={15} /> Scanner à l&apos;arrivée
          </Link>
        </div>

        {/* BLOC 1 — 3 KPI cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Revenus ce mois */}
          <div className="bg-white border border-gold-200 rounded-2xl p-3 min-h-[100px] flex flex-col justify-between overflow-hidden">
            <p className="text-xs text-dark/50">💰 Revenus ce mois</p>
            <div className="mt-2">
              <p className="text-xl font-bold text-gold-600 leading-tight break-all">
                {stats.revenue_month.toLocaleString('fr-FR')}
              </p>
              <p className="text-xs font-normal text-gold-500">FCFA</p>
            </div>
          </div>

          {/* Arrivées cette semaine */}
          <div className="bg-white border border-beige-200 rounded-2xl p-5 min-h-[100px] flex flex-col justify-between">
            <p className="text-xs text-dark/50">📅 Arrivées cette semaine</p>
            <p className="text-4xl font-bold text-dark mt-2">
              {stats.arrivals_week}
            </p>
          </div>

          {/* En attente */}
          <div
            className={`rounded-2xl p-5 min-h-[100px] flex flex-col justify-between border ${
              stats.pending_count > 0
                ? 'bg-orange-50 border-orange-300'
                : 'bg-white border-beige-200'
            }`}
          >
            <p className="text-xs text-dark/50">⏳ En attente</p>
            <p
              className={`text-4xl font-bold mt-2 ${
                stats.pending_count > 0 ? 'text-orange-600' : 'text-dark'
              }`}
            >
              {stats.pending_count}
            </p>
          </div>
        </div>

        {/* Recent reservations */}
        {reservations.length > 0 && (
          <div>
            <h2 className="font-semibold text-dark text-lg mb-4">Mes réservations récentes</h2>
            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              <div className="divide-y divide-beige-100">
                {reservations.map((r: any) => {
                  const isPaid = r.payment_status === 'paye'
                  const isConfirmed = r.reservation_status === 'confirmee'
                  // Pour les réservations partenaires, les étapes WhatsApp peuvent être implicites
                  const step1 = !!r.whatsapp_proposal_sent_at || r.source === 'partenaire' || isPaid || isConfirmed
                  const step2 = !!r.whatsapp_payment_request_sent_at || isPaid || isConfirmed
                  const step3 = isPaid
                  const step4 = !!r.whatsapp_confirmation_sent_at || isConfirmed

                  return (
                  <Link
                    key={r.id}
                    href={`/partenaire/reservations/${r.id}`}
                    className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-beige-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-dark text-sm truncate">
                        {r.guest_first_name} {r.guest_last_name}
                      </p>
                      <p className="text-xs text-dark/40 mt-0.5">
                        {r.accommodation?.name ?? r.accommodation_id} · {r.check_in} → {r.check_out}
                      </p>
                      {r.confirmation_code && (
                        <p className="text-xs font-mono text-dark/40 mt-0.5">{r.confirmation_code}</p>
                      )}
                    </div>
                    {/* Pipeline steps */}
                    <div className="flex items-center gap-1 flex-shrink-0 self-center">
                      {[step1, step2, step3, step4].map((done, i) => (
                        <div
                          key={i}
                          title={['Proposition envoyée', 'Paiement demandé', 'Paiement confirmé', 'Fiche envoyée'][i]}
                          className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center
                            ${done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}
                        >
                          {done ? '✓' : i + 1}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.reservation_status] ?? 'bg-beige-100 text-dark/60'}`}>
                        {STATUS_LABEL[r.reservation_status] ?? r.reservation_status}
                      </span>
                      {r.check_in_confirmed && (
                        <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          Arrivée ✓
                        </span>
                      )}
                      <ArrowRight size={13} className="text-dark/20 mt-1" />
                    </div>
                  </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Calendars */}
        <div>
          <h2 className="font-semibold text-dark text-lg mb-1">Mes hébergements</h2>
          <p className="text-dark/50 text-sm mb-4">
            Cliquez sur les dates pour les bloquer ou les libérer.
          </p>

          {accommodations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-beige-200 p-12 text-center">
              <Home size={32} className="text-dark/20 mx-auto mb-3" />
              <p className="text-dark/50">Aucun hébergement actif associé à votre compte.</p>
              <p className="text-xs text-dark/30 mt-1">Contactez l&apos;équipe L&Lui Signature.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {accommodations.map((acc: any) => (
                <div key={acc.id} className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-beige-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-gold-500" />
                      <div>
                        <h3 className="font-semibold text-dark">{acc.name}</h3>
                        {acc.location && <p className="text-xs text-dark/40">{acc.location}</p>}
                      </div>
                    </div>
                    <Link
                      href={`/partenaire/logements/${acc.id}`}
                      className="flex items-center gap-1.5 text-xs text-gold-700 bg-gold-50 border border-gold-200 px-3 py-1.5 rounded-xl hover:bg-gold-100 transition-colors flex-shrink-0"
                    >
                      <BarChart2 size={12} /> Historique & QR
                    </Link>
                  </div>
                  <div className="p-6">
                    <PartnerCalendar
                      accommodationId={acc.id}
                      unavailableDates={unavailableMap[acc.id] ?? []}
                      reservations={confirmedReservationsMap[acc.id] ?? []}
                      pendingReservations={pendingReservationsMap[acc.id] ?? []}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
