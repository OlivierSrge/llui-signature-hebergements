'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Loader2, Lock, Unlock } from 'lucide-react'
import { setForceFluxLlui } from '@/actions/reservation-source'

interface Props {
  partnerId: string
  initialValue: boolean
}

export default function ForceFluxLluiToggle({ partnerId, initialValue }: Props) {
  const router = useRouter()
  const [forced, setForced] = useState(initialValue)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    const newValue = !forced
    setLoading(true)
    const result = await setForceFluxLlui(partnerId, newValue)
    setLoading(false)
    if (result.success) {
      setForced(newValue)
      toast.success(newValue ? '🔒 Flux L&Lui forcé activé pour ce partenaire' : '🔓 Flux L&Lui forcé désactivé')
      router.refresh()
    } else {
      toast.error(result.error || 'Erreur')
    }
  }

  return (
    <div className={`p-4 rounded-xl border space-y-3 ${forced ? 'bg-gold-50 border-gold-200' : 'bg-white border-beige-200'}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {forced ? <Lock size={16} className="text-gold-600" /> : <Unlock size={16} className="text-dark/40" />}
          <div>
            <p className="text-sm font-semibold text-dark">🔒 Forcer toutes les réservations QR Code en Flux L&Lui</p>
            <p className="text-xs text-dark/50 mt-0.5">
              Si activé, toutes les réservations QR de ce partenaire basculent en Flux L&Lui. L&Lui encaisse la totalité.
            </p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${forced ? 'bg-gold-500' : 'bg-gray-200'}`}
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin absolute inset-0 m-auto text-white" />
          ) : (
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${forced ? 'translate-x-5' : 'translate-x-0'}`} />
          )}
        </button>
      </div>
      {forced && (
        <p className="text-xs text-gold-700 bg-gold-100 rounded-lg px-3 py-2">
          ✅ Actif — Le partenaire garde son QR Code mais L&Lui Signature encaisse la totalité des réservations.
        </p>
      )}
    </div>
  )
}
