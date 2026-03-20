'use client'
// app/portail/escales/page.tsx
// Hébergements partenaires L&Lui Signature

import { useEffect, useState } from 'react'
import BoutonAjouterPanier from '@/components/panier/BoutonAjouterPanier'
import type { Hebergement, Pack } from '@/app/api/portail/hebergements/route'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n)) + ' FCFA'
}

function getUidFromCookie(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/portail_uid=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

const TYPE_COLORS: Record<string, string> = {
  VILLA: '#C9A84C',
  HOTEL: '#0F52BA',
  LODGE: '#7C9A7E',
  APPARTEMENT: '#888888',
}

export default function EscalesPage() {
  const [uid] = useState(() => getUidFromCookie())
  const [hebergements, setHebergements] = useState<Hebergement[]>([])
  const [packs, setPacks] = useState<Pack[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState<string>('ALL')

  useEffect(() => {
    fetch('/api/portail/hebergements')
      .then(r => r.json())
      .then((data: { hebergements: Hebergement[]; packs: Pack[] }) => {
        setHebergements(data.hebergements ?? [])
        setPacks(data.packs ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const showPacks = filtre === 'PACKS'
  const types = ['ALL', 'VILLA', 'HOTEL', 'LODGE', 'APPARTEMENT', 'PACKS']
  const liste = showPacks ? [] : filtre === 'ALL' ? hebergements : hebergements.filter(h => h.type === filtre)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="font-serif italic text-2xl text-[#1A1A1A]">Mes Escales</h1>
        <p className="text-sm text-[#888] mt-1">Hébergements partenaires avec réduction fidélité</p>
      </div>

      {/* Filtres types */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFiltre(t)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: filtre === t ? '#C9A84C' : '#F5F0E8',
              color: filtre === t ? 'white' : '#888',
            }}
          >
            {t === 'ALL' ? 'Tous' : t === 'PACKS' ? '🏨 Packs' : t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#888] text-sm">Chargement…</div>
      ) : showPacks ? (
        <div className="space-y-3">
          {packs.length === 0 && (
            <div className="text-center py-10 text-[#888] text-sm">Aucun pack disponible actuellement.</div>
          )}
          {packs.map(p => {
            const PACK_COLORS: Record<string, string> = { F3: '#7C9A7E', VIP: '#C9A84C', SIGNATURE: '#0F52BA' }
            const color = PACK_COLORS[p.sous_type] ?? '#888'
            return (
              <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0 pr-3">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: color + '22', color }}>
                      PACK {p.sous_type}
                    </span>
                    <p className="font-semibold text-[#1A1A1A] text-sm mt-1">{p.nom}</p>
                    <p className="text-[11px] text-[#888] mt-0.5 leading-relaxed">{p.description}</p>
                    {p.inclus.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {p.inclus.slice(0, 3).map((item, i) => (
                          <p key={i} className="text-[10px] text-[#888]">• {item}</p>
                        ))}
                        {p.inclus.length > 3 && <p className="text-[10px] text-[#C9A84C]">+{p.inclus.length - 3} logements…</p>}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-[#C9A84C] text-sm">{formatFCFA(p.prix)}</p>
                    {p.capacite > 0 && <p className="text-[10px] text-[#888]">{p.capacite} pers.</p>}
                  </div>
                </div>
                <BoutonAjouterPanier uid={uid} article={{ id: p.id, nom: p.nom, categorie: 'HEBERGEMENT', prix_unitaire: p.prix, description: p.description }} label="Ajouter ce pack" />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {liste.map(h => {
            const prixReduit = Math.round(h.prix_nuit * (1 - h.reduction_fidelite / 100))
            return (
              <div
                key={h.id}
                className={`bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] ${!h.disponible ? 'opacity-60' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: TYPE_COLORS[h.type] + '22', color: TYPE_COLORS[h.type] }}
                      >
                        {h.type}
                      </span>
                      {!h.disponible && (
                        <span className="text-[10px] text-[#888] bg-[#F5F0E8] px-2 py-0.5 rounded-full">
                          Indisponible
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-[#1A1A1A] text-sm">{h.nom}</p>
                    <p className="text-[11px] text-[#888]">{h.lieu} — {h.capacite} pers. max</p>
                    <p className="text-[11px] text-[#888] mt-1 leading-relaxed">{h.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {h.tags.map(tag => (
                        <span key={tag} className="text-[10px] bg-[#F5F0E8] text-[#888] px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-[#C9A84C] text-sm">{formatFCFA(prixReduit)}</p>
                    <p className="text-[10px] line-through text-[#AAA]">{formatFCFA(h.prix_nuit)}</p>
                    <p className="text-[10px] text-[#7C9A7E] font-semibold">-{h.reduction_fidelite}% portail</p>
                  </div>
                </div>
                {h.disponible && (
                  <BoutonAjouterPanier
                    uid={uid}
                    article={{
                      id: h.id,
                      nom: h.nom,
                      categorie: 'HEBERGEMENT',
                      prix_unitaire: prixReduit,
                      description: h.description,
                    }}
                    label="Réserver"
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

