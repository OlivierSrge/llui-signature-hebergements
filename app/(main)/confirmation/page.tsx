import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CheckCircle2, Calendar, Users, CreditCard, Mail, ArrowRight } from 'lucide-react'
import {
  formatDate, formatPrice, getPaymentMethodLabel, getReservationStatusLabel
} from '@/lib/utils'
import type { Reservation } from '@/lib/types'

async function getReservation(id: string): Promise<Reservation | null> {
  if (!id) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('reservations')
    .select('*, accommodation:accommodations(name, location, images, partner:partners(name))')
    .eq('id', id)
    .single()
  return data
}

export const metadata = { title: 'Confirmation de réservation' }

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const sp = await searchParams
  const reservation = await getReservation(sp.id || '')

  if (!sp.id || !reservation) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🏖️</div>
          <h1 className="font-serif text-2xl font-semibold text-dark mb-2">
            Aucune réservation trouvée
          </h1>
          <p className="text-dark/50 mb-6">Le lien de confirmation est invalide ou expiré.</p>
          <Link href="/" className="btn-primary">Retour à l&apos;accueil</Link>
        </div>
      </div>
    )
  }

  const acc = reservation.accommodation as any

  return (
    <div className="pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Success header */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-5">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-dark mb-3">
            Demande envoyée !
          </h1>
          <p className="text-dark/60 text-lg leading-relaxed">
            Votre demande de réservation a bien été reçue par l&apos;équipe L&amp;Lui Signature.
            Un email de confirmation sera envoyé à{' '}
            <strong>{reservation.guest_email}</strong>.
          </p>
        </div>

        {/* Reservation card */}
        <div className="bg-white rounded-2xl shadow-card border border-beige-200 overflow-hidden mb-6">
          <div className="px-6 py-4 bg-beige-50 border-b border-beige-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-dark/50 font-medium uppercase tracking-widest">
                Réservation
              </p>
              <p className="font-mono text-sm font-bold text-dark mt-0.5">
                #{reservation.id.slice(-8).toUpperCase()}
              </p>
            </div>
            <span className="px-3 py-1.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
              {getReservationStatusLabel(reservation.reservation_status)}
            </span>
          </div>

          <div className="p-6 space-y-5">
            {/* Accommodation */}
            <div>
              <p className="text-xs text-dark/50 uppercase tracking-widest mb-1.5 font-medium">
                Hébergement
              </p>
              <p className="font-semibold text-dark">{acc?.name}</p>
              <p className="text-dark/50 text-sm">{acc?.location}</p>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-beige-50 rounded-xl">
                <p className="text-xs text-dark/50 mb-1 font-medium">Arrivée</p>
                <p className="font-semibold text-dark text-sm">{formatDate(reservation.check_in)}</p>
              </div>
              <div className="p-3 bg-beige-50 rounded-xl">
                <p className="text-xs text-dark/50 mb-1 font-medium">Départ</p>
                <p className="font-semibold text-dark text-sm">{formatDate(reservation.check_out)}</p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 text-sm">
              <InfoRow
                icon={Users}
                label="Voyageurs"
                value={`${reservation.guests} personne${reservation.guests > 1 ? 's' : ''}`}
              />
              <InfoRow
                icon={Calendar}
                label="Durée"
                value={`${reservation.nights} nuit${(reservation.nights ?? 0) > 1 ? 's' : ''}`}
              />
              <InfoRow
                icon={CreditCard}
                label="Mode de paiement"
                value={getPaymentMethodLabel(reservation.payment_method)}
              />
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-4 bg-gold-50 rounded-xl border border-gold-200">
              <span className="font-semibold text-dark">Total</span>
              <span className="font-bold text-xl text-gold-600">
                {formatPrice(reservation.total_price)}
              </span>
            </div>
          </div>
        </div>

        {/* Next steps */}
        <div className="bg-beige-50 rounded-2xl border border-beige-200 p-6 mb-8">
          <h3 className="font-semibold text-dark mb-4 flex items-center gap-2">
            <Mail size={18} className="text-gold-500" />
            Prochaines étapes
          </h3>
          <ol className="space-y-3">
            {[
              'Notre équipe examine votre demande sous 24h',
              reservation.payment_method === 'virement'
                ? 'Vous recevrez un email avec les coordonnées bancaires pour effectuer le virement'
                : reservation.payment_method === 'orange_money'
                  ? 'Vous recevrez un email avec le numéro Orange Money et les instructions'
                  : 'Notre équipe vous contactera pour convenir de la remise des espèces',
              'Après réception du paiement, votre réservation sera officiellement confirmée',
              'Un récapitulatif final vous sera envoyé avant votre arrivée',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-dark/70">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gold-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/espace-client" className="btn-primary flex-1 text-center justify-center">
            Suivre ma réservation
            <ArrowRight size={16} />
          </Link>
          <Link href="/" className="btn-secondary flex-1 text-center justify-center">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon, label, value,
}: {
  icon: React.ElementType; label: string; value: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-dark/50">
        <Icon size={14} className="text-gold-500" />
        {label}
      </span>
      <span className="font-medium text-dark">{value}</span>
    </div>
  )
}
