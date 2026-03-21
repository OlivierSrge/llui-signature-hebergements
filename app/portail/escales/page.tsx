'use client'
// app/portail/escales/page.tsx — Hébergements Firestore + panier dynamique

import { useEffect, useState } from 'react'
import { useClientIdentity } from '@/hooks/useClientIdentity'
import { usePanier } from '@/hooks/usePanier'
import type { Hebergement } from '@/app/api/portail/hebergements/route'

function getUid() {
  if (typeof document === 'undefined') return ''
  return decodeURIComponent(document.cookie.match(/portail_uid=([^;]+)/)?.[1] ?? '')
}
function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

export default function EscalesPage() {
  const [uid] = useState(() => getUid())
  const identity = useClientIdentity()
  const { totaux, ajouterArticle } = usePanier(uid)
  const [hebergements, setHebergements] = useState<Hebergement[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('ALL')
  const [nuits, setNuits] = useState<Record<string, number>>({})
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch('/api/portail/hebergements').then(r => r.json())
      .then((d: { hebergements: Hebergement[] }) => { setHebergements(d.hebergements ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const types = ['ALL', ...Array.from(new Set(hebergements.map(h => h.type))).filter(Boolean)]
  const liste = filtre === 'ALL' ? hebergements : hebergements.filter(h => h.type === filtre)

  const getNuits = (id: string) => nuits[id] ?? 1
  const setN = (id: string, v: number) => setNuits(p => ({ ...p, [id]: Math.max(1, Math.min(30, v)) }))

  const handleAjouter = (h: Hebergement) => {
    const n = getNuits(h.id)
    const prix = h.prix_nuit || h.prix_nuit_base
    ajouterArticle({
      id: h.id,
      nom: `${h.nom} (${n} nuit${n > 1 ? 's' : ''})`,
      categorie: 'HEBERGEMENT',
      prix_unitaire: prix,
      quantite: n,
      description: h.description,
    })
    showToast(`✓ ${h.nom} ajouté (${n} nuit${n > 1 ? 's' : ''}) !`)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-sm px-4 py-2 rounded-xl shadow-lg">{toast}</div>}

      <div className="mb-5">
        <a href="/portail" className="text-xs text-[#C9A84C]">← Mon tableau de bord</a>
        {identity.prenom_principal && <p className="text-sm text-[#888] mt-1">Bonjour {identity.prenom_principal} 👋</p>}
        <h1 className="font-serif italic text-2xl text-[#1A1A1A] mt-0.5">Sélection Hébergements</h1>
        <p className="text-sm text-[#888]">Kribi &amp; environs · Villas, suites, lodges</p>
      </div>

      {/* Filtres types */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {types.map(t => (
          <button key={t} onClick={() => setFiltre(t)} className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{ background: filtre === t ? '#C9A84C' : '#F5F0E8', color: filtre === t ? 'white' : '#888' }}>
            {t === 'ALL' ? 'Tous' : t}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-[#888] text-sm">Chargement…</div> : (
        <div className="space-y-3">
          {liste.map(h => {
            const prix = h.prix_nuit || h.prix_nuit_base
            const n = getNuits(h.id)
            return (
              <div key={h.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-[#F5F0E8] ${!h.disponible ? 'opacity-60' : ''}`}>
                {h.image_url ? (
                  <img src={h.image_url} alt={h.nom} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-20 flex items-center justify-center text-2xl bg-[#F5F0E8]">🏠</div>
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="font-semibold text-[#1A1A1A] text-sm">{h.nom}</p>
                      <p className="text-[11px] text-[#888]">{h.lieu || h.localisation} · {h.type} · {h.capacite} pers.</p>
                      <p className="text-[11px] text-[#888] mt-1 leading-relaxed line-clamp-2">{h.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-[#C9A84C] text-sm">{formatFCFA(prix)}</p>
                      <p className="text-[10px] text-[#AAA]">/nuit</p>
                    </div>
                  </div>
                  {h.disponible && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 border border-[#E8E0D0] rounded-xl px-2 py-1">
                        <button onClick={() => setN(h.id, n - 1)} className="w-6 h-6 flex items-center justify-center text-[#888] font-bold">−</button>
                        <span className="text-sm font-semibold w-6 text-center">{n}</span>
                        <button onClick={() => setN(h.id, n + 1)} className="w-6 h-6 flex items-center justify-center text-[#888] font-bold">+</button>
                        <span className="text-[10px] text-[#AAA] pl-1">nuit{n > 1 ? 's' : ''}</span>
                      </div>
                      <button onClick={() => handleAjouter(h)} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#C9A84C' }}>
                        Ajouter · {formatFCFA(prix * n)}
                      </button>
                    </div>
                  )}
                  {!h.disponible && <p className="text-center text-xs text-[#AAA] py-2">Indisponible actuellement</p>}
                </div>
              </div>
            )
          })}
          {liste.length === 0 && <p className="text-center py-10 text-[#888] text-sm">Aucun hébergement disponible</p>}
        </div>
      )}

      {totaux.nb_articles > 0 && (
        <a href="/portail/panier" className="fixed bottom-20 md:bottom-6 right-4 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold" style={{ background: '#1A1A1A', color: '#C9A84C' }}>
          🛒 Mon panier ({totaux.nb_articles}) — Voir →
        </a>
      )}
    </div>
  )
}
