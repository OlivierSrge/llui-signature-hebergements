export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { LogOut, Calendar, Home, Plus, QrCode, Star, ArrowRight } from 'lucide-react'
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
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
}

async function getUnavailableDates(accommodationId: string): Promise<string[]> {
  const snap = await db.collection('disponibilites')
    .where('accommodation_id', '==', accommodationId)
    .get()
  return snap.docs.map((d) => d.data().date as string)
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

  const [partner, accommodations, reservations] = await Promise.all([
    getPartner(partnerId),
    getPartnerAccommodations(partnerId),
    getPartnerReservations(partnerId),
  ])

  if (!partner) redirect('/partenaire')

  const unavailableMap: Record<string, string[]> = {}
  await Promise.all(
    accommodations.map(async (acc: any) => {
      unavailableMap[acc.id] = await getUnavailableDates(acc.id)
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
          <form action={handleLogout}>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-sm text-dark/60 border border-beige-200 rounded-xl hover:bg-beige-50 transition-colors"
            >
              <LogOut size={14} /> Déconnexion
            </button>
          </form>
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

        {/* Recent reservations */}
        {reservations.length > 0 && (
          <div>
            <h2 className="font-semibold text-dark text-lg mb-4">Mes réservations récentes</h2>
            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              <div className="divide-y divide-beige-100">
                {reservations.map((r: any) => (
                  <Link
                    key={r.id}
                    href={`/partenaire/reservations/${r.id}`}
                    className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-beige-50 transition-colors"
                  >
                    <div className="min-w-0">
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
                ))}
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
                  <div className="px-6 py-4 border-b border-beige-100 flex items-center gap-3">
                    <Calendar size={16} className="text-gold-500" />
                    <div>
                      <h3 className="font-semibold text-dark">{acc.name}</h3>
                      {acc.location && <p className="text-xs text-dark/40">{acc.location}</p>}
                    </div>
                  </div>
                  <div className="p-6">
                    <PartnerCalendar
                      accommodationId={acc.id}
                      unavailableDates={unavailableMap[acc.id] ?? []}
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
