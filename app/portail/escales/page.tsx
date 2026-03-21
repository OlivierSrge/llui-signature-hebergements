'use client'
// app/portail/escales/page.tsx — Mes Escales : liens directs + aperçu 3 hébergements

import { useEffect, useState } from 'react'
import type { Hebergement } from '@/app/api/portail/hebergements/route'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n)) + ' FCFA'
}

export default function EscalesPage() {
  const [apercu, setApercu] = useState<Hebergement[]>([])

  useEffect(() => {
    fetch('/api/portail/hebergements')
      .then(r => r.json())
      .then((data: { hebergements: Hebergement[] }) => {
        const actifs = (data.hebergements ?? []).filter(h => h.disponible)
        setApercu(actifs.slice(0, 3))
      })
      .catch(() => {})
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* HERO */}
      <div className="mb-6">
        <h1 className="font-serif italic text-2xl text-[#1A1A1A]">Mes Escales</h1>
        <p className="text-sm text-[#888] mt-1">Hébergements partenaires L&amp;Lui à Kribi</p>
      </div>

      {/* CARD PRINCIPALE */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: '#1A1A1A' }}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🏨</span>
          <div>
            <h2 className="font-bold text-white text-base">Découvrez nos hébergements premium</h2>
            <p className="text-xs text-white/50">Villas · Lodges · Suites · Packs groupés</p>
          </div>
        </div>
        <p className="text-sm text-white/70 mb-4">
          Sélection exclusive d&apos;hébergements de prestige à Kribi pour votre mariage et vos invités.
        </p>
        <a
          href="https://llui-signature-hebergements.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 rounded-xl text-sm font-semibold text-center text-white transition-opacity hover:opacity-90"
          style={{ background: '#C9A84C' }}
        >
          Voir tous les hébergements →
        </a>
      </div>

      {/* APERÇU 3 HÉBERGEMENTS */}
      {apercu.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">Sélection du moment</p>
          {apercu.map(h => (
            <div key={h.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#F5F0E8]">
              {h.image_url ? (
                <img src={h.image_url} alt={h.nom} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-24 flex items-center justify-center text-2xl bg-[#F5F0E8]">🏠</div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="font-semibold text-[#1A1A1A] text-sm">{h.nom}</p>
                    <p className="text-[11px] text-[#888] mt-0.5">{h.lieu || h.localisation} · {h.capacite} pers.</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-[#C9A84C] text-sm">{formatFCFA(h.prix_nuit || h.prix_nuit_base)}</p>
                    <p className="text-[10px] text-[#AAA]">/nuit</p>
                  </div>
                </div>
                {h.url_reservation ? (
                  <a
                    href={h.url_reservation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block w-full py-2 rounded-xl text-xs font-semibold text-center text-white"
                    style={{ background: '#C9A84C' }}
                  >
                    Réserver
                  </a>
                ) : (
                  <a
                    href="https://llui-signature-hebergements.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block w-full py-2 rounded-xl text-xs font-semibold text-center text-white"
                    style={{ background: '#C9A84C' }}
                  >
                    Voir les détails →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
