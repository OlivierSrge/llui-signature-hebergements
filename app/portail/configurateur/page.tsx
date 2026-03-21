'use client'
// app/portail/configurateur/page.tsx — Ma Vision : liens directs boutique + hébergements

import { useState } from 'react'

function getUidFromCookie(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/portail_uid=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

const PILLS_BOUTIQUE = ['Packs Mariage', 'Décoration', 'Photo & Vidéo', 'Soins de Beauté', 'Son & Lumière', 'Traiteur', 'Location', 'Club Privé']
const PILLS_HEBERGEMENTS = ["Villa d'Exception", 'Suite Privée', 'Lodge', 'Cottage', 'Penthouse', 'Pack F3', 'Pack VIP']

export default function ConfigurateurPage() {
  const [uid] = useState(() => getUidFromCookie())

  const boutiqueUrl = `https://letlui-signature.netlify.app${uid ? `?ref=${uid}` : ''}`

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-serif italic text-2xl text-[#1A1A1A]">Ma Vision</h1>
        <p className="text-sm text-[#888] mt-1">Explorez nos plateformes pour composer votre mariage</p>
      </div>

      <div className="space-y-4">
        {/* BOUTIQUE */}
        <div className="rounded-2xl p-5 border-2" style={{ background: '#1A1A1A', borderColor: '#C9A84C' }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🛍️</span>
            <div>
              <h2 className="font-bold text-white text-base">Services & Prestations</h2>
              <p className="text-xs text-white/50">Boutique Signature</p>
            </div>
          </div>
          <p className="text-sm text-white/70 mb-4">
            Packs mariage, décoration, photo, traiteur, soins beauté et plus encore.
          </p>
          <div className="flex flex-wrap gap-2 mb-5">
            {PILLS_BOUTIQUE.map(p => (
              <span key={p} className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: '#C9A84C22', color: '#C9A84C', border: '1px solid #C9A84C44' }}>
                {p}
              </span>
            ))}
          </div>
          <a
            href={boutiqueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl text-sm font-semibold text-center text-white transition-opacity hover:opacity-90"
            style={{ background: '#C9A84C' }}
          >
            Explorer la boutique →
          </a>
        </div>

        {/* HÉBERGEMENTS */}
        <div className="rounded-2xl p-5 border-2 bg-[#FAF7F2]" style={{ borderColor: '#C9A84C' }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🏠</span>
            <div>
              <h2 className="font-bold text-[#1A1A1A] text-base">Hébergements & Packs</h2>
              <p className="text-xs text-[#888]">L&amp;Lui Signature · Kribi</p>
            </div>
          </div>
          <p className="text-sm text-[#555] mb-4">
            Villas, lodges, suites et packs groupés pour vos invités à Kribi.
          </p>
          <div className="flex flex-wrap gap-2 mb-5">
            {PILLS_HEBERGEMENTS.map(p => (
              <span key={p} className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: '#C9A84C15', color: '#C9A84C', border: '1px solid #C9A84C33' }}>
                {p}
              </span>
            ))}
          </div>
          <a
            href="https://llui-signature-hebergements.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl text-sm font-semibold text-center text-white transition-opacity hover:opacity-90"
            style={{ background: '#C9A84C' }}
          >
            Choisir un hébergement →
          </a>
        </div>
      </div>

      {/* BANDEAU INFO */}
      <div className="mt-5 rounded-2xl p-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
        <p className="text-sm text-[#92400E]">
          💡 Après avoir choisi vos services, revenez ici pour composer votre devis et suivre votre commande.
        </p>
      </div>
    </div>
  )
}
