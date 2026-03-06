export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import { formatDate } from '@/lib/utils'
import ConfirmButton from './ConfirmButton'

interface Props {
  params: { reservationId: string }
  searchParams: { pid?: string }
}

export default async function PartnerConfirmPage({ params, searchParams }: Props) {
  const { reservationId } = params
  const pid = searchParams.pid || null

  const doc = await db.collection('reservations').doc(reservationId).get()

  if (!doc.exists) {
    return (
      <div className="min-h-screen bg-beige-50 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-white rounded-2xl border border-beige-200 p-8 text-center shadow-sm">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="font-serif text-xl font-semibold text-dark mb-2">Réservation introuvable</h1>
          <p className="text-dark/50 text-sm">Ce lien de confirmation n&apos;est pas valide ou a expiré.</p>
        </div>
      </div>
    )
  }

  const reservation = { id: doc.id, ...doc.data() } as any

  // Verify partner_id if pid is provided
  if (pid && reservation.partner_id && reservation.partner_id !== pid) {
    return (
      <div className="min-h-screen bg-beige-50 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-white rounded-2xl border border-beige-200 p-8 text-center shadow-sm">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="font-serif text-xl font-semibold text-dark mb-2">Accès non autorisé</h1>
          <p className="text-dark/50 text-sm">Vous n&apos;êtes pas autorisé à confirmer cette réservation.</p>
        </div>
      </div>
    )
  }

  const isConfirmed = reservation.reservation_status === 'confirmee'

  return (
    <div className="min-h-screen bg-beige-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="font-serif text-2xl font-semibold text-dark">L&amp;Lui</span>
            <span className="text-gold-500 font-serif text-lg">Signature</span>
          </div>
          <p className="text-dark/40 text-xs">Espace partenaire — Confirmation de réservation</p>
        </div>

        <div className="bg-white rounded-2xl border border-beige-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-beige-100 bg-beige-50/50">
            <h1 className="font-serif text-lg font-semibold text-dark">
              {isConfirmed ? 'Réservation confirmée ✅' : 'Nouvelle réservation'}
            </h1>
            {reservation.confirmation_code && (
              <p className="text-xs text-dark/40 font-mono mt-0.5">Réf : {reservation.confirmation_code}</p>
            )}
          </div>

          {/* Détails */}
          <div className="px-6 py-5 space-y-4">
            {/* Client */}
            <div>
              <p className="text-xs font-medium text-dark/40 uppercase tracking-wide mb-1">Client</p>
              <p className="font-semibold text-dark">
                {reservation.guest_first_name} {reservation.guest_last_name}
              </p>
              {reservation.guest_phone && (
                <p className="text-sm text-dark/50">{reservation.guest_phone}</p>
              )}
            </div>

            {/* Hébergement */}
            <div>
              <p className="text-xs font-medium text-dark/40 uppercase tracking-wide mb-1">Hébergement</p>
              <p className="font-semibold text-dark">{reservation.accommodation?.name || reservation.accommodation_id}</p>
              {reservation.accommodation?.location && (
                <p className="text-sm text-dark/50">{reservation.accommodation.location}</p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-dark/40 uppercase tracking-wide mb-1">Arrivée</p>
                <p className="font-semibold text-dark text-sm">{formatDate(reservation.check_in, 'dd MMM yyyy')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-dark/40 uppercase tracking-wide mb-1">Départ</p>
                <p className="font-semibold text-dark text-sm">{formatDate(reservation.check_out, 'dd MMM yyyy')}</p>
              </div>
            </div>

            {/* Nuits & voyageurs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-dark/40 uppercase tracking-wide mb-1">Durée</p>
                <p className="font-semibold text-dark text-sm">
                  {reservation.nights} nuit{reservation.nights > 1 ? 's' : ''}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-dark/40 uppercase tracking-wide mb-1">Voyageurs</p>
                <p className="font-semibold text-dark text-sm">{reservation.guests}</p>
              </div>
            </div>

            {/* Prix */}
            <div className="bg-beige-50 rounded-xl p-4 flex items-center justify-between">
              <p className="text-sm font-medium text-dark/70">Montant total</p>
              <p className="text-xl font-bold text-dark">
                {(reservation.total_price || 0).toLocaleString('fr-FR')} FCFA
              </p>
            </div>

            {/* Statut confirmation */}
            {isConfirmed && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-green-700 font-semibold text-sm">✅ Cette réservation est déjà confirmée</p>
                {reservation.confirmed_at && (
                  <p className="text-green-600 text-xs mt-1">
                    Confirmée le {formatDate(reservation.confirmed_at.split('T')[0], 'dd MMM yyyy')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action */}
          {!isConfirmed && (
            <div className="px-6 pb-6">
              <ConfirmButton reservationId={reservationId} />
            </div>
          )}
        </div>

        <p className="text-center text-xs text-dark/30 mt-4">
          L&amp;Lui Signature — Plateforme de gestion hébergements
        </p>
      </div>
    </div>
  )
}
