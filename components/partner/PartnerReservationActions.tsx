'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, XCircle, DollarSign } from 'lucide-react'
import { updatePaymentStatus, updateReservationStatus } from '@/actions/reservations'

interface Props {
  reservation: any
}

export default function PartnerReservationActions({ reservation: res }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [paymentRef, setPaymentRef] = useState(res.payment_reference || '')
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const act = async (key: string, fn: () => Promise<{ success?: boolean; error?: string }>) => {
    setLoading(key)
    try {
      const result = await fn()
      if (!result.success) toast.error(result.error || 'Erreur')
      else { toast.success('Mis à jour'); router.refresh() }
    } catch { toast.error('Erreur') }
    finally { setLoading(null) }
  }

  const isLoading = (key: string) => loading === key

  if (res.reservation_status === 'annulee') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center text-sm text-red-700">
        Cette réservation a été annulée.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-5 space-y-4">
      <h2 className="font-semibold text-dark text-sm">Actions</h2>

      {/* Paiement */}
      {res.payment_status !== 'paye' && (
        <div className="space-y-2">
          <p className="text-xs text-dark/50 font-medium uppercase tracking-widest">Paiement reçu</p>
          <input
            type="text"
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
            placeholder="Référence / numéro de transaction (optionnel)"
            className="input-field text-sm"
          />
          <button
            disabled={!!loading}
            onClick={() => act('pay', () => updatePaymentStatus(res.id, 'paye', paymentRef || undefined))}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isLoading('pay') ? <Loader2 size={15} className="animate-spin" /> : <DollarSign size={15} />}
            Valider le paiement
          </button>
        </div>
      )}

      {res.payment_status === 'paye' && (
        <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-200 rounded-xl p-3">
          <DollarSign size={14} />
          Paiement validé
          {res.payment_date && ` le ${new Date(res.payment_date).toLocaleDateString('fr-FR')}`}
        </div>
      )}

      {/* Réservation — confirmer si en attente */}
      {res.reservation_status === 'en_attente' && (
        <div className="space-y-2 border-t border-beige-100 pt-4">
          <p className="text-xs text-dark/50 font-medium uppercase tracking-widest">Réservation</p>
          <button
            disabled={!!loading}
            onClick={() => act('confirm', () => updateReservationStatus(res.id, 'confirmee'))}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gold-500 text-white rounded-xl text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
          >
            {isLoading('confirm') ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
            Confirmer la réservation
          </button>

          {!showCancel ? (
            <button
              onClick={() => setShowCancel(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <XCircle size={15} /> Annuler la réservation
            </button>
          ) : (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                placeholder="Motif d'annulation (optionnel)"
                className="input-field text-sm resize-none"
              />
              <div className="flex gap-2">
                <button
                  disabled={!!loading}
                  onClick={() => act('cancel', () => updateReservationStatus(res.id, 'annulee', undefined, cancelReason || undefined))}
                  className="flex-1 py-2 px-3 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isLoading('cancel') ? <Loader2 size={12} className="animate-spin" /> : null}
                  Confirmer l&apos;annulation
                </button>
                <button
                  onClick={() => setShowCancel(false)}
                  className="py-2 px-3 bg-white border border-beige-200 rounded-lg text-xs text-dark/60 hover:bg-beige-50"
                >
                  Retour
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {res.reservation_status === 'confirmee' && (
        <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-200 rounded-xl p-3">
          <CheckCircle size={14} />
          Réservation confirmée
          {res.confirmed_at && ` le ${new Date(res.confirmed_at).toLocaleDateString('fr-FR')}`}
        </div>
      )}
    </div>
  )
}
