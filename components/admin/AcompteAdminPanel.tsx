'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Loader2, CheckCircle2, Zap } from 'lucide-react'
import { confirmAcompte, waiveAcompte } from '@/actions/reservation-source'

interface Props {
  reservationId: string
  acompteAmount: number
  acompteStatus: string | null
  acompteConfirmedAt?: string | null
}

export default function AcompteAdminPanel({ reservationId, acompteAmount, acompteStatus, acompteConfirmedAt }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'idle' | 'confirm' | 'waive'>('idle')
  const [loading, setLoading] = useState(false)
  const [montant, setMontant] = useState(acompteAmount)
  const [moyen, setMoyen] = useState('orange_money')
  const [ref, setRef] = useState('')
  const [raison, setRaison] = useState('')

  if (acompteStatus === 'confirmed') {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
        <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">Acompte L&Lui confirmé</p>
          <p className="text-xs text-green-600">{acompteAmount.toLocaleString('fr-FR')} FCFA — {acompteConfirmedAt ? new Date(acompteConfirmedAt).toLocaleDateString('fr-FR') : ''}</p>
        </div>
      </div>
    )
  }

  if (acompteStatus === 'waived') {
    return (
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2">
        <Zap size={16} className="text-purple-600 flex-shrink-0" />
        <p className="text-sm font-semibold text-purple-800">Acompte dispensé — Pipeline partenaire débloqué</p>
      </div>
    )
  }

  const handleConfirm = async () => {
    if (!ref.trim()) { toast.error('Référence requise'); return }
    setLoading(true)
    const result = await confirmAcompte(reservationId, 'admin', montant, moyen, ref)
    setLoading(false)
    if (result.success) { toast.success('Acompte confirmé — Pipeline partenaire débloqué'); router.refresh() }
    else toast.error(result.error || 'Erreur')
  }

  const handleWaive = async () => {
    if (!raison.trim()) { toast.error('Raison requise'); return }
    setLoading(true)
    const result = await waiveAcompte(reservationId, 'admin', raison)
    setLoading(false)
    if (result.success) { toast.success('Acompte dispensé'); router.refresh() }
    else toast.error(result.error || 'Erreur')
  }

  return (
    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-orange-800">⏳ Acompte en attente — {acompteAmount.toLocaleString('fr-FR')} FCFA</p>
        <span className="text-[10px] bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-medium">QR Code</span>
      </div>

      {mode === 'idle' && (
        <div className="flex gap-2">
          <button onClick={() => setMode('confirm')} className="flex-1 py-2 px-3 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-700 transition-colors">
            ✅ Confirmer réception acompte
          </button>
          <button onClick={() => setMode('waive')} className="flex-1 py-2 px-3 bg-purple-600 text-white rounded-xl text-xs font-medium hover:bg-purple-700 transition-colors">
            ⚡ Dispenser l'acompte
          </button>
        </div>
      )}

      {mode === 'confirm' && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-orange-800">Confirmation de réception</p>
          <input type="number" value={montant} onChange={(e) => setMontant(Number(e.target.value))} className="input-field text-sm" placeholder="Montant reçu (FCFA)" />
          <select value={moyen} onChange={(e) => setMoyen(e.target.value)} className="input-field text-sm">
            <option value="orange_money">Orange Money</option>
            <option value="revolut">Revolut</option>
            <option value="autre">Autre</option>
          </select>
          <input type="text" value={ref} onChange={(e) => setRef(e.target.value)} className="input-field text-sm" placeholder="Référence de paiement" />
          <div className="flex gap-2">
            <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-700 flex items-center justify-center gap-1 disabled:opacity-50">
              {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Confirmer et débloquer
            </button>
            <button onClick={() => setMode('idle')} className="py-2 px-3 border border-beige-200 rounded-xl text-xs text-dark/50">Annuler</button>
          </div>
        </div>
      )}

      {mode === 'waive' && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-purple-800">Dispense de l'acompte (VIP / cas exceptionnel)</p>
          <input type="text" value={raison} onChange={(e) => setRaison(e.target.value)} className="input-field text-sm" placeholder="Raison de la dispense (obligatoire)" />
          <div className="flex gap-2">
            <button onClick={handleWaive} disabled={loading} className="flex-1 py-2 bg-purple-600 text-white rounded-xl text-xs font-medium hover:bg-purple-700 flex items-center justify-center gap-1 disabled:opacity-50">
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Dispenser et débloquer
            </button>
            <button onClick={() => setMode('idle')} className="py-2 px-3 border border-beige-200 rounded-xl text-xs text-dark/50">Annuler</button>
          </div>
        </div>
      )}
    </div>
  )
}
