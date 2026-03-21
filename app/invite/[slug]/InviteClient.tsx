'use client'
// app/invite/[slug]/InviteClient.tsx — Fiche invité publique avec code promo

import { useEffect, useState } from 'react'
import { getCodePromoUrl } from '@/lib/generatePromoCode'

interface Props {
  guestId: string; mariageUid: string; guestNom: string; slug: string
  nomsMaries: string; dateEvenement: string | null; lieu: string | null
  codePromo: string
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function InviteClient({ guestId, mariageUid, guestNom, slug, nomsMaries, dateEvenement, lieu, codePromo }: Props) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('llui_ref', JSON.stringify({ guest_id: guestId, mariage_uid: mariageUid, slug, code: codePromo }))
    } catch {}
  }, [guestId, mariageUid, slug, codePromo])

  const dateStr = formatDate(dateEvenement)
  const dateExpiry = formatDate(dateEvenement)

  function trackAndOpen(platform: 'boutique' | 'hebergement') {
    fetch('/api/portail/track-invite-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guest_id: guestId, mariage_uid: mariageUid, platform, code_promo: codePromo }),
    }).catch(() => {})
    window.open(getCodePromoUrl(codePromo, mariageUid, platform), '_blank', 'noopener,noreferrer')
  }

  function copyCode() {
    navigator.clipboard.writeText(codePromo).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className="min-h-screen pb-12" style={{ background: '#1A1A1A', color: 'white' }}>

      {/* EN-TÊTE */}
      <div className="text-center pt-8 pb-4 px-6">
        <p className="font-serif italic text-2xl mb-2" style={{ color: '#C9A84C' }}>L&Lui Signature</p>
        <div className="h-px w-24 mx-auto" style={{ background: 'linear-gradient(90deg,transparent,#C9A84C,transparent)' }} />
      </div>

      {/* INVITATION PERSONNALISÉE */}
      <div className="text-center px-6 pb-6">
        <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Invitation personnalisée pour</p>
        <p className="text-xl font-semibold" style={{ color: 'white' }}>{guestNom}</p>
      </div>

      {/* HERO MARIAGE */}
      <div className="mx-4 rounded-2xl p-6 text-center mb-6" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)' }}>
        <p className="text-xs text-white/40 mb-2">Vous êtes invité(e) au mariage de</p>
        <p className="font-serif italic text-2xl font-bold mb-3" style={{ color: '#C9A84C' }}>{nomsMaries}</p>
        {dateStr && <p className="text-xs text-white/50 mb-1">{dateStr}</p>}
        {lieu && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{lieu}</p>}
      </div>

      {/* MESSAGE */}
      <div className="px-8 mb-6 text-center">
        <p className="text-sm italic text-white/50 leading-relaxed">
          Nous avons préparé pour vous des offres exclusives.<br />
          Profitez de notre code privilège.
        </p>
      </div>

      {/* CODE PROMO */}
      {codePromo && (
        <div className="mx-4 rounded-2xl p-5 mb-6 text-center" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.27)' }}>
          <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Votre code privilège</p>
          <p className="text-2xl font-bold tracking-widest mb-2" style={{ color: '#C9A84C', letterSpacing: '0.12em' }}>{codePromo}</p>
          <p className="text-xs text-white/40 mb-3">
            Remise exclusive{dateExpiry ? ` · Valable jusqu&apos;au ${dateExpiry}` : ''}
          </p>
          <button onClick={copyCode}
            className="px-4 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{ background: copied ? '#C9A84C' : 'transparent', color: copied ? '#1A1A1A' : '#C9A84C', border: '1px solid #C9A84C' }}>
            {copied ? '✓ Copié !' : 'Copier le code'}
          </button>
        </div>
      )}

      {/* BOUTONS D'ACTION */}
      <div className="px-4 space-y-3 mb-6">
        <button onClick={() => trackAndOpen('boutique')} className="w-full rounded-2xl p-4 text-left flex items-center gap-3"
          style={{ background: '#C9A84C' }}>
          <span className="text-2xl">🛍️</span>
          <div>
            <p className="font-semibold text-sm text-[#1A1A1A]">Boutique L&Lui Signature</p>
            <p className="text-xs text-[#1A1A1A]/70">Prestations mariage · Cadeaux · Beauté</p>
          </div>
        </button>

        <button onClick={() => trackAndOpen('hebergement')} className="w-full rounded-2xl p-4 text-left flex items-center gap-3"
          style={{ background: 'transparent', border: '1px solid #C9A84C' }}>
          <span className="text-2xl">🏡</span>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#C9A84C' }}>Sélection Hébergements</p>
            <p className="text-xs text-white/50">Villas & lodges à Kribi · Réservez vos dates</p>
          </div>
        </button>
      </div>

      {/* PARRAINAGE */}
      <div className="mx-4 rounded-2xl p-5 mb-6" style={{ background: '#222' }}>
        <p className="font-semibold text-sm mb-1">Rejoindre L&Lui Signature gratuitement</p>
        <p className="text-xs text-white/50 mb-4">
          Transformez votre présence à ce mariage en opportunité. Gagnez des commissions.
        </p>
        <a href={`/inscription?ref=${mariageUid}`}
          className="inline-block px-5 py-2 rounded-xl text-sm font-semibold"
          style={{ background: '#C9A84C', color: '#1A1A1A' }}>
          S&apos;inscrire gratuitement →
        </a>
      </div>

      {/* FOOTER */}
      <footer className="px-4 text-center border-t border-white/10 pt-6">
        <p className="text-xs text-white/40 mb-3 leading-relaxed">
          Chaque achat via ce lien participe<br />à la cagnotte mariage de{' '}
          <span style={{ color: '#C9A84C' }}>{nomsMaries}</span>
        </p>
        <p className="text-xs text-white/30 mb-2">L&Lui Signature · +237 693 407 964</p>
        <a href="https://wa.me/237693407964" target="_blank" rel="noopener noreferrer"
          className="text-xs text-white/40 hover:text-white/70">💬 WhatsApp</a>
      </footer>
    </div>
  )
}
