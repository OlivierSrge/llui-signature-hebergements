'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { requestOtp, verifyOtpAndLinkClient } from '@/actions/stars'
import { genererCodeSessionLie } from '@/actions/codes-sessions'

type Step = 'phone' | 'otp' | 'generating'

interface Props {
  partenaireId: string
  partenaireNom: string
  partenairePhoto?: string
}

export default function PromoClientForm({ partenaireId, partenaireNom, partenairePhoto }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [verifiedPhone, setVerifiedPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // ── Étape 1 : demander l'OTP ──────────────────────────────────
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await requestOtp(phone.trim(), 'promo_pending')
    setLoading(false)
    if (res.success) {
      setVerifiedPhone(phone.trim())
      setStep('otp')
      startCooldown()
    } else {
      setError(res.error ?? 'Impossible d\'envoyer le code. Vérifiez votre numéro.')
    }
  }

  // ── Renvoi OTP ────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError('')
    setLoading(true)
    const res = await requestOtp(verifiedPhone, 'promo_pending')
    setLoading(false)
    if (res.success) startCooldown()
    else setError(res.error ?? 'Erreur envoi code')
  }

  const startCooldown = () => {
    setResendCooldown(60)
    const t = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(t); return 0 }
        return c - 1
      })
    }, 1000)
  }

  // ── Étape 2 : vérifier l'OTP puis générer le code ────────────
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const verify = await verifyOtpAndLinkClient(verifiedPhone, otp.trim(), 'promo_pending')
    if (!verify.success) {
      setLoading(false)
      setError(verify.error ?? 'Code incorrect. Réessayez.')
      return
    }

    // OTP validé — générer le code session lié
    setStep('generating')
    const gen = await genererCodeSessionLie(partenaireId, verifiedPhone)
    if (!gen.success || !gen.code) {
      setLoading(false)
      setStep('otp')
      setError('Erreur lors de la génération du code. Réessayez.')
      return
    }

    router.push(`/sejour/${gen.code}`)
  }

  // ── UI ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-sm space-y-6">

        {/* Header partenaire */}
        <div className="text-center">
          {partenairePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partenairePhoto}
              alt={partenaireNom}
              className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#C9A84C]/20 flex items-center justify-center mx-auto mb-3 text-3xl">
              🏪
            </div>
          )}
          <p className="text-xs font-medium text-[#C9A84C] uppercase tracking-widest mb-1">
            L&Lui Signature ✨
          </p>
          <h1 className="text-xl font-serif font-semibold text-[#1A1A1A]">{partenaireNom}</h1>
        </div>

        {/* ── Étape 1 : Saisie téléphone ── */}
        {step === 'phone' && (
          <>
            <div className="text-center">
              <p className="text-sm text-[#1A1A1A]/60">
                Entrez votre numéro WhatsApp pour recevoir votre code de réduction et cumuler des points fidélité.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+237 6XX XX XX XX"
                  className="w-full border border-[#1A1A1A]/20 rounded-xl px-4 py-3 text-[#1A1A1A] text-base focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50"
                  required
                  autoFocus
                />
                <p className="text-xs text-[#1A1A1A]/40 mt-1">
                  Un code à 6 chiffres vous sera envoyé sur WhatsApp
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="w-full py-3 bg-[#C9A84C] text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Envoi en cours...' : 'Recevoir mon code →'}
              </button>
            </form>
          </>
        )}

        {/* ── Étape 2 : Vérification OTP ── */}
        {step === 'otp' && (
          <>
            <div className="text-center">
              <div className="text-3xl mb-2">📱</div>
              <p className="text-sm text-[#1A1A1A]/60">
                Code envoyé sur WhatsApp au{' '}
                <strong className="text-[#1A1A1A]">{verifiedPhone}</strong>
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Code de vérification
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full border border-[#1A1A1A]/20 rounded-xl px-4 py-3 text-[#1A1A1A] text-2xl text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-[#C9A84C] text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Vérification...' : 'Valider mon code →'}
              </button>
            </form>

            <div className="text-center space-y-2">
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className="text-sm text-[#C9A84C] disabled:text-[#1A1A1A]/30 disabled:cursor-not-allowed underline"
              >
                {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : 'Renvoyer le code'}
              </button>
              <br />
              <button
                onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                className="text-xs text-[#1A1A1A]/40 underline"
              >
                Changer de numéro
              </button>
            </div>
          </>
        )}

        {/* ── Étape 3 : Génération en cours ── */}
        {step === 'generating' && (
          <div className="text-center py-6 space-y-4">
            <div className="text-5xl animate-bounce">🎁</div>
            <p className="text-[#1A1A1A] font-semibold">Votre code est en cours de génération...</p>
            <p className="text-sm text-[#1A1A1A]/50">Vous allez être redirigé automatiquement.</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[#1A1A1A]/25 text-xs">
          Vos données restent confidentielles · L&Lui Signature
        </p>
      </div>
    </div>
  )
}
