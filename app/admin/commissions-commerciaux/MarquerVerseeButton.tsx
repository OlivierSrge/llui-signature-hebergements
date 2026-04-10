'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { marquerCommissionsVersees } from '@/actions/commerciaux'

interface Props {
  commercialId: string
  commercialNom: string
  duesFcfa: number
}

export default function MarquerVerseeButton({ commercialId, commercialNom, duesFcfa }: Props) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (duesFcfa <= 0 || done) {
    return done ? (
      <span className="text-xs text-green-600 flex items-center gap-1">
        <CheckCircle2 size={12} /> Versée ✓
      </span>
    ) : null
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => {
          startTransition(async () => {
            const res = await marquerCommissionsVersees(commercialId, 'Admin')
            if (res.success) {
              setDone(true)
            } else {
              setError(res.error ?? 'Erreur')
            }
          })
        }}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
      >
        {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
        Marquer versée ({duesFcfa.toLocaleString('fr-FR')} FCFA)
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
