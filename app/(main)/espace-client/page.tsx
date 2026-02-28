export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import Link from 'next/link'
import { Calendar, Clock, CheckCircle, XCircle, ArrowRight, CreditCard, Search } from 'lucide-react'
import { formatDate, formatPrice, getReservationStatusLabel, getReservationStatusColor, getPaymentStatusLabel, getPaymentStatusColor, getPaymentMethodLabel } from '@/lib/utils'

async function getReservationsByEmail(email: string) {
  const snap = await db.collection('reservations')
    .where('guest_email', '==', email)
    .get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => b.created_at?.localeCompare(a.created_at) || 0) as any[]
}

export const metadata = { title: 'Mes réservations' }

export default async function EspaceClientPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const sp = await searchParams
  const email = sp.email?.trim().toLowerCase()
  const reservations = email ? await getReservationsByEmail(email) : []

  const stats = {
    total: reservations.length,
    pending: reservations.filter((r) => r.reservation_status === 'en_attente').length,
    confirmed: reservations.filter((r) => r.reservation_status === 'confirmee').length,
    cancelled: reservations.filter((r) => r.reservation_status === 'annulee').length,
  }

  return (
    <div className="pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <p className="text-gold-600 text-sm font-medium tracking-widest uppercase mb-1">Espace personnel</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-dark">Mes réservations</h1>
          <div className="gold-divider mt-3" />
        </div>

        {/* Search form */}
        <form method="GET" className="bg-white rounded-2xl border border-beige-200 p-6 mb-8">
          <p className="text-sm text-dark/60 mb-4">Entrez l&apos;adresse email utilisée lors de votre réservation pour retrouver vos séjours.</p>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark/30" />
              <input
                type="email"
                name="email"
                defaultValue={email}
                required
                placeholder="votre@email.com"
                className="input-field pl-10 w-full"
              />
            </div>
            <button type="submit" className="btn-primary px-6">Rechercher</button>
          </div>
        </form>

        {email && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
              <StatCard icon={Calendar} label="Total" value={stats.total} color="text-dark" />
              <StatCard icon={Clock} label="En attente" value={stats.pending} color="text-amber-600" />
              <StatCard icon={CheckCircle} label="Confirmées" value={stats.confirmed} color="text-green-600" />
              <StatCard icon={XCircle} label="Annulées" value={stats.cancelled} color="text-red-500" />
            </div>

            <h2 className="font-serif text-2xl font-semibold text-dark mb-6">Réservations pour {email}</h2>

            {reservations.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-beige-200">
                <div className="text-5xl mb-4">🏖️</div>
                <h3 className="font-serif text-xl text-dark mb-2">Aucune réservation trouvée</h3>
                <p className="text-dark/50 mb-6">Vérifiez l&apos;email ou effectuez une nouvelle réservation.</p>
                <Link href="/" className="btn-primary">Découvrir les hébergements</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {reservations.map((res) => {
                  const acc = res.accommodation
                  return (
                    <div key={res.id} className="bg-white rounded-2xl border border-beige-200 p-5 hover:shadow-card transition-shadow">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {acc?.images?.[0] && (
                          <div className="relative w-full sm:w-24 h-32 sm:h-24 rounded-xl overflow-hidden flex-shrink-0">
                            <img src={acc.images[0]} alt={acc.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-xs text-dark/50 mb-0.5">#{res.id.slice(-8).toUpperCase()} · {acc?.partner?.name}</p>
                              <h3 className="font-semibold text-dark">{acc?.name}</h3>
                            </div>
                            <span className={`badge flex-shrink-0 ${getReservationStatusColor(res.reservation_status)}`}>
                              {getReservationStatusLabel(res.reservation_status)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-dark/60 mb-3">
                            <span className="flex items-center gap-1"><Calendar size={12} className="text-gold-500" />{formatDate(res.check_in)} → {formatDate(res.check_out)}</span>
                            <span>{res.nights} nuit{(res.nights ?? 0) > 1 ? 's' : ''} · {res.guests} pers.</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-dark">{formatPrice(res.total_price)}</span>
                              <span className={`badge text-xs ${getPaymentStatusColor(res.payment_status)}`}>
                                <CreditCard size={10} />{getPaymentStatusLabel(res.payment_status)}
                              </span>
                            </div>
                            <span className="text-xs text-dark/40">{getPaymentMethodLabel(res.payment_method)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="btn-outline-gold">Réserver un nouvel hébergement<ArrowRight size={16} /></Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-beige-200 text-center">
      <Icon size={20} className={`${color} mx-auto mb-2`} />
      <p className="text-2xl font-bold text-dark">{value}</p>
      <p className="text-xs text-dark/50 mt-0.5">{label}</p>
    </div>
  )
}
