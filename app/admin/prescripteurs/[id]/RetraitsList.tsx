'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2, AlertTriangle } from 'lucide-react'
import { validerRetrait, refuserRetrait } from '@/actions/prescripteurs'
import type { Retrait } from '@/actions/prescripteurs'
import { toast } from 'react-hot-toast'

interface Props {
  retraits: Retrait[]
  prescripteurId: string
  titre: string
  showAll?: boolean
}

function methodeLabel(m: string, op?: string) {
  if (op === 'mtn' || m === 'mtn_momo') return 'MTN MoMo'
  if (op === 'orange' || m === 'orange_money') return 'Orange Money'
  return m
}

function statutBadge(s: Retrait['statut']) {
  if (s === 'demande')  return { label: 'En attente', cls: 'bg-amber-100 text-amber-700' }
  if (s === 'validee')  return { label: 'Validée ✓', cls: 'bg-green-100 text-green-700' }
  return { label: 'Refusée', cls: 'bg-red-100 text-red-600' }
}

export default function RetraitsList({ retraits, prescripteurId, titre }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [processing, setProcessing] = useState<string | null>(null)

  // Modal refus
  const [refusModal, setRefusModal] = useState<{ id: string; montant: number } | null>(null)
  const [motif, setMotif] = useState('')
  const [motifError, setMotifError] = useState('')

  const handleValider = (retraitId: string) => {
    setProcessing(retraitId)
    startTransition(async () => {
      const res = await validerRetrait(retraitId, 'admin')
      if (res.success) {
        toast.success('Retrait validé et SMS envoyé au prescripteur')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Erreur lors de la validation')
      }
      setProcessing(null)
    })
  }

  const handleRefuserConfirm = () => {
    if (!motif.trim()) { setMotifError('Le motif est obligatoire'); return }
    if (!refusModal) return
    const id = refusModal.id
    setProcessing(id)
    setRefusModal(null)
    startTransition(async () => {
      const res = await refuserRetrait(id, 'admin', motif.trim())
      if (res.success) {
        toast.success('Retrait refusé — SMS envoyé au prescripteur')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Erreur lors du refus')
      }
      setProcessing(null)
      setMotif('')
    })
  }

  return (
    <>
      <div id="retraits" className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-beige-200 flex items-center justify-between">
          <h2 className="font-semibold text-dark">{titre}</h2>
          <span className="text-xs text-dark/40">{retraits.length} demande{retraits.length > 1 ? 's' : ''}</span>
        </div>
        <div className="divide-y divide-beige-100">
          {retraits.length === 0 && (
            <p className="text-center py-8 text-dark/40 text-sm">Aucune demande</p>
          )}
          {retraits.map((r) => {
            const { label, cls } = statutBadge(r.statut)
            const isLoading = processing === r.id
            return (
              <div key={r.id} className="flex items-start justify-between gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-semibold text-dark text-lg">
                      {r.montant_fcfa.toLocaleString('fr-FR')} FCFA
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
                  </div>
                  <p className="text-sm text-dark/60 mt-1">
                    {methodeLabel(r.methode, r.operateur)} · <span className="font-medium">{r.numero_mobile_money}</span>
                  </p>
                  <p className="text-xs text-dark/30 mt-0.5">
                    Demandé le {new Date(r.demande_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {r.traitee_at && ` · Traité le ${new Date(r.traitee_at).toLocaleDateString('fr-FR')}`}
                  </p>
                  {r.motif_refus && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertTriangle size={11} /> {r.motif_refus}
                    </p>
                  )}
                </div>
                {r.statut === 'demande' && (
                  <div className="flex gap-2 flex-shrink-0 pt-1">
                    <button
                      onClick={() => handleValider(r.id)}
                      disabled={isPending || isLoading}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-40 transition-colors"
                    >
                      {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      Payer
                    </button>
                    <button
                      onClick={() => { setMotif(''); setMotifError(''); setRefusModal({ id: r.id, montant: r.montant_fcfa }) }}
                      disabled={isPending || isLoading}
                      className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-40 transition-colors"
                    >
                      <X size={13} /> Refuser
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal refus */}
      {refusModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="absolute inset-0 bg-dark/50 backdrop-blur-sm" onClick={() => setRefusModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <X size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-dark text-lg">Refuser le retrait</h3>
                <p className="text-dark/50 text-sm mt-0.5">
                  Retrait de <span className="font-semibold text-dark">{refusModal.montant.toLocaleString('fr-FR')} FCFA</span>
                </p>
              </div>
            </div>
            <div>
              <label className="text-dark/70 text-sm font-medium block mb-2">
                Motif du refus <span className="text-red-500">*</span>
              </label>
              <textarea
                value={motif}
                onChange={(e) => { setMotif(e.target.value); setMotifError('') }}
                rows={3}
                placeholder="Ex : Numéro incorrect, solde insuffisant..."
                className="w-full border border-beige-200 rounded-xl px-4 py-3 text-sm text-dark placeholder-dark/30 focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
              />
              {motifError && <p className="text-red-500 text-xs mt-1">{motifError}</p>}
            </div>
            <p className="text-dark/40 text-xs">
              Un SMS WhatsApp sera automatiquement envoyé au prescripteur avec ce motif.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRefuserConfirm}
                disabled={isPending}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Confirmer le refus
              </button>
              <button
                onClick={() => setRefusModal(null)}
                className="px-5 py-3 rounded-xl border border-beige-200 text-dark/60 text-sm hover:bg-beige-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
