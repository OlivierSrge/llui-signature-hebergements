'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { type AllianceCardTier, type GenderType, type LocationType, TIER_CONFIGS } from '@/types/alliance-privee'
import { enregistrerPaiement } from '@/actions/alliance-privee'

const ORANGE_MONEY_NUMBER = '693 407 964'

interface Props {
  partenaireId: string
  tier: AllianceCardTier
  gender: GenderType
  location: LocationType
  prix: { montant: number; devise: 'EUR' | 'FCFA'; methode: 'REVOLUT' | 'ORANGE_MONEY' }
  revolutLink: string | null
  nomEtablissement: string
}

export default function AlliancePaiementClient({
  partenaireId, tier, gender, location, prix, revolutLink, nomEtablissement,
}: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const config = TIER_CONFIGS[tier]

  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const reference = `AP-${tier}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError('')
    const f = e.target.files?.[0] ?? null
    if (!f) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setFileError('Format invalide — PNG ou JPG uniquement')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setFileError('Fichier trop lourd — 5 MB maximum')
      return
    }
    setFile(f)
  }

  async function handleContinuer() {
    if (!file || submitting) return
    setError('')
    setUploading(true)

    try {
      // 1. Upload du justificatif
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/alliance/upload-payment-proof', {
        method: 'POST',
        body: formData,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok || !uploadData.url) {
        setError(uploadData.error ?? 'Échec de l\'upload — réessayez')
        setUploading(false)
        return
      }

      setUploading(false)
      setSubmitting(true)

      // 2. Créer le document paiement
      const payResult = await enregistrerPaiement({
        tier,
        gender,
        location,
        partenaire_id: partenaireId,
        proof_url: uploadData.url,
      })

      if (!payResult.success || !payResult.payment_id) {
        setError(payResult.error ?? 'Erreur enregistrement paiement')
        setSubmitting(false)
        return
      }

      // 3. Rediriger vers candidature
      router.push(
        `/alliance-privee/candidature?payment_id=${payResult.payment_id}&pid=${partenaireId}&tier=${tier}&gender=${gender}&location=${location}`
      )
    } catch (e) {
      setError('Erreur réseau — réessayez')
      setUploading(false)
      setSubmitting(false)
    }
  }

  const isLoading = uploading || submitting
  const canContinue = !!file && !fileError && !isLoading

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-5 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs tracking-widest uppercase mb-5">
            <span>✦</span>
            <span>Alliance Privée</span>
          </div>
          <h1 className="text-2xl font-serif font-light text-white mb-1">
            {prix.devise === 'EUR' ? '💳' : '📱'} Paiement {config.label}
          </h1>
          <p className="text-amber-400 font-bold text-2xl mt-2">
            {prix.montant.toLocaleString('fr-FR')} {prix.devise}
          </p>
        </div>

        {/* Instructions paiement */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          {prix.methode === 'REVOLUT' ? (
            <div className="space-y-4">
              <h2 className="text-white/80 font-medium text-sm flex items-center gap-2">
                <span>💳</span> Via Revolut
              </h2>
              <ol className="space-y-3">
                {[
                  { n: 1, text: 'Cliquez sur le bouton Revolut ci-dessous' },
                  { n: 2, text: `Envoyez EXACTEMENT ${prix.montant}€` },
                  { n: 3, text: `Dans la note, écrivez : "Alliance Privée - ${tier}"` },
                  { n: 4, text: 'Prenez un screenshot de la confirmation' },
                  { n: 5, text: 'Uploadez le screenshot ci-dessous' },
                ].map((step) => (
                  <li key={step.n} className="flex items-start gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {step.n}
                    </span>
                    <span className="text-white/60 text-sm">{step.text}</span>
                  </li>
                ))}
              </ol>
              <a
                href={revolutLink ?? 'https://revolut.me/olivieqf4i'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#191C1F] border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                Ouvrir Revolut
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-white/80 font-medium text-sm flex items-center gap-2">
                <span>📱</span> Via Orange Money
              </h2>
              <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Numéro</span>
                  <span className="text-white font-mono font-semibold">{ORANGE_MONEY_NUMBER}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Montant</span>
                  <span className="text-amber-400 font-bold">{prix.montant.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Référence</span>
                  <span className="text-white/70 font-mono text-xs">{reference}</span>
                </div>
              </div>
              <p className="text-white/50 text-xs leading-relaxed">
                Effectuez le virement Orange Money, puis prenez un <strong className="text-white/70">screenshot de la confirmation</strong> et uploadez-le ci-dessous.
              </p>
            </div>
          )}
        </div>

        {/* Upload justificatif */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          <h2 className="text-white/80 font-medium text-sm mb-3">📎 Justificatif de paiement</h2>
          <p className="text-white/40 text-xs mb-4">PNG ou JPG · 5 MB max</p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`w-full py-4 rounded-xl border-2 border-dashed text-sm transition-colors ${
              file
                ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300'
                : 'border-white/15 text-white/30 hover:border-amber-500/30 hover:text-amber-400/60'
            }`}
          >
            {file ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
                {file.name} ({(file.size / 1024).toFixed(0)} Ko)
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                Choisir votre screenshot
              </span>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {fileError && (
            <p className="text-red-400 text-xs mt-2">{fileError}</p>
          )}
        </div>

        {/* Erreur globale */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400 text-xs mb-4">
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleContinuer}
          disabled={!canContinue}
          className={`w-full py-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
            canContinue
              ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          {uploading ? (
            <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Upload en cours...</>
          ) : submitting ? (
            <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Enregistrement...</>
          ) : (
            'Continuer vers ma candidature →'
          )}
        </button>

        {!canContinue && !file && (
          <p className="text-center text-white/25 text-xs mt-3">
            Uploadez votre justificatif pour continuer
          </p>
        )}

        <p className="text-center text-white/20 text-xs mt-6">
          {nomEtablissement} · Alliance Privée L&Lui
        </p>
      </div>
    </div>
  )
}
