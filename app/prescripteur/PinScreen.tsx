'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Delete } from 'lucide-react'
import { verifierPinPrescripteur } from '@/actions/prescripteurs'

const LOCKOUT_KEY = 'presc_lockout'
const ATTEMPTS_KEY = 'presc_attempts'
const MAX_ATTEMPTS = 3
const LOCKOUT_DURATION_MS = 5 * 60 * 1000 // 5 min

function getLockoutState(): { locked: boolean; remainingMs: number } {
  if (typeof window === 'undefined') return { locked: false, remainingMs: 0 }
  const raw = localStorage.getItem(LOCKOUT_KEY)
  if (!raw) return { locked: false, remainingMs: 0 }
  const until = parseInt(raw, 10)
  const remaining = until - Date.now()
  if (remaining <= 0) {
    localStorage.removeItem(LOCKOUT_KEY)
    localStorage.removeItem(ATTEMPTS_KEY)
    return { locked: false, remainingMs: 0 }
  }
  return { locked: true, remainingMs: remaining }
}

function getAttempts(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(ATTEMPTS_KEY) ?? '0', 10)
}

function recordFailedAttempt(): { locked: boolean } {
  const attempts = getAttempts() + 1
  localStorage.setItem(ATTEMPTS_KEY, String(attempts))
  if (attempts >= MAX_ATTEMPTS) {
    localStorage.setItem(LOCKOUT_KEY, String(Date.now() + LOCKOUT_DURATION_MS))
    return { locked: true }
  }
  return { locked: false }
}

function clearAttempts() {
  localStorage.removeItem(LOCKOUT_KEY)
  localStorage.removeItem(ATTEMPTS_KEY)
}

export default function PinScreen() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [lockRemaining, setLockRemaining] = useState(0)
  const [isPending, setIsPending] = useState(false)
  const [shake, setShake] = useState(false)

  // Check lockout on mount and keep countdown
  useEffect(() => {
    const state = getLockoutState()
    if (state.locked) {
      setIsLocked(true)
      setLockRemaining(state.remainingMs)
    }
  }, [])

  useEffect(() => {
    if (!isLocked) return
    const interval = setInterval(() => {
      const state = getLockoutState()
      if (!state.locked) {
        setIsLocked(false)
        setLockRemaining(0)
        setError('')
      } else {
        setLockRemaining(state.remainingMs)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isLocked])

  const handleDigit = useCallback((d: string) => {
    if (isLocked || isPending) return
    setError('')
    setPin((prev) => (prev.length < 4 ? prev + d : prev))
  }, [isLocked, isPending])

  const handleDelete = useCallback(() => {
    if (isLocked || isPending) return
    setPin((prev) => prev.slice(0, -1))
    setError('')
  }, [isLocked, isPending])

  const handleSubmit = useCallback(async () => {
    if (pin.length !== 4 || isLocked || isPending) return
    setIsPending(true)
    setError('')
    try {
      const result = await verifierPinPrescripteur(pin)
      if (result.success && result.prescripteur) {
        clearAttempts()
        // Store session in sessionStorage
        sessionStorage.setItem('prescripteur_uid', result.prescripteur.uid)
        sessionStorage.setItem('prescripteur_nom', result.prescripteur.nom_complet)
        sessionStorage.setItem('prescripteur_type', result.prescripteur.type)
        router.push('/prescripteur/accueil')
      } else {
        const { locked } = recordFailedAttempt()
        setPin('')
        setShake(true)
        setTimeout(() => setShake(false), 500)
        if (locked) {
          setIsLocked(true)
          setLockRemaining(LOCKOUT_DURATION_MS)
          setError('')
        } else {
          const remaining = MAX_ATTEMPTS - getAttempts()
          setError(remaining > 0
            ? `Code incorrect. Réessayez. (${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''})`
            : 'Code incorrect. Réessayez.'
          )
        }
      }
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setIsPending(false)
    }
  }, [pin, isLocked, isPending, router])

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4 && !isPending && !isLocked) {
      handleSubmit()
    }
  }, [pin, isPending, isLocked, handleSubmit])

  const lockMinutes = Math.ceil(lockRemaining / 60000)

  const KEYS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ]

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 min-h-screen bg-dark">
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="font-serif text-3xl font-semibold text-white">
          L<span className="text-gold-400">&</span>Lui
          <span className="text-white/60 text-2xl font-light ml-1">Signature</span>
        </h1>
        <p className="text-white/40 text-sm mt-2">Espace prescripteur</p>
      </div>

      {isLocked ? (
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-3xl">🔒</span>
          </div>
          <p className="text-red-400 font-semibold">Accès bloqué</p>
          <p className="text-white/50 text-sm">
            Trop de tentatives incorrectes.<br />
            Réessayez dans <span className="text-white font-semibold">{lockMinutes} min</span>.
          </p>
        </div>
      ) : (
        <>
          {/* PIN dots */}
          <div className={`flex gap-4 mb-8 ${shake ? 'animate-shake' : ''}`}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                  i < pin.length
                    ? 'bg-gold-400 border-gold-400 scale-110'
                    : 'border-white/30 bg-transparent'
                }`}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm mb-6 text-center max-w-xs">{error}</p>
          )}

          {/* Numeric keypad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
            {KEYS.flat().map((key, idx) => {
              if (key === '') return <div key={idx} />
              if (key === 'del') return (
                <button
                  key="del"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="h-16 rounded-2xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
                >
                  <Delete size={20} />
                </button>
              )
              return (
                <button
                  key={key}
                  onClick={() => handleDigit(key)}
                  disabled={isPending}
                  className="h-16 rounded-2xl bg-white/10 text-white text-xl font-semibold hover:bg-white/20 active:scale-95 transition-all select-none"
                >
                  {key}
                </button>
              )
            })}
          </div>

          {isPending && (
            <p className="text-white/40 text-sm mt-6 animate-pulse">Vérification...</p>
          )}
        </>
      )}
    </div>
  )
}
