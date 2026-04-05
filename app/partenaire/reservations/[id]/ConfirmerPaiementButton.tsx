'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { confirmerPaiementReservation } from '@/actions/prescripteurs'
import { toast } from 'react-hot-toast'

interface Props {
  reservationId: string
}

export default function ConfirmerPaiementButton({ reservationId }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      const res = await confirmerPaiementReservation(reservationId)
      if (!res.success) {
        toast.error(res.error ?? 'Erreur lors de la confirmation')
      } else {
        setDone(true)
        toast.success('Paiement confirmé — le prescripteur est notifié')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-green-700 text-sm font-medium py-2">
        <CheckCircle2 size={16} />
        Paiement confirmé — en attente du scan moto-taxi
      </div>
    )
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={isLoading}
      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
    >
      {isLoading ? (
        <><Loader2 size={15} className="animate-spin" /> Confirmation en cours...</>
      ) : (
        'Confirmer le paiement client'
      )}
    </button>
  )
}
