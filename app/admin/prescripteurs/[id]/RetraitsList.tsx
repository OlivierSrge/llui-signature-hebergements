'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2 } from 'lucide-react'
import { validerRetrait } from '@/actions/prescripteurs'
import type { Retrait } from '@/actions/prescripteurs'
import { toast } from 'react-hot-toast'

interface Props {
  retraits: Retrait[]
  prescripteurId: string
  titre: string
  showAll?: boolean
}

export default function RetraitsList({ retraits, prescripteurId, titre, showAll }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [processing, setProcessing] = useState<string | null>(null)

  const handleValider = (retraitId: string) => {
    setProcessing(retraitId)
    startTransition(async () => {
      const res = await validerRetrait(retraitId, 'admin')
      if (res.success) {
        toast.success('Retrait validé')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Erreur lors de la validation')
      }
      setProcessing(null)
    })
  }

  const statutLabel = (s: Retrait['statut']) => {
    if (s === 'demande')  return { label: 'En attente', cls: 'bg-amber-100 text-amber-700' }
    if (s === 'validee')  return { label: 'Validée', cls: 'bg-green-100 text-green-700' }
    return { label: 'Refusée', cls: 'bg-red-100 text-red-600' }
  }

  const methodeLabel = (m: string) => {
    if (m === 'mtn_momo')     return 'MTN MoMo'
    if (m === 'orange_money') return 'Orange Money'
    return m
  }

  return (
    <div id="retraits" className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-beige-200">
        <h2 className="font-semibold text-dark">{titre}</h2>
      </div>
      <div className="divide-y divide-beige-100">
        {retraits.map((r) => {
          const { label, cls } = statutLabel(r.statut)
          return (
            <div key={r.id} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-semibold text-dark">{r.montant_fcfa.toLocaleString('fr-FR')} FCFA</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
                </div>
                <p className="text-xs text-dark/50 mt-0.5">
                  {methodeLabel(r.methode)} · {r.numero_mobile_money}
                </p>
                <p className="text-xs text-dark/30 mt-0.5">
                  Demandé le {new Date(r.demande_at).toLocaleDateString('fr-FR')}
                  {r.traitee_at && ` · Traité le ${new Date(r.traitee_at).toLocaleDateString('fr-FR')}`}
                </p>
              </div>
              {r.statut === 'demande' && (
                <button
                  onClick={() => handleValider(r.id)}
                  disabled={isPending || processing === r.id}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  {processing === r.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Valider
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
