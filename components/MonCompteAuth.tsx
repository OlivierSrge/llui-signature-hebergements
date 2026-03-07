'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, MessageCircle, CheckCircle, Eye, EyeOff, RefreshCw } from 'lucide-react'

type Step = 'email' | 'pin'

interface PinState {
  hasPin: boolean        // client a un PIN permanent
  phone: string | null   // pour le lien WhatsApp
  temporaryPin?: string  // PIN temporaire affiché à l'écran
}

export default function MonCompteAuth() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [pinState, setPinState] = useState<PinState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── Étape 1 : soumettre l'email ──
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/client/request-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur inconnue')
        return
      }
      setPinState({
        hasPin: data.hasPin,
        phone: data.phone,
        temporaryPin: data.pin,
      })
      setStep('pin')
    } catch {
      setError('Erreur de connexion. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  // ── Étape 2 : vérifier le PIN ──
  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pin.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/client/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), pin: pin.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Code PIN incorrect')
        return
      }
      // Session créée → recharger la page pour que le Server Component lise le cookie
      router.refresh()
    } catch {
      setError('Erreur de connexion. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  // ── Regénérer un nouveau PIN ──
  async function handleResendPin() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/client/request-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur'); return }
      setPinState({ hasPin: data.hasPin, phone: data.phone, temporaryPin: data.pin })
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  function buildWhatsAppUrl(phone: string, pin: string) {
    const cleaned = phone.replace(/\D/g, '')
    const formatted = cleaned.startsWith('237') ? cleaned : `237${cleaned}`
    const msg = `Mon code PIN L&Lui Stars : *${pin}*\nValable 15 minutes.\nNe pas partager ce code.`
    return `https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-6 mb-8 max-w-md mx-auto">
      {step === 'email' && (
        <>
          <p className="text-sm text-dark/60 mb-5">
            Entrez votre email de réservation. Vous recevrez un code PIN sur votre WhatsApp pour accéder à votre espace fidélité.
          </p>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark/30" />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="input-field pl-10 w-full"
              />
            </div>
            {error && <p className="text-sm text-red-600 flex items-center gap-1.5">⚠ {error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
              {loading ? 'Vérification…' : 'Recevoir mon code PIN'}
            </button>
          </form>
        </>
      )}

      {step === 'pin' && pinState && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => { setStep('email'); setError(''); setPin('') }} className="text-dark/40 hover:text-dark text-xs flex items-center gap-1">
              ← Retour
            </button>
            <span className="text-xs text-dark/40">Compte trouvé : {email}</span>
          </div>

          {/* PIN temporaire affiché */}
          {!pinState.hasPin && pinState.temporaryPin && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-amber-700 mb-2">Votre code PIN temporaire (valable 15 min)</p>
              <div className="flex items-center gap-3">
                <p className="font-mono text-3xl font-bold text-dark tracking-[0.3em]">
                  {showPin ? pinState.temporaryPin : '••••'}
                </p>
                <button onClick={() => setShowPin(!showPin)} className="text-dark/30 hover:text-dark transition-colors">
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                Notez ce code ou enregistrez-le via WhatsApp ci-dessous.
              </p>
              {pinState.phone && (
                <a
                  href={buildWhatsAppUrl(pinState.phone, pinState.temporaryPin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white text-xs font-medium"
                  style={{ background: '#25D366' }}
                >
                  <MessageCircle size={13} /> Enregistrer dans WhatsApp
                </a>
              )}
            </div>
          )}

          {pinState.hasPin && (
            <p className="text-sm text-dark/60 mb-4">
              Saisissez votre code PIN mémorisable pour accéder à votre espace.
            </p>
          )}

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-dark/60 mb-1.5">
                <Lock size={12} className="inline mr-1" /> Code PIN
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="\d{4,6}"
                maxLength={6}
                required
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • •"
                className="input-field w-full text-center text-2xl tracking-[0.4em] font-mono"
              />
            </div>

            {error && <p className="text-sm text-red-600 flex items-center gap-1.5">⚠ {error}</p>}

            <button type="submit" disabled={loading || pin.length < 4} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {loading ? 'Vérification…' : 'Accéder à mon espace'}
            </button>

            {/* Renvoyer un PIN */}
            {!pinState.hasPin && (
              <button
                type="button"
                onClick={handleResendPin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-dark/40 hover:text-dark/60 transition-colors py-1"
              >
                <RefreshCw size={12} /> Générer un nouveau code PIN
              </button>
            )}
          </form>
        </>
      )}
    </div>
  )
}
