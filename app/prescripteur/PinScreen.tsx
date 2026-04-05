'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { verifierPinPrescripteur } from '@/actions/prescripteurs'

// ─── Hash SHA-256 côté client (crypto.subtle, pas de réseau) ──
// Le hash est calculé LOCALEMENT avant tout appel serveur.
// Le PIN brut ne transite jamais en clair dans les logs serveur.
async function hashPinClient(pin: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(pin),
  )
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

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

// ─── Styles partagés ──────────────────────────────────────────
const BTN_SIZE = 72

const digitStyle: React.CSSProperties = {
  width: BTN_SIZE,
  height: BTN_SIZE,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.92)',
  border: '1.5px solid rgba(255,255,255,0.4)',
  fontSize: 24,
  fontWeight: 700,
  color: '#1A1A1A',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
  transition: 'transform 0.1s ease, opacity 0.1s ease',
}

const delStyle: React.CSSProperties = {
  width: BTN_SIZE,
  height: BTN_SIZE,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.12)',
  border: '1.5px solid rgba(255,255,255,0.2)',
  fontSize: 24,
  color: 'white',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  cursor: 'pointer',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
  transition: 'transform 0.1s ease',
}

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

  const addDigit = useCallback((d: number) => {
    if (isLocked || isPending) return
    setError('')
    setPin((prev) => (prev.length < 4 ? prev + String(d) : prev))
  }, [isLocked, isPending])

  const effacer = useCallback(() => {
    if (isLocked || isPending) return
    setPin((prev) => prev.slice(0, -1))
    setError('')
  }, [isLocked, isPending])

  const valider = useCallback(async () => {
    if (pin.length !== 4 || isLocked || isPending) return
    setIsPending(true)
    setError('')
    try {
      const hash = await hashPinClient(pin)
      const result = await verifierPinPrescripteur(hash)
      if (result.success && result.prescripteur) {
        clearAttempts()
        sessionStorage.setItem('prescripteur_uid', result.prescripteur.uid)
        sessionStorage.setItem('prescripteur_nom', result.prescripteur.nom_complet)
        sessionStorage.setItem('prescripteur_type', result.prescripteur.type)
        sessionStorage.setItem('prescripteur_note_moyenne', String(result.prescripteur.note_moyenne ?? 0))
        sessionStorage.setItem('prescripteur_total_notes', String(result.prescripteur.total_notes ?? 0))
        sessionStorage.setItem('prescripteur_badge_confiance', result.prescripteur.badge_confiance ? '1' : '0')
        router.push('/prescripteur/accueil')
        return
      } else {
        const { locked } = recordFailedAttempt()
        setShake(true)
        setTimeout(() => setShake(false), 600)
        if (locked) {
          setIsLocked(true)
          setLockRemaining(LOCKOUT_DURATION_MS)
        } else {
          const remaining = MAX_ATTEMPTS - getAttempts()
          setError(
            remaining > 0
              ? `Code incorrect — ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`
              : 'Code incorrect.'
          )
        }
      }
    } catch (e) {
      console.error('[PIN] Erreur vérification:', e)
      setError('Erreur réseau. Réessayez.')
    } finally {
      setIsPending(false)
      setPin('')
    }
  }, [pin, isLocked, isPending, router])

  // Auto-submit dès 4 chiffres
  useEffect(() => {
    if (pin.length === 4 && !isPending && !isLocked) {
      valider()
    }
  }, [pin, isPending, isLocked, valider])

  const lockMinutes = Math.ceil(lockRemaining / 60000)
  const lockSeconds = Math.ceil((lockRemaining % 60000) / 1000)
  const validateReady = pin.length === 4 && !isPending

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        background: 'linear-gradient(160deg, #1A1A1A 0%, #2C1810 100%)',
        userSelect: 'none',
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 600, color: 'white', margin: 0 }}>
          L<span style={{ color: '#C9A84C' }}>&</span>Lui
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 22, fontWeight: 300, marginLeft: 6 }}>Signature</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 8, letterSpacing: 3, textTransform: 'uppercase' }}>
          Espace prescripteur
        </p>
      </div>

      {isLocked ? (
        /* ── Écran de blocage ──────────────────────────────── */
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <span style={{ fontSize: 36 }}>🔒</span>
          </div>
          <p style={{ color: '#f87171', fontWeight: 600, fontSize: 18, margin: '0 0 12px' }}>Accès bloqué</p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.6 }}>
            Trop de tentatives incorrectes.<br />
            Réessayez dans{' '}
            <span style={{ color: 'white', fontWeight: 700 }}>
              {lockMinutes}:{String(lockSeconds).padStart(2, '0')}
            </span>
          </p>
        </div>
      ) : (
        <>
          {/* ── Indicateurs PIN (4 points) ──────────────────── */}
          <div
            style={{ display: 'flex', gap: 20, marginBottom: 24 }}
            className={shake ? 'animate-shake' : ''}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: `2px solid ${i < pin.length ? '#C9A84C' : 'rgba(255,255,255,0.3)'}`,
                  background: i < pin.length ? '#C9A84C' : 'transparent',
                  transform: i < pin.length ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                }}
              />
            ))}
          </div>

          {/* ── Message d'état ───────────────────────────────── */}
          <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            {isPending ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#C9A84C' }}>
                <span style={{ fontSize: 20, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Vérification…</span>
              </div>
            ) : error ? (
              <div style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: 12,
                padding: '8px 16px',
              }}>
                <span style={{ color: '#f87171', fontSize: 13, fontWeight: 500 }}>{error}</span>
              </div>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Entrez votre code PIN</p>
            )}
          </div>

          {/* ── Pavé numérique ── grille 3 colonnes × 4 lignes ─ */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(3, ${BTN_SIZE}px)`,
              gap: 16,
            }}
          >
            {/* Ligne 1 : 1 2 3 */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                onPointerDown={(e) => { e.preventDefault(); addDigit(n) }}
                disabled={isPending}
                aria-label={String(n)}
                style={{
                  ...digitStyle,
                  opacity: isPending ? 0.5 : 1,
                }}
              >
                {n}
              </button>
            ))}

            {/* Ligne 4 : ⌫  0  ✓ */}
            {/* Touche Effacer */}
            <button
              onPointerDown={(e) => { e.preventDefault(); effacer() }}
              disabled={isPending || pin.length === 0}
              aria-label="Effacer"
              style={{
                ...delStyle,
                opacity: (isPending || pin.length === 0) ? 0.4 : 1,
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>⌫</span>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>EFFACER</span>
            </button>

            {/* Touche 0 */}
            <button
              onPointerDown={(e) => { e.preventDefault(); addDigit(0) }}
              disabled={isPending}
              aria-label="0"
              style={{
                ...digitStyle,
                opacity: isPending ? 0.5 : 1,
              }}
            >
              0
            </button>

            {/* Touche Valider — TOUJOURS VISIBLE */}
            <button
              onPointerDown={(e) => { e.preventDefault(); valider() }}
              disabled={!validateReady}
              aria-label="Valider"
              style={{
                width: BTN_SIZE,
                height: BTN_SIZE,
                borderRadius: '50%',
                background: validateReady ? '#C9A84C' : 'rgba(255,255,255,0.15)',
                border: `2px solid ${validateReady ? '#e2a83a' : 'rgba(255,255,255,0.25)'}`,
                fontSize: 28,
                color: validateReady ? '#1A1A1A' : 'rgba(255,255,255,0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                cursor: validateReady ? 'pointer' : 'default',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease',
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: 26, lineHeight: 1 }}>✓</span>
              <span style={{ fontSize: 8, letterSpacing: 1, fontWeight: 700 }}>OK</span>
            </button>
          </div>

          {/* ── Aide ─────────────────────────────────────────── */}
          <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, marginTop: 32, textAlign: 'center' }}>
            Problème ? Contactez le gérant.
          </p>
        </>
      )}

      {/* Spin keyframe pour l'indicateur de chargement */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
