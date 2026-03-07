export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { db } from '@/lib/firebase'
import { ChevronLeft, Home, Users } from 'lucide-react'
import AccommodationQrPrint from '@/components/partner/AccommodationQrPrint'

async function getAccommodation(id: string) {
  const doc = await db.collection('hebergements').doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as any
}

async function getMonthlyViews(accommodationId: string): Promise<{ month: string; count: number }[]> {
  // Get last 6 months of view stats
  const months: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push(d.toISOString().substring(0, 7))
  }
  const docs = await Promise.all(
    months.map((m) => db.collection('stats_views').doc(`${accommodationId}_${m}`).get())
  )
  return docs
    .map((doc, i) => ({ month: months[i], count: doc.exists ? (doc.data()?.count ?? 0) : 0 }))
    .filter((v) => v.count > 0)
    .reverse()
}

async function getAccommodationReservationHistory(accommodationId: string) {
  const snap = await db
    .collection('reservations')
    .where('accommodation_id', '==', accommodationId)
    .where('reservation_status', 'in', ['confirmee', 'annulee'])
    .get()

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => (b.check_in ?? '').localeCompare(a.check_in ?? '')) as any[]
}

const STATUS_LABEL: Record<string, string> = {
  confirmee: 'Confirmée',
  annulee: 'Annulée',
}

const STATUS_COLOR: Record<string, string> = {
  confirmee: 'bg-green-100 text-green-800',
  annulee: 'bg-red-100 text-red-800',
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  paye: 'Payé',
  en_attente: 'En attente',
  rembourse: 'Remboursé',
}

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  paye: 'bg-green-100 text-green-800',
  en_attente: 'bg-yellow-100 text-yellow-800',
  rembourse: 'bg-blue-100 text-blue-800',
}

