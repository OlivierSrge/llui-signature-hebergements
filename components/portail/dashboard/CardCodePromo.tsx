'use client'
// components/portail/dashboard/CardCodePromo.tsx — Card code promo marié + partage viral

import { useState } from 'react'

interface Props {
  code: string
  uid: string
}

const BOUTIQUE_BASE = 'https://l-et-lui-signature.com'

export default function CardCodePromo({ code, uid }: Props) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  if (!code) return null

  const lienPartage = `${BOUTIQUE_BASE}?code=${encodeURIComponent(code)}`

  const messageWA = encodeURIComponent(
    `🎉 Bonjour !\nNous vous invitons à découvrir nos prestations de mariage sur la boutique L&Lui Signature.\nUtilisez notre code privilège *${code}* pour participer à notre cagnotte mariage 💝\n👉 ${lienPartage}\nMerci pour votre soutien !`
  )
  const waUrl = `https://wa.me/?text=${messageWA}`

  function copierCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }).catch(() => {})
  }

  function copierLien() {
    navigator.clipboard.writeText(lienPartage).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className="bg-[#1A1A1A] rounded-2xl p-5 border border-[#C9A84C]/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎁</span>
        <h3 className="text-[#C9A84C] font-bold text-sm">Votre code privilège</h3>
      </div>

      {/* Code + bouton copier le code */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 bg-[#C9A84C]/10 border border-[#C9A84C]/40 rounded-xl px-4 py-3 text-center">
          <span className="text-[#C9A84C] font-bold text-xl tracking-widest">{code}</span>
        </div>
        <button onClick={copierCode}
          className="px-4 py-3 bg-[#C9A84C] text-[#1A1A1A] text-sm font-bold rounded-xl hover:bg-[#B8964A] transition-colors whitespace-nowrap">
          {copiedCode ? '✓ Copié !' : 'Copier'}
        </button>
      </div>

      <p className="text-white/50 text-xs mb-4">
        Partagez ce code avec vos invités pour alimenter votre cagnotte mariage.
        Chaque achat avec ce code vous rapporte des REV.
      </p>

      {/* Boutons de partage */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={copierLien}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-[#F5F0E8]/10 border border-[#F5F0E8]/20 text-[#F5F0E8] text-sm font-semibold rounded-xl hover:bg-[#F5F0E8]/20 transition-colors"
        >
          <span>{copiedLink ? '✅' : '🔗'}</span>
          <span>{copiedLink ? 'Lien copié !' : 'Copier mon lien'}</span>
        </button>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] text-sm font-semibold rounded-xl hover:bg-[#25D366]/30 transition-colors"
        >
          <span>📲</span>
          <span>WhatsApp</span>
        </a>
      </div>

      <a href={lienPartage} target="_blank" rel="noopener noreferrer"
        className="block text-center text-xs text-[#C9A84C] hover:underline">
        Ouvrir la boutique avec mon code →
      </a>
    </div>
  )
}
