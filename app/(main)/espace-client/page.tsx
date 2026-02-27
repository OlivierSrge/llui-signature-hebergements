import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Calendar, Clock, CheckCircle, XCircle, ArrowRight, CreditCard,
} from 'lucide-react'
import {
  formatDate, formatPrice, getReservationStatusLabel, getReservationStatusColor,
  getPaymentStatusLabel, getPaymentStatusColor, getPaymentMethodLabel,
} from '@/lib/utils'
import type { Reservation } from '@/lib/types'

async function getUserReservations(userId: string): Promise<Reservation[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reservations')
    .select('*, accommodation:accommodations(name, slug, images, location, partner:partners(name))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data || []
}

export const metadata = { title: 'Mon espace – Mes réservations' }

export default async function EspaceClientPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/connexion?redirect=/espace-client')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const reservations = await getUserReservations(user.id)

  const stats = {
    total: reservations.length,
    pending: reservations.filter((r) => r.reservation_status === 'en_attente').length,
    confirmed: reservations.filter((r) => r.reservation_status === 'confirmee').length,
    cancelled: reservations.filter((r) => r.reservation_status === 'annulee').length,
  }

  return (
    <div className="pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="text-gold-600 text-sm font-medium tracking-widest uppercase mb-1">
            Espace personnel
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-dark">
            Bonjour, {profile?.first_name || 'cher client'} !
          </h1>
          <div className="gold-divider mt-3" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <StatCard icon={Calendar} label="Total" value={stats.total} color="text-dark" />
          <StatCard icon={Clock} label="En attente" value={stats.pending} color="text-amber-600" />
          <StatCard icon={CheckCircle} label="Confirmées" value={stats.confirmed} color="text-green-600" />
          <StatCard icon={XCircle} label="Annulées" value={stats.cancelled} color="text-red-500" />
        </div>

        {/* Reservations list */}
        <div>
          <h2 className="font-serif text-2xl font-semibold text-dark mb-6">
            Mes réservations
          </h2>

          {reservations.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-beige-200">
              <div className="text-5xl mb-4">🏖️</div>
              <h3 className="font-serif text-xl text-dark mb-2">Aucune réservation</h3>
              <p className="text-dark/50 mb-6">
                Vous n&apos;avez pas encore effectué de réservation.
              </p>
              <Link href="/" className="btn-primary">
                Découvrir les hébergements
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map((res) => {
                const acc = res.accommodation as any
                return (
                  <div
                    key={res.id}
                    className="bg-white rounded-2xl border border-beige-200 p-5 hover:shadow-card transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Accommodation image */}
                      {acc?.images?.[0] && (
                        <div className="relative w-full sm:w-24 h-32 sm:h-24 rounded-xl overflow-hidden flex-shrink-0">
                          <img
                            src={acc.images[0]}
                            alt={acc.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-xs text-dark/50 mb-0.5">
                              #{res.id.slice(-8).toUpperCase()} · {acc?.partner?.name}
                            </p>
                            <h3 className="font-semibold text-dark">{acc?.name}</h3>
                          </div>
                          <span className={`badge flex-shrink-0 ${getReservationStatusColor(res.reservation_status)}`}>
                            {getReservationStatusLabel(res.reservation_status)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-dark/60 mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-gold-500" />
                            {formatDate(res.check_in)} → {formatDate(res.check_out)}
                          </span>
                          <span>
                            {res.nights} nuit{(res.nights ?? 0) > 1 ? 's' : ''} · {res.guests} pers.
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-dark">
                              {formatPrice(res.total_price)}
                            </span>
                            <span className={`badge text-xs ${getPaymentStatusColor(res.payment_status)}`}>
                              <CreditCard size={10} />
                              {getPaymentStatusLabel(res.payment_status)}
                            </span>
                          </div>
                          <span className="text-xs text-dark/40">
                            {getPaymentMethodLabel(res.payment_method)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link href="/" className="btn-outline-gold">
            Réserver un nouvel hébergement
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-beige-200 text-center">
      <Icon size={20} className={`${color} mx-auto mb-2`} />
      <p className="text-2xl font-bold text-dark">{value}</p>
      <p className="text-xs text-dark/50 mt-0.5">{label}</p>
    </div>
  )
}
