'use client'

import { useState, useTransition } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import { confirmPartnerReservation } from '@/actions/partner-confirm'

interface Props {
  reservationId: string
}

export default function ConfirmButton({ reservationId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await confirmPartnerReservation(reservationId)
      if (!result.success) {
        setError((result as any).error || 'Une erreur est survenue')
        return
      }
      setDone(true)
    })
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
        <CheckCircle size={24} className="text-green-600 mx-auto mb-2" />
        <p className="text-green-700 font-semibold text-sm">Réservation confirmée avec succès !</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      <button
        onClick={handleConfirm}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors disabled:opacity-50 text-sm"
      >
        {isPending ? (
          <><Loader2 size={16} className="animate-spin" /> Confirmation en cours...</>
        ) : (
          <>✅ Confirmer cette réservation</>
        )}
      </button>
    </div>
  )
}
