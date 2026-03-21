'use client'
// app/portail/configurateur/page.tsx — Boutique catalogue Firestore + panier dynamique

import { useEffect, useState } from 'react'
import { useClientIdentity } from '@/hooks/useClientIdentity'
import { usePanier } from '@/hooks/usePanier'
import type { ArticleCatalogue } from '@/app/api/portail/catalogue/route'

function getUid() {
  if (typeof document === 'undefined') return ''
  return decodeURIComponent(document.cookie.match(/portail_uid=([^;]+)/)?.[1] ?? '')
}
function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

export default function ConfigurateurPage() {
  const [uid] = useState(() => getUid())
  const identity = useClientIdentity()
  const { totaux, ajouterArticle } = usePanier(uid)
  const [catalogue, setCatalogue] = useState<ArticleCatalogue[]>([])
  const [filtre, setFiltre] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [qtes, setQtes] = useState<Record<string, number>>({})
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch('/api/portail/catalogue').then(r => r.json())
      .then(d => { setCatalogue(Array.isArray(d) ? d : (d.articles ?? [])); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const categories = ['ALL', ...Array.from(new Set(catalogue.map(a => a.categorie)))]
  const filtres = filtre === 'ALL' ? catalogue : catalogue.filter(a => a.categorie === filtre)

  const getQte = (id: string) => qtes[id] ?? 1
  const setQte = (id: string, v: number) => setQtes(p => ({ ...p, [id]: Math.max(1, Math.min(99, v)) }))

  const handleAjouter = (article: ArticleCatalogue) => {
    const isPack = article.categorie?.toLowerCase().includes('pack')
    ajouterArticle({
      id: article.id,
      nom: article.nom,
      categorie: article.categorie as 'BOUTIQUE' | 'HEBERGEMENT' | 'DECORATION' | 'PHOTO_VIDEO' | 'TRAITEUR' | 'MUSIQUE' | 'COORDINATION' | 'AUTRE',
      prix_unitaire: article.prix_unitaire,
      quantite: getQte(article.id),
      description: article.description,
    })
    showToast(`✓ ${article.nom} ajouté !`)
  }

  const catLabel = (c: string) => c === 'ALL' ? 'Tout' : c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-sm px-4 py-2 rounded-xl shadow-lg">{toast}</div>}

      <div className="mb-5">
        <a href="/portail" className="text-xs text-[#C9A84C]">← Mon tableau de bord</a>
        {identity.noms_maries && identity.noms_maries !== 'Mon mariage' && (
          <p className="text-sm text-[#888] mt-1">Bonjour {identity.prenom_principal} 👋</p>
        )}
        <h1 className="font-serif italic text-2xl text-[#1A1A1A] mt-0.5">Boutique L&amp;Lui Signature</h1>
      </div>

      {/* Filtres catégories */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {categories.map(c => (
          <button key={c} onClick={() => setFiltre(c)} className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{ background: filtre === c ? '#C9A84C' : '#F5F0E8', color: filtre === c ? 'white' : '#888' }}>
            {catLabel(c)}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-[#888] text-sm">Chargement…</div> : (
        <div className="space-y-3">
          {filtres.map(article => {
            const isPack = article.categorie?.toLowerCase().includes('pack')
            return (
              <div key={article.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#F5F0E8]">
                {article.image_url ? (
                  <img src={article.image_url} alt={article.nom} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-16 flex items-center justify-center text-xl font-bold text-[#C9A84C]" style={{ background: '#F5F0E8' }}>
                    {article.nom.split(' ').map((w: string) => w[0]).join('').slice(0, 3).toUpperCase()}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="font-semibold text-[#1A1A1A] text-sm">{article.nom}</p>
                        {isPack && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: '#C9A84C' }}>Pack complet</span>}
                      </div>
                      {isPack && <p className="text-[10px] text-[#888]">+10% honoraires</p>}
                      <p className="text-[11px] text-[#888] leading-relaxed">{article.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {article.prix_unitaire > 0 && <p className="font-bold text-[#C9A84C] text-sm">{formatFCFA(article.prix_unitaire)}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 border border-[#E8E0D0] rounded-xl px-2 py-1">
                      <button onClick={() => setQte(article.id, getQte(article.id) - 1)} className="w-6 h-6 flex items-center justify-center text-[#888] font-bold">−</button>
                      <span className="text-sm font-semibold w-5 text-center">{getQte(article.id)}</span>
                      <button onClick={() => setQte(article.id, getQte(article.id) + 1)} className="w-6 h-6 flex items-center justify-center text-[#888] font-bold">+</button>
                    </div>
                    <button onClick={() => handleAjouter(article)} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#1A1A1A' }}>
                      Ajouter au panier
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtres.length === 0 && <p className="text-center py-10 text-[#888] text-sm">Aucun article dans cette catégorie</p>}
        </div>
      )}

      {/* Bouton sticky */}
      {totaux.nb_articles > 0 && (
        <a href="/portail/panier" className="fixed bottom-20 md:bottom-6 right-4 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold" style={{ background: '#1A1A1A', color: '#C9A84C' }}>
          🛒 Mon panier ({totaux.nb_articles}) — Voir →
        </a>
      )}
    </div>
  )
}