function calcDuration(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0
  const d1 = new Date(checkIn)
  const d2 = new Date(checkOut)
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

export default async function AccommodationHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cookieStore = cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) redirect('/partenaire')

  const accommodation = await getAccommodation(id)
  if (!accommodation) notFound()

  // Vérifie que l'hébergement appartient au partenaire
  if (accommodation.partner_id !== partnerId) {
    redirect('/partenaire/dashboard')
  }

  const [reservations, monthlyViews] = await Promise.all([
    getAccommodationReservationHistory(id),
    getMonthlyViews(id),
  ])

  return (
    <div className="min-h-screen bg-beige-50">
      {/* Header */}
      <header className="bg-white border-b border-beige-200 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/partenaire/dashboard"
              className="flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark transition-colors flex-shrink-0"
            >
              <ChevronLeft size={16} />
              Dashboard
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <Home size={16} className="text-gold-500 flex-shrink-0" />
              <h1 className="font-serif text-lg font-semibold text-dark truncate">
                {accommodation.name}
              </h1>
            </div>
          </div>
          <AccommodationQrPrint
            accommodation={{
              id: accommodation.id,
              name: accommodation.name,
              slug: accommodation.slug,
              price_per_night: accommodation.price_per_night ?? 0,
              partner_name: accommodation.partner?.name,
              partner_id: partnerId,
            }}
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Infos hébergement */}
        <div className="bg-white rounded-2xl border border-beige-200 px-6 py-5">
          <div className="flex flex-wrap gap-6 text-sm text-dark/60">
            {accommodation.location && (
              <span>📍 {accommodation.location}</span>
            )}
            {accommodation.price_per_night && (
              <span>💰 {accommodation.price_per_night.toLocaleString('fr-FR')} FCFA / nuit</span>
            )}
            {accommodation.capacity && (
              <span className="flex items-center gap-1">
                <Users size={13} /> {accommodation.capacity} personnes max.
              </span>
            )}
          </div>
        </div>

        {/* Statistiques de vues */}
        {monthlyViews.length > 0 && (
          <div className="bg-white rounded-2xl border border-beige-200 px-6 py-5">
            <h2 className="font-semibold text-dark text-sm mb-4 flex items-center gap-2">
              👁️ Vues de la page (par mois)
            </h2>
            <div className="flex flex-wrap gap-3">
              {monthlyViews.map((v) => (
                <div key={v.month} className="flex flex-col items-center bg-beige-50 rounded-xl px-4 py-3 min-w-[80px]">
                  <span className="text-2xl font-bold text-gold-600">{v.count}</span>
                  <span className="text-xs text-dark/40 mt-0.5">{v.month}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historique des clients */}
        <div>
          <h2 className="font-semibold text-dark text-lg mb-4">Historique des clients</h2>

          {reservations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-beige-200 p-12 text-center">
              <Users size={32} className="text-dark/20 mx-auto mb-3" />
              <p className="text-dark/50">Aucune réservation pour cet hébergement</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-6 gap-4 px-6 py-3 bg-beige-50 border-b border-beige-100 text-xs font-semibold text-dark/50 uppercase tracking-wide">
                <div className="col-span-2">Client</div>
                <div>Dates</div>
                <div>Durée</div>
                <div>Montant</div>
                <div>Statut</div>
              </div>

              <div className="divide-y divide-beige-100">
                {reservations.map((r: any) => {
                  const duration = calcDuration(r.check_in, r.check_out)
                  return (
                    <div key={r.id} className="px-6 py-4">
                      {/* Mobile layout */}
                      <div className="md:hidden space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-dark text-sm">
                              {r.guest_first_name} {r.guest_last_name}
                            </p>
                            {r.guest_phone && (
                              <p className="text-xs text-dark/40">{r.guest_phone}</p>
                            )}
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              STATUS_COLOR[r.reservation_status] ?? 'bg-beige-100 text-dark/60'
                            }`}
                          >
                            {STATUS_LABEL[r.reservation_status] ?? r.reservation_status}
                          </span>
                        </div>
                        <p className="text-xs text-dark/50">
                          {r.check_in} → {r.check_out}
                          {duration > 0 && ` · ${duration} nuit${duration > 1 ? 's' : ''}`}
                        </p>
                        <div className="flex items-center gap-3">
                          {r.total_price && (
                            <span className="text-sm font-semibold text-dark">
                              {r.total_price.toLocaleString('fr-FR')} FCFA
                            </span>
                          )}
                          {r.payment_status && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                PAYMENT_STATUS_COLOR[r.payment_status] ??
                                'bg-beige-100 text-dark/60'
                              }`}
                            >
                              {PAYMENT_STATUS_LABEL[r.payment_status] ?? r.payment_status}
                            </span>
                          )}
                        </div>
                        {r.admin_notes && (
                          <p className="text-xs text-dark/50 italic bg-beige-50 rounded-lg px-3 py-2">
                            {r.admin_notes}
                          </p>
                        )}
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden md:grid grid-cols-6 gap-4 items-start">
                        <div className="col-span-2">
                          <p className="font-medium text-dark text-sm">
                            {r.guest_first_name} {r.guest_last_name}
                          </p>
                          {r.guest_phone && (
                            <p className="text-xs text-dark/40 mt-0.5">{r.guest_phone}</p>
                          )}
                          {r.confirmation_code && (
                            <p className="text-xs font-mono text-dark/30 mt-0.5">
                              {r.confirmation_code}
                            </p>
                          )}
                        </div>
                        <div className="text-sm text-dark/60">
                          <p>{r.check_in}</p>
                          <p>{r.check_out}</p>
                        </div>
                        <div className="text-sm text-dark/60">
                          {duration > 0 ? `${duration} nuit${duration > 1 ? 's' : ''}` : '—'}
                        </div>
                        <div>
                          {r.total_price ? (
                            <p className="text-sm font-semibold text-dark">
                              {r.total_price.toLocaleString('fr-FR')} FCFA
                            </p>
                          ) : (
                            <p className="text-sm text-dark/30">—</p>
                          )}
                          {r.payment_status && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                                PAYMENT_STATUS_COLOR[r.payment_status] ??
                                'bg-beige-100 text-dark/60'
                              }`}
                            >
                              {PAYMENT_STATUS_LABEL[r.payment_status] ?? r.payment_status}
                            </span>
                          )}
                        </div>
                        <div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              STATUS_COLOR[r.reservation_status] ?? 'bg-beige-100 text-dark/60'
                            }`}
                          >
                            {STATUS_LABEL[r.reservation_status] ?? r.reservation_status}
                          </span>
                          {r.admin_notes && (
                            <p className="text-xs text-dark/50 italic mt-1 leading-snug">
                              {r.admin_notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
