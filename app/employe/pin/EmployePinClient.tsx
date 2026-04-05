'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Delete } from 'lucide-react'
import { verifierPinEmploye } from '@/actions/employes'

async function hashPin(pin: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const TOUCHES = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export default function EmployePinClient() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  const ajouterChiffre = useCallback((val: string) => {
    if (val === '⌫') { setPin((p) => p.slice(0, -1)); return }
    if (val === '') return
    setPin((p) => p.length < 4 ? p + val : p)
  }, [])

  const valider = useCallback(async () => {
    if (pin.length !== 4 || isPending) return
    const employe_id = sessionStorage.getItem('employe_id')
    if (!employe_id) { router.replace('/employe'); return }
    setIsPending(true)
    setError('')
    try {
      const pin_hash = await hashPin(pin)
      const res = await verifierPinEmploye(employe_id, pin_hash)
      if (res.success && res.employe) {
        sessionStorage.setItem('employe_nom', res.employe.nom)
        sessionStorage.setItem('employe_partenaire_id', res.employe.partenaire_id)
        router.push('/employe/accueil')
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
  }, [pin, isPending, router])

  // Auto-valider quand 4 chiffres saisis
  const handleTouche = useCallback((val: string) => {
    if (val === '⌫' || val === '') { ajouterChiffre(val); return }
    const newPin = pin.length < 4 ? pin + val : pin
    setPin(newPin)
    if (newPin.length === 4) {
      // Déclencher validation avec le nouveau pin
      setTimeout(async () => {
        const employe_id = sessionStorage.getItem('employe_id')
        if (!employe_id) { router.replace('/employe'); return }
        setIsPending(true)
        setError('')
        try {
          const pin_hash = await hashPin(newPin)
          const res = await verifierPinEmploye(employe_id, pin_hash)
          if (res.success && res.employe) {
            sessionStorage.setItem('employe_nom', res.employe.nom)
            sessionStorage.setItem('employe_partenaire_id', res.employe.partenaire_id)
            router.push('/employe/accueil')
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
      }, 80)
    }
  }, [pin, router, ajouterChiffre])

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col items-center justify-center px-6 gap-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-serif text-2xl font-semibold">
          L<span className="text-gold-400">&</span>Lui
        </h1>
        <p className="text-white/50 text-sm mt-1">PIN Employe</p>
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
            onClick={() => !isPending && handleTouche(t)}
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
        onClick={() => router.replace('/employe')}
        className="text-white/30 text-sm underline"
      >
        Retour au scan QR
      </button>
    </div>
  )
}
