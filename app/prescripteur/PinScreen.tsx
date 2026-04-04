'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Delete, Loader2, Check } from 'lucide-react'
import { verifierPinPrescripteur } from '@/actions/prescripteurs'

// ─── Lockout helpers ──────────────────────────────────────────
const LOCKOUT_KEY = 'presc_lockout'
const ATTEMPTS_KEY = 'presc_attempts'
const MAX_ATTEMPTS = 3
const LOCKOUT_DURATION_MS = 5 * 60 * 1000

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

// ─── Clavier : 4 rangées × 3 touches ─────────────────────────
// 'del' = effacer dernier chiffre
// 'ok'  = valider (bouton fallback)
// ''    = cellule vide
const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['del', '0', 'ok'],
] as const

// ─── Composant ────────────────────────────────────────────────
export default function PinScreen() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [lockRemaining, setLockRemaining] = useState(0)
  const [isPending, setIsPending] = useState(false)
  const [shake, setShake] = useState(false)

  // Vérifier lockout au montage
  useEffect(() => {
    const state = getLockoutState()
    if (state.locked) {
      setIsLocked(true)
      setLockRemaining(state.remainingMs)
    }
  }, [])

  // Countdown du lockout
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

  // ─── Handlers ───────────────────────────────────────────────

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
        sessionStorage.setItem('prescripteur_uid', result.prescripteur.uid)
        sessionStorage.setItem('prescripteur_nom', result.prescripteur.nom_complet)
        sessionStorage.setItem('prescripteur_type', result.prescripteur.type)
        router.push('/prescripteur/accueil')
      } else {
        const { locked } = recordFailedAttempt()
        setPin('')
        setShake(true)
        setTimeout(() => setShake(false), 600)
        if (locked) {
          setIsLocked(true)
          setLockRemaining(LOCKOUT_DURATION_MS)
          setError('')
        } else {
          const remaining = MAX_ATTEMPTS - getAttempts()
          setError(
            remaining > 0
              ? `Code incorrect — ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`
              : 'Code incorrect. Réessayez.'
          )
        }
      }
    } catch (e) {
      console.error('[PIN] Erreur vérification:', e)
      setError('Erreur réseau. Vérifiez votre connexion et réessayez.')
      setPin('')
    } finally {
      setIsPending(false)
    }
  }, [pin, isLocked, isPending, router])

  // Auto-submit dès 4 chiffres
  useEffect(() => {
    if (pin.length === 4 && !isPending && !isLocked) {
      handleSubmit()
    }
  }, [pin, isPending, isLocked, handleSubmit])

  const lockMinutes = Math.ceil(lockRemaining / 60000)
  const lockSeconds = Math.ceil((lockRemaining % 60000) / 1000)

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 py-12 select-none"
      style={{ background: 'linear-gradient(160deg, #1A1A1A 0%, #2C1810 100%)' }}
    >
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="font-serif text-3xl font-semibold text-white tracking-wide">
          L<span style={{ color: '#C9A84C' }}>&</span>Lui
          <span className="text-white/50 text-2xl font-light ml-1">Signature</span>
        </h1>
        <p className="text-white/40 text-sm mt-2 tracking-widest uppercase text-xs">
          Espace prescripteur
        </p>
      </div>

      {isLocked ? (
        /* ── Écran de blocage ──────────────────────────────── */
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-4xl">🔒</span>
          </div>
          <p className="text-red-400 font-semibold text-lg">Accès bloqué</p>
          <p className="text-white/50 text-sm leading-relaxed">
            Trop de tentatives incorrectes.<br />
            Réessayez dans{' '}
            <span className="text-white font-semibold">
              {lockMinutes}:{String(lockSeconds).padStart(2, '0')}
            </span>
          </p>
        </div>
      ) : (
        <>
          {/* ── Indicateur de chargement ────────────────────── */}
          <div className="h-8 mb-4 flex items-center justify-center">
            {isPending ? (
              <div className="flex items-center gap-2 text-white/60">
                <Loader2 size={18} className="animate-spin" style={{ color: '#C9A84C' }} />
                <span className="text-sm">Vérification en cours…</span>
              </div>
            ) : (
              <p className="text-white/30 text-sm">Entrez votre code PIN à 4 chiffres</p>
            )}
          </div>

          {/* ── Indicateurs PIN (4 points) ──────────────────── */}
          <div className={`flex gap-5 mb-6 ${shake ? 'animate-shake' : ''}`}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="transition-all duration-150"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: `2px solid ${i < pin.length ? '#C9A84C' : 'rgba(255,255,255,0.3)'}`,
                  background: i < pin.length ? '#C9A84C' : 'transparent',
                  transform: i < pin.length ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          {/* ── Message d'erreur ─────────────────────────────── */}
          <div className="h-10 flex items-center justify-center mb-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 px-4 py-2 rounded-xl">
                <span className="text-red-400 text-sm font-medium text-center">{error}</span>
              </div>
            )}
          </div>

          {/* ── Pavé numérique ───────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
            {KEYS.flat().map((key, idx) => {

              // Touche Effacer
              if (key === 'del') return (
                <button
                  key="del"
                  onPointerDown={(e) => { e.preventDefault(); handleDelete() }}
                  disabled={isPending || pin.length === 0}
                  aria-label="Effacer"
                  style={{
                    height: 64,
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    opacity: (isPending || pin.length === 0) ? 0.3 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 2,
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  className="active:scale-90 transition-transform"
                >
                  <Delete size={20} color="white" />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>EFFACER</span>
                </button>
              )

              // Touche Valider (fallback manuel)
              if (key === 'ok') return (
                <button
                  key="ok"
                  onPointerDown={(e) => { e.preventDefault(); handleSubmit() }}
                  disabled={isPending || pin.length !== 4}
                  aria-label="Valider"
                  style={{
                    height: 64,
                    borderRadius: 16,
                    background: pin.length === 4 && !isPending
                      ? 'linear-gradient(135deg, #C9A84C, #e2a83a)'
                      : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${pin.length === 4 && !isPending ? '#C9A84C' : 'rgba(255,255,255,0.12)'}`,
                    opacity: isPending ? 0.7 : pin.length !== 4 ? 0.25 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 2,
                    cursor: pin.length === 4 ? 'pointer' : 'default',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.2s ease',
                  }}
                  className="active:scale-90"
                >
                  {isPending
                    ? <Loader2 size={20} color="white" className="animate-spin" />
                    : <Check size={20} color={pin.length === 4 ? '#1A1A1A' : 'white'} />
                  }
                  <span style={{
                    fontSize: 9,
                    color: pin.length === 4 && !isPending ? '#1A1A1A' : 'rgba(255,255,255,0.4)',
                    letterSpacing: 1,
                    fontWeight: 700,
                  }}>
                    {isPending ? '…' : 'VALIDER'}
                  </span>
                </button>
              )

              // Chiffre 0-9
              return (
                <button
                  key={key}
                  onPointerDown={(e) => { e.preventDefault(); handleDigit(key) }}
                  disabled={isPending}
                  aria-label={key}
                  style={{
                    height: 64,
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    opacity: isPending ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  className="active:scale-90 active:bg-white/20 transition-transform"
                >
                  <span style={{ fontSize: 22, fontWeight: 600, color: 'white' }}>{key}</span>
                </button>
              )
            })}
          </div>

          {/* ── Aide sous le clavier ─────────────────────────── */}
          <p className="text-white/20 text-xs mt-8 text-center">
            Problème de connexion ? Contactez le gérant.
          </p>
        </>
      )}
    </div>
  )
}
