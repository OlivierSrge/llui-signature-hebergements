'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Delete } from 'lucide-react'
import { verifierPinCommercial } from '@/actions/commerciaux'

async function hashPin(pin: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const TOUCHES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export default function CommercialPinClient() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  const valider = useCallback(async (currentPin: string) => {
    const commercial_id = sessionStorage.getItem('commercial_id')
    if (!commercial_id) { router.replace('/commercial'); return }
    setIsPending(true)
    setError('')
    try {
      const pin_hash = await hashPin(currentPin)
      const res = await verifierPinCommercial(commercial_id, pin_hash)
      if (res.success && res.commercial) {
        sessionStorage.setItem('commercial_nom', res.commercial.nom_complet)
        sessionStorage.setItem('commercial_partenaire_id', res.commercial.partenaire_id)
        router.push('/commercial/enregistrement')
        return
      } else {
        setError(res.error ?? 'PIN incorrect')
      }
    } catch {
      setError('Erreur reseau. Reessayez.')
    } finally {
      setIsPending(false)
      setPin('')
    }
  }, [router])

  const handleTouche = useCallback((val: string) => {
    if (isPending) return
    if (val === '⌫') { setPin((p) => p.slice(0, -1)); return }
    if (val === '') return
    const newPin = pin.length < 4 ? pin + val : pin
    setPin(newPin)
    if (newPin.length === 4) {
      setTimeout(() => valider(newPin), 80)
    }
  }, [pin, isPending, valider])

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col items-center justify-center px-6 gap-8">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-semibold">
          L<span className="text-gold-400">&</span>Lui
        </h1>
        <p className="text-white/50 text-sm mt-1">PIN Commercial</p>
      </div>

      <p className="text-white/60 text-sm text-center">Entrez votre PIN a 4 chiffres</p>

      {/* Indicateurs PIN */}
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all ${
              pin[i] !== undefined ? 'bg-gold-400 scale-110' : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center bg-red-500/10 rounded-xl px-4 py-2">{error}</p>
      )}

      {/* Clavier */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {TOUCHES.map((t, i) => (
          <button
            key={i}
            onClick={() => handleTouche(t)}
            disabled={t === '' || isPending}
            className={`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
              t === '⌫' ? 'bg-white/10 text-white/70' :
              t === '' ? 'invisible' :
              'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isPending && t === '0' ? (
              <Loader2 size={20} className="mx-auto animate-spin" />
            ) : t === '⌫' ? (
              <Delete size={20} className="mx-auto" />
            ) : t}
          </button>
        ))}
      </div>

      <button
        onClick={() => router.replace('/commercial')}
        className="text-white/30 text-sm underline"
      >
        Retour au scan QR
      </button>
    </div>
  )
}
