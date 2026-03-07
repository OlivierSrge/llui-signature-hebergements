export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { Plus, ArrowRight, Filter } from 'lucide-react'

async function getPartnerReservations(partnerId: string) {
  const snap = await db.collection('reservations')
    .where('partner_id', '==', partnerId)
    .get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => (b.created_at ?? '').localeCompare(a.created_at ?? '')) as any[]
}

const STATUS_LABEL: Record<string, string> = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  annulee: 'Annulée',
  demande: 'Demande',
}
const STATUS_COLOR: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-800',
  confirmee: 'bg-green-100 text-green-800',
  annulee: 'bg-red-100 text-red-800',
  demande: 'bg-blue-100 text-blue-800',
}

export default async function PartnerReservationsListPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>
}) {
  const cookieStore = cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) redirect('/partenaire')

  const { statut } = await searchParams
  const allReservations = await getPartnerReservations(partnerId)

  const filtered = statut
    ? allReservations.filter((r: any) => r.reservation_status === statut)
    : allReservations

  const counts = {
    all: allReservations.length,
    en_attente: allReservations.filter((r: any) => r.reservation_status === 'en_attente').length,
    confirmee: allReservations.filter((r: any) => r.reservation_status === 'confirmee').length,
    annulee: allReservations.filter((r: any) => r.reservation_status === 'annulee').length,
  }

  return (
    <div className="min-h-screen bg-beige-50 pb-20">
      <header className="bg-white border-b border-beige-200 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <h1 className="font-serif text-xl font-semibold text-dark">Mes réservations</h1>
          <Link
            href="/partenaire/reservations/nouveau"
            className="flex items-center gap-2 px-3 py-2 bg-dark text-white rounded-xl text-sm font-medium"
          >
            <Plus size={14} /> Nouvelle
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
          {[
            { label: `Toutes (${counts.all})`, value: undefined },
            { label: `En attente (${counts.en_attente})`, value: 'en_attente' },
            { label: `Confirmées (${counts.confirmee})`, value: 'confirmee' },
            { label: `Annulées (${counts.annulee})`, value: 'annulee' },
          ].map((f) => (
            <Link
              key={f.label}
              href={f.value ? `/partenaire/reservations/liste?statut=${f.value}` : '/partenaire/reservations/liste'}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                statut === f.value || (!statut && f.value === undefined)
                  ? 'bg-dark text-white border-dark'
                  : 'bg-white text-dark/60 border-beige-200 hover:border-dark/20'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-beige-200 p-12 text-center">
            <Filter size={32} className="text-dark/20 mx-auto mb-3" />
            <p className="text-dark/50">Aucune réservation{statut ? ` avec ce statut` : ''}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
            <div className="divide-y divide-beige-100">
              {filtered.map((r: any) => (
                <Link
                  key={r.id}
                  href={`/partenaire/reservations/${r.id}`}
                  className="flex items-start justify-between gap-3 px-4 py-4 hover:bg-beige-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-dark text-sm truncate">
                      {r.guest_first_name} {r.guest_last_name}
                    </p>
                    <p className="text-xs text-dark/40 mt-0.5 truncate">
                      {r.accommodation?.name ?? r.accommodation_id}
                    </p>
                    <p className="text-xs text-dark/40 mt-0.5">
                      {r.check_in} → {r.check_out}
                    </p>
                    {r.total_price && (
                      <p className="text-xs font-semibold text-dark mt-1">
                        {r.total_price.toLocaleString('fr-FR')} FCFA
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.reservation_status] ?? 'bg-beige-100 text-dark/60'}`}>
                      {STATUS_LABEL[r.reservation_status] ?? r.reservation_status}
                    </span>
                    {r.payment_status === 'paye' && (
                      <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Payé</span>
                    )}
                    <ArrowRight size={13} className="text-dark/20 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
