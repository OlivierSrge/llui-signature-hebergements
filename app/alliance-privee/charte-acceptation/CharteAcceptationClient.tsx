'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const POINTS_CLES = [
  {
    article: '1',
    titre: 'SINCÉRITÉ',
    texte: 'Profil authentique obligatoire. Faux profil confirmé = bannissement immédiat sans remboursement.',
  },
  {
    article: '2',
    titre: 'DISCRÉTION',
    texte: 'Aucune capture d\'écran, partage ou divulgation à des tiers. Confidentialité absolue des profils.',
  },
  {
    article: '3',
    titre: 'MÉDIATION',
    texte: 'Aucun échange de numéros, emails ou réseaux sociaux dans le chat. Les coordonnées sont transmises uniquement après organisation d\'un rendez-vous officiel.',
  },
  {
    article: '4',
    titre: 'RESPECT',
    texte: 'Communication courtoise obligatoire. Harcèlement avéré = bannissement immédiat.',
  },
  {
    article: '5',
    titre: 'ENGAGEMENT FINANCIER',
    texte: 'Paiement unique couvrant toute la durée du tier. Non remboursable après 30 jours d\'utilisation.',
  },
]

export default function CharteAcceptationClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)

  const pid = searchParams.get('pid') ?? ''
  const tier = searchParams.get('tier') ?? ''
  const gender = searchParams.get('gender') ?? ''
  const location = searchParams.get('location') ?? ''

  // Validation des params — si manquants, retour à l'accueil
  if (!pid || !tier || !gender || !location) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-white/30 text-4xl mb-4">✦</p>
          <p className="text-white/50 text-sm mb-6">Lien invalide — paramètres manquants.</p>
          <Link href="/" className="text-[#C9A84C]/70 text-sm hover:text-[#C9A84C]">Retour à l&apos;accueil</Link>
        </div>
      </div>
    )
  }

  function handleContinue() {
    if (!accepted) return
    setLoading(true)
    // Enregistrer timestamp d'acceptation (côté client, pour audit UX)
    try {
      localStorage.setItem('alliance_charte_accepted_at', new Date().toISOString())
      localStorage.setItem('alliance_charte_accepted_tier', tier)
    } catch {
      // localStorage indisponible (mode privé) — pas bloquant
    }
    router.push(
      `/alliance-privee/paiement?pid=${pid}&tier=${tier}&gender=${gender}&location=${location}`
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* ── Progress bar ──────────────────────────────────────────── */}
      <div className="h-0.5 bg-white/5">
        <div className="h-full bg-[#C9A84C]/60 w-1/3" />
      </div>

      <div className="max-w-2xl mx-auto px-5 py-10">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">✦ Alliance Privée</p>
          <h1
            className="text-2xl font-light text-white mb-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Avant de poursuivre votre inscription
          </h1>
          <p className="text-white/40 text-sm">
            Lisez et acceptez la Charte avant d&apos;accéder au paiement
          </p>
          {/* Étapes */}
          <div className="flex items-center justify-center gap-2 mt-5 text-xs">
            <span className="text-white/20">Tier</span>
            <span className="text-white/20">›</span>
            <span className="text-[#C9A84C] font-semibold">Charte</span>
            <span className="text-white/20">›</span>
            <span className="text-white/20">Paiement</span>
            <span className="text-white/20">›</span>
            <span className="text-white/20">Candidature</span>
          </div>
        </div>

        {/* ── Introduction ────────────────────────────────────────── */}
        <div className="mb-6 p-5 rounded-2xl border border-[#C9A84C]/10 bg-[#C9A84C]/3">
          <p className="text-white/60 text-sm leading-relaxed">
            Alliance Privée est un club de rencontre sélectif fondé sur trois principes fondateurs :
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              { icon: '🔐', label: 'Exclusivité', desc: 'Admission sur candidature' },
              { icon: '🤫', label: 'Discrétion', desc: 'Confidentialité absolue' },
              { icon: '🤝', label: 'Intermédiation', desc: 'Rencontres orchestrées' },
            ].map((p) => (
              <div key={p.label} className="text-center">
                <p className="text-xl mb-1">{p.icon}</p>
                <p className="text-[#C9A84C] text-xs font-semibold">{p.label}</p>
                <p className="text-white/30 text-[10px] leading-tight mt-0.5">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Points clés ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#C9A84C]/15 bg-[#111111] p-5 mb-6">
          <h2 className="text-[#C9A84C] text-xs font-semibold uppercase tracking-widest mb-5">
            Résumé des points clés — 5 articles essentiels
          </h2>
          <div className="space-y-4">
            {POINTS_CLES.map((p) => (
              <div key={p.article} className="flex gap-4">
                <div className="shrink-0 w-6 h-6 rounded-full bg-[#C9A84C]/15 text-[#C9A84C] text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {p.article}
                </div>
                <div>
                  <p className="text-[#C9A84C] text-xs font-semibold tracking-wide">{p.titre}</p>
                  <p className="text-white/50 text-xs leading-relaxed mt-0.5">{p.texte}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Lien charte complète */}
          <div className="mt-6 pt-4 border-t border-white/5">
            <a
              href="/alliance-privee/charte"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-[#C9A84C]/70 hover:text-[#C9A84C] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Lire la Charte complète (10 articles) — s&apos;ouvre dans un nouvel onglet
            </a>
          </div>
        </div>

        {/* ── Checkbox acceptation ─────────────────────────────────── */}
        <label
          className={`flex items-start gap-3 cursor-pointer p-4 rounded-2xl border transition-all mb-6 ${
            accepted
              ? 'border-[#C9A84C]/40 bg-[#C9A84C]/5'
              : 'border-white/10 bg-white/[0.02] hover:border-white/20'
          }`}
        >
          {/* Custom checkbox */}
          <div
            className={`mt-0.5 w-5 h-5 rounded shrink-0 border-2 flex items-center justify-center transition-all ${
              accepted
                ? 'bg-[#C9A84C] border-[#C9A84C]'
                : 'border-[#C9A84C]/30 bg-transparent'
            }`}
            onClick={() => setAccepted(!accepted)}
          >
            {accepted && (
              <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span className="text-white/70 text-sm leading-relaxed select-none">
            J&apos;ai lu et j&apos;accepte la{' '}
            <a
              href="/alliance-privee/charte"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C9A84C] underline underline-offset-2 hover:text-[#C9A84C]/80"
              onClick={(e) => e.stopPropagation()}
            >
              Charte de l&apos;Alliance Privée
            </a>{' '}
            en son intégralité, incluant les 10 articles relatifs à la sincérité, la discrétion, la médiation, le respect, les engagements financiers et les sanctions applicables.
          </span>
        </label>

        {/* ── Actions ─────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 py-4 rounded-2xl border border-white/10 text-white/40 text-sm hover:border-white/20 hover:text-white/60 transition-all"
          >
            ← Retour
          </button>
          <button
            onClick={handleContinue}
            disabled={!accepted || loading}
            className={`flex-2 basis-2/3 py-4 rounded-2xl text-sm font-semibold transition-all ${
              accepted && !loading
                ? 'bg-[#C9A84C] text-black hover:bg-[#B8963C]'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Redirection…
              </span>
            ) : (
              'Continuer vers le paiement →'
            )}
          </button>
        </div>

        {/* Note légale */}
        <p className="text-center text-white/15 text-[10px] mt-5 leading-relaxed">
          En acceptant, vous confirmez avoir lu et compris l&apos;intégralité de la Charte Alliance Privée.<br />
          Cette acceptation a valeur contractuelle et est enregistrée avec horodatage.
        </p>
      </div>
    </div>
  )
}
