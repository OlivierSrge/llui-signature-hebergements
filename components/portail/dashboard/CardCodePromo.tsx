'use client'
// components/portail/dashboard/CardCodePromo.tsx — Card code promo marié

import { useState } from 'react'

interface Props {
  code: string
  uid: string
}

export default function CardCodePromo({ code, uid }: Props) {
  const [copied, setCopied] = useState(false)

  if (!code) return null

  function copier() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  const boutiqueUrl = `https://letlui-signature.netlify.app?code=${encodeURIComponent(code)}&ref=${encodeURIComponent(uid)}`

  return (
    <div className="bg-[#1A1A1A] rounded-2xl p-5 border border-[#C9A84C]/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎁</span>
        <h3 className="text-[#C9A84C] font-bold text-sm">Votre code privilège</h3>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 bg-[#C9A84C]/10 border border-[#C9A84C]/40 rounded-xl px-4 py-3 text-center">
          <span className="text-[#C9A84C] font-bold text-xl tracking-widest">{code}</span>
        </div>
        <button onClick={copier}
          className="px-4 py-3 bg-[#C9A84C] text-[#1A1A1A] text-sm font-bold rounded-xl hover:bg-[#B8964A] transition-colors whitespace-nowrap">
          {copied ? '✓ Copié !' : 'Copier'}
        </button>
      </div>
      <p className="text-white/50 text-xs mb-3">
        Partagez ce code avec vos invités pour alimenter votre cagnotte mariage.
        Chaque achat avec ce code vous rapporte des REV.
      </p>
      <a href={boutiqueUrl} target="_blank" rel="noopener noreferrer"
        className="block text-center text-xs text-[#C9A84C] hover:underline">
        Ouvrir la boutique avec mon code →
      </a>
    </div>
  )
}
