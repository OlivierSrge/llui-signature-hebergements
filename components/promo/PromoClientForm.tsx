'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { genererCodeSessionLie } from '@/actions/codes-sessions'

type Step = 'phone' | 'generating' | 'quota'

interface Props {
  partenaireId: string
  partenaireNom: string
  partenairePhoto?: string
}

export default function PromoClientForm({ partenaireId, partenaireNom, partenairePhoto }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quotaInfo, setQuotaInfo] = useState<{ nextAvailableAt: string; remainingDays: number } | null>(null)

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setStep('generating')

    const gen = await genererCodeSessionLie(partenaireId, phone.trim())

    if (!gen.success && gen.error === 'quota_atteint' && gen.nextAvailableAt) {
      setQuotaInfo({
        nextAvailableAt: gen.nextAvailableAt,
        remainingDays: gen.remainingDays ?? 0,
      })
      setLoading(false)
      setStep('quota')
      return
    }

    if (!gen.success || !gen.code) {
      setLoading(false)
      setStep('phone')
      setError('Erreur lors de la génération du code. Réessayez.')
      return
    }

    router.push(`/sejour/${gen.code}`)
  }

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

        {/* ── Saisie téléphone ── */}
        {step === 'phone' && (
          <>
            <div className="text-center">
              <p className="text-sm text-[#1A1A1A]/60">
                Entrez votre numéro de téléphone pour obtenir votre code et cumuler des points fidélité.
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
              </div>

              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="w-full py-3 bg-[#C9A84C] text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Génération...' : 'Obtenir mon code →'}
              </button>
            </form>
          </>
        )}

        {/* ── Génération en cours ── */}
        {step === 'generating' && (
          <div className="text-center py-6 space-y-4">
            <div className="text-5xl animate-bounce">🎁</div>
            <p className="text-[#1A1A1A] font-semibold">Votre code est en cours de génération...</p>
            <p className="text-sm text-[#1A1A1A]/50">Vous allez être redirigé automatiquement.</p>
          </div>
        )}

        {/* ── Quota atteint ── */}
        {step === 'quota' && quotaInfo && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-5xl mb-3">⏳</div>
              <h2 className="text-xl font-bold text-[#1A1A1A]">Code encore valide</h2>
              <p className="text-[#1A1A1A]/60 text-sm mt-1">
                Vous avez déjà généré un code récemment.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">📅</span>
                <div>
                  <p className="font-semibold text-amber-900 text-sm">Prochain code disponible :</p>
                  <p className="text-amber-800 text-sm mt-0.5">
                    {new Date(quotaInfo.nextAvailableAt).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/70 rounded-lg px-3 py-2">
                <span className="text-lg">⏱️</span>
                <div>
                  <p className="text-xs text-amber-800">Temps restant</p>
                  <p className="text-lg font-bold text-amber-700">
                    {quotaInfo.remainingDays} jour{quotaInfo.remainingDays > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Accès Stars dashboard */}
            <a
              href={`/mon-stars?tel=${encodeURIComponent(phone.trim())}`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-[#C9A84C] text-white font-semibold rounded-xl"
            >
              ⭐ Voir mes Stars & mes avantages
            </a>

            <div className="bg-[#F5F0E8] rounded-xl p-4 space-y-2">
              <p className="text-[#1A1A1A]/70 text-sm font-semibold">💡 En attendant :</p>
              <a href="/hebergements" className="flex items-center gap-2 text-sm text-[#1A1A1A]/70 hover:text-[#C9A84C]">
                🏠 Découvrir nos hébergements partenaires
              </a>
              <a href="https://l-et-lui-signature.com/produit.html?id=29&cat=PASS%20VIP" className="flex items-center gap-2 text-sm text-[#1A1A1A]/70 hover:text-[#C9A84C]">
                💎 Obtenir un Pass VIP L&Lui Signature
              </a>
            </div>

            <button
              onClick={() => { setStep('phone'); setPhone(''); setQuotaInfo(null); setError('') }}
              className="w-full py-3 border border-[#1A1A1A]/20 text-[#1A1A1A] font-medium rounded-xl transition hover:bg-[#1A1A1A]/5"
            >
              ← Retour
            </button>
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
