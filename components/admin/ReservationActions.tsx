'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, DollarSign, Loader2 } from 'lucide-react'
import { updateReservationStatus, updatePaymentStatus } from '@/actions/reservations'
import type { Reservation } from '@/lib/types'

interface Props {
  reservation: Reservation
}

export default function ReservationActions({ reservation: res }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState(res.admin_notes || '')
  const [cancelReason, setCancelReason] = useState('')
  const [paymentRef, setPaymentRef] = useState(res.payment_reference || '')
  const [showCancelForm, setShowCancelForm] = useState(false)

  const act = async (action: string, fn: () => Promise<{ error?: string; success?: boolean }>) => {
    setLoading(action)
    try {
      const result = await fn()
      if (result.error) toast.error(result.error)
      else {
        toast.success('Mise à jour réussie')
        router.refresh()
      }
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setLoading(null)
    }
  }

  const isLoading = (action: string) => loading === action

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-5 space-y-4">
      <h3 className="font-semibold text-dark">Actions</h3>

      {/* Admin notes */}
      <div>
        <label className="label text-xs">Notes internes</label>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={2}
          placeholder="Notes visibles uniquement par l'équipe admin..."
          className="input-field text-sm resize-none"
        />
      </div>

      {/* Reservation status actions */}
      {res.reservation_status === 'en_attente' && (
        <div className="space-y-2">
          <button
            disabled={!!loading}
            onClick={() =>
              act('confirm', () =>
                updateReservationStatus(res.id, 'confirmee', adminNotes || undefined)
              )
            }
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isLoading('confirm') ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <CheckCircle size={15} />
            )}
            Confirmer la réservation
          </button>

          {!showCancelForm ? (
            <button
              onClick={() => setShowCancelForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <XCircle size={15} />
              Refuser / Annuler
            </button>
          ) : (
            <div className="space-y-2 p-3 bg-red-50 border border-red-200 rounded-xl">
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
                  onClick={() =>
                    act('cancel', () =>
                      updateReservationStatus(res.id, 'annulee', adminNotes || undefined, cancelReason || undefined)
                    )
                  }
                  className="flex-1 py-2 px-3 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isLoading('cancel') ? <Loader2 size={12} className="animate-spin" /> : null}
                  Confirmer l&apos;annulation
                </button>
                <button
                  onClick={() => setShowCancelForm(false)}
                  className="py-2 px-3 bg-white border border-beige-200 rounded-lg text-xs text-dark/60 hover:bg-beige-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {res.reservation_status === 'confirmee' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-xs text-green-700 font-medium flex items-center gap-1.5">
            <CheckCircle size={12} />
            Réservation confirmée
            {res.confirmed_at && ` le ${new Date(res.confirmed_at).toLocaleDateString('fr-FR')}`}
          </p>
        </div>
      )}

      {/* Payment actions */}
      <div className="border-t border-beige-200 pt-4 space-y-2">
        <p className="text-xs font-semibold text-dark/50 uppercase tracking-widest">Paiement</p>

        {res.payment_status !== 'paye' && (
          <div className="space-y-2">
            <input
              type="text"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="Référence de paiement (optionnel)"
              className="input-field text-sm"
            />
            <button
              disabled={!!loading}
              onClick={() =>
                act('pay', () =>
                  updatePaymentStatus(res.id, 'paye', paymentRef || undefined)
                )
              }
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gold-500 text-white rounded-xl text-sm font-medium hover:bg-gold-600 transition-colors disabled:opacity-50"
            >
              {isLoading('pay') ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <DollarSign size={15} />
              )}
              Marquer comme payé
            </button>
          </div>
        )}

        {res.payment_status === 'paye' && (
          <div className="p-3 bg-gold-50 border border-gold-200 rounded-xl">
            <p className="text-xs text-gold-700 font-medium flex items-center gap-1.5">
              <DollarSign size={12} />
              Paiement reçu
              {res.payment_date && ` le ${new Date(res.payment_date).toLocaleDateString('fr-FR')}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
