'use client'

import { useState, useTransition } from 'react'
import { recordBoutiqueAchat } from '@/actions/clients'
import { ShoppingBag, Loader2, CheckCircle } from 'lucide-react'

export default function BoutiqueAchatForm({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    startTransition(async () => {
      const res = await recordBoutiqueAchat(clientId, data)
      if (res.success) {
        setResult({ success: true, message: `Achat enregistré ! +${res.pointsGagnes} points gagnés.` })
        form.reset()
        setTimeout(() => { setResult(null); setOpen(false) }, 3000)
      } else {
        setResult({ success: false, message: res.error || 'Erreur inconnue' })
      }
    })
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <ShoppingBag size={15} /> Enregistrer achat boutique
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-green-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-dark flex items-center gap-2">
              <ShoppingBag size={16} className="text-green-600" /> Nouvel achat boutique
            </h3>
            <button onClick={() => { setOpen(false); setResult(null) }} className="text-dark/40 hover:text-dark text-sm">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-dark/60 mb-1.5">Montant de l&apos;achat (FCFA) *</label>
              <input
                type="number"
                name="montant"
                min="1000"
                step="500"
                required
                placeholder="ex : 25000"
                className="input-field w-full"
              />
              <p className="text-xs text-dark/40 mt-1">1 000 FCFA = 10 points</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-dark/60 mb-1.5">Articles achetés</label>
              <input
                type="text"
                name="articles"
                placeholder="ex : Bougie signature, Tisane du terroir"
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-dark/60 mb-1.5">Date de l&apos;achat *</label>
              <input
                type="date"
                name="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="input-field w-full"
              />
            </div>

            {result && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {result.success && <CheckCircle size={14} />}
                {result.message}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
                {isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setResult(null) }}
                className="px-4 py-2.5 border border-beige-200 rounded-xl text-sm text-dark/60 hover:bg-beige-50"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
