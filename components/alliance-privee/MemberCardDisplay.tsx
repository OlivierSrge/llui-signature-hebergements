'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { type CardDetails, TIER_CONFIGS } from '@/types/alliance-privee'

interface Props {
  card: CardDetails
  cardId: string
}

const APP_URL = 'https://llui-signature-hebergements.vercel.app'

const TIER_GRADIENTS = {
  PRESTIGE:  'from-amber-950 via-amber-900/80 to-amber-950',
  EXCELLENCE:'from-slate-900 via-slate-800/80 to-slate-900',
  ELITE:     'from-black via-purple-950/60 to-black',
}

const TIER_ACCENTS = {
  PRESTIGE:  { primary: '#C9A84C', text: 'text-amber-400',  border: 'border-amber-500/30',  glow: 'shadow-amber-500/20' },
  EXCELLENCE:{ primary: '#E8E8E8', text: 'text-slate-200',  border: 'border-slate-400/30',  glow: 'shadow-slate-400/20' },
  ELITE:     { primary: '#B9F2FF', text: 'text-purple-200', border: 'border-purple-400/30', glow: 'shadow-purple-400/20' },
}

export default function MemberCardDisplay({ card, cardId }: Props) {
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)
  const [emailInput, setEmailInput] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)

  const config = TIER_CONFIGS[card.tier]
  const accent = TIER_ACCENTS[card.tier]
  const gradient = TIER_GRADIENTS[card.tier]
  const carteUrl = `${APP_URL}/alliance-privee/carte?card_id=${cardId}`

  const expiresFormatted = new Date(card.expires_at).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const activatedFormatted = new Date(card.activated_at).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  async function handleDownload() {
    if (!cardRef.current || downloading) return
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `alliance-privee-${card.card_number}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      console.error('Erreur téléchargement:', e)
    } finally {
      setDownloading(false)
    }
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!emailInput || emailLoading) return
    setEmailLoading(true)
    setEmailError('')
    try {
      const res = await fetch('/api/alliance/send-card-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId, email: emailInput }),
      })
      const data = await res.json()
      if (data.success) {
        setEmailSent(true)
        setShowEmailForm(false)
      } else {
        setEmailError(data.error ?? 'Erreur envoi email')
      }
    } catch {
      setEmailError('Erreur réseau — réessayez')
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Fond décoratif */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-500/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-900/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 py-10">

        {/* Badge Alliance */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs tracking-widest uppercase mb-4">
            <span>✦</span>
            <span>Alliance Privée</span>
            <span>✦</span>
          </div>
          <h1 className="text-2xl font-serif font-light text-white">
            Bienvenue, {card.prenom}
          </h1>
          <p className="text-white/40 text-sm mt-1">Votre carte membre est active</p>
        </div>

        {/* ─── CARTE DIGITALE ────────────────────────────────── */}
        <div
          ref={cardRef}
          className={`relative rounded-3xl bg-gradient-to-br ${gradient} border ${accent.border} p-7 mb-6 shadow-2xl ${accent.glow} overflow-hidden`}
          style={{ aspectRatio: '1.586 / 1' }}   // ratio carte bancaire
        >
          {/* Motif décoratif fond */}
          <div className="absolute inset-0 pointer-events-none opacity-5">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full border border-white" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full border border-white" />
          </div>

          {/* Ligne supérieure */}
          <div className="flex items-start justify-between mb-auto">
            <div>
              <p className={`${accent.text} text-[10px] tracking-[4px] uppercase mb-0.5`}>
                Alliance Privée
              </p>
              <div className="flex items-center gap-1.5">
                <span className={`${accent.text} text-lg`}>{config.emoji}</span>
                <span className={`${accent.text} font-semibold text-sm`}>{config.label}</span>
              </div>
            </div>
            <div className="text-right">
              <p className={`${accent.text} opacity-50 text-[9px] tracking-[2px] uppercase mb-0.5`}>N° carte</p>
              <p className={`${accent.text} font-mono text-xs`}>{card.card_number}</p>
            </div>
          </div>

          {/* Puce décorative */}
          <div className="absolute top-1/2 -translate-y-1/2 left-7">
            <div
              className="w-10 h-7 rounded-md opacity-30"
              style={{ background: `linear-gradient(135deg, ${accent.primary}66, ${accent.primary}22)`, border: `1px solid ${accent.primary}44` }}
            />
          </div>

          {/* Nom du membre */}
          <div className="absolute bottom-16 left-7 right-7">
            <p className="text-white text-xl font-light tracking-wide leading-tight">
              {card.prenom.toUpperCase()}
            </p>
            <p className="text-white/40 text-xs mt-0.5">
              {card.profession} · {card.ville}
            </p>
          </div>

          {/* Ligne basse */}
          <div className="absolute bottom-6 left-7 right-7 flex items-end justify-between">
            <div>
              <p className={`${accent.text} opacity-40 text-[8px] tracking-[2px] uppercase mb-0.5`}>Expire le</p>
              <p className="text-white/70 text-[11px]">{expiresFormatted}</p>
            </div>
            {/* QR Code discret */}
            <div className="bg-white rounded-lg p-1.5">
              <QRCodeSVG
                value={carteUrl}
                size={40}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>

          {/* Filigrane établissement */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
            <p
              className="text-white text-[42px] font-serif opacity-[0.04] whitespace-nowrap"
              style={{ transform: 'rotate(-30deg)' }}
            >
              {card.nom_etablissement}
            </p>
          </div>
        </div>

        {/* Infos détaillées */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-6 space-y-3">
          {[
            { label: 'Statut',         value: card.status === 'active' ? '● Carte active' : card.status },
            { label: 'Activée le',     value: activatedFormatted },
            { label: 'Établissement',  value: card.nom_etablissement },
            { label: 'Avantages',      value: config.avantages[0] },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-white/30 text-xs">{row.label}</span>
              <span className={`text-xs font-medium ${row.label === 'Statut' ? 'text-emerald-400' : 'text-white/70'}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* ─── ACTIONS ──────────────────────────────────────── */}
        <div className="space-y-3">

          {/* Télécharger PNG */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
              downloading
                ? 'bg-white/10 text-white/30 cursor-wait'
                : 'bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20'
            }`}
          >
            {downloading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
                Génération...
              </>
            ) : (
              <>📥 Télécharger ma carte</>
            )}
          </button>

          {/* Recevoir par email */}
          {!showEmailForm && !emailSent && (
            <button
              onClick={() => setShowEmailForm(true)}
              className="w-full py-3.5 rounded-xl border border-white/20 text-white/70 text-sm hover:border-white/40 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              📧 Recevoir par email
            </button>
          )}

          {showEmailForm && !emailSent && (
            <form onSubmit={handleSendEmail} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <p className="text-white/50 text-xs">Entrez votre adresse email :</p>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="votre@email.com"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/40 placeholder-white/20"
              />
              {emailError && <p className="text-red-400 text-xs">{emailError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50"
                >
                  {emailLoading ? 'Envoi...' : 'Envoyer'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEmailForm(false); setEmailError('') }}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-white/40 text-sm hover:text-white/60 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          {emailSent && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300 text-sm text-center">
              ✓ Carte envoyée à {emailInput}
            </div>
          )}

          {/* Continuer la candidature */}
          <button
            onClick={() => router.push(`/alliance-privee/candidature?pid=${card.partenaire_id}&card_id=${cardId}`)}
            className="w-full py-3.5 rounded-xl border border-amber-500/20 text-amber-400/80 text-sm hover:border-amber-500/40 hover:text-amber-400 transition-colors flex items-center justify-center gap-2"
          >
            ➡️ Compléter mon portrait de cœur
          </button>
        </div>

        <p className="text-center text-white/20 text-xs mt-8">
          Confidentialité absolue garantie · Alliance Privée L&Lui
        </p>
      </div>
    </div>
  )
}
