'use client'
// app/portail/configurateur/page.tsx
// Configurateur de prestations mariage — catalogue + panier

import { useEffect, useState } from 'react'
import { usePanier } from '@/hooks/usePanier'
import BoutonAjouterPanier from '@/components/panier/BoutonAjouterPanier'
import type { ArticleCatalogue } from '@/app/api/portail/catalogue/route'
import type { CategorieArticle } from '@/lib/panierTypes'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n)) + ' FCFA'
}

const CATEGORIES: { key: CategorieArticle | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tout' },
  { key: 'PHOTO_VIDEO', label: 'Photo / Vidéo' },
  { key: 'DECORATION', label: 'Décoration' },
  { key: 'TRAITEUR', label: 'Traiteur' },
  { key: 'MUSIQUE', label: 'Musique' },
  { key: 'COORDINATION', label: 'Coordination' },
]

const UNITE_LABELS: Record<string, string> = {
  'personne': '/ pers.',
  'forfait': 'forfait',
  'heure': '/ h',
}

function getUidFromCookie(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/portail_uid=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export default function ConfigurateurPage() {
  const [uid] = useState(() => getUidFromCookie())
  const [catalogue, setCatalogue] = useState<ArticleCatalogue[]>([])
  const [filtre, setFiltre] = useState<CategorieArticle | 'ALL'>('ALL')
  const [loading, setLoading] = useState(true)
  const { totaux } = usePanier(uid)

  useEffect(() => {
    fetch('/api/portail/catalogue')
      .then(r => r.json())
      .then((data: { articles: ArticleCatalogue[]; synced_at: string | null } | ArticleCatalogue[]) => {
        const articles = Array.isArray(data) ? data : (data.articles ?? [])
        setCatalogue(articles)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtres = filtre === 'ALL' ? catalogue : catalogue.filter(a => a.categorie === filtre)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="font-serif italic text-2xl text-[#1A1A1A]">Ma Vision</h1>
        <p className="text-sm text-[#888] mt-1">
          {totaux.nb_articles > 0
            ? `${totaux.nb_articles} article(s) — ${formatFCFA(totaux.total_ht)}`
            : 'Configurez vos prestations mariage'}
        </p>
      </div>

      {/* Filtres catégories */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {CATEGORIES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltre(key)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: filtre === key ? '#C9A84C' : '#F5F0E8',
              color: filtre === key ? 'white' : '#888',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Catalogue */}
      {loading ? (
        <div className="text-center py-12 text-[#888] text-sm">Chargement…</div>
      ) : (
        <div className="space-y-3">
          {filtres.map(article => (
            <div key={article.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#F5F0E8]">
              {/* Image ou placeholder */}
              {article.image_url ? (
                <img src={article.image_url} alt={article.nom} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-20 flex items-center justify-center text-xl font-bold text-[#C9A84C]" style={{ background: '#F5F0E8' }}>
                  {article.nom.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()}
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="font-semibold text-[#1A1A1A] text-sm">{article.nom}</p>
                      {article.source === 'BOUTIQUE' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: '#C9A84C' }}>BOUTIQUE</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#888] leading-relaxed">{article.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {article.prix_unitaire > 0 && (
                      <>
                        <p className="font-bold text-[#C9A84C] text-sm">{formatFCFA(article.prix_unitaire)}</p>
                        <p className="text-[10px] text-[#888]">{UNITE_LABELS[article.unite ?? ''] ?? article.unite}</p>
                      </>
                    )}
                  </div>
                </div>
                <BoutonAjouterPanier uid={uid} article={article} />
                {article.url_fiche && (
                  <a
                    href={article.url_fiche}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-2 text-center text-xs text-[#C9A84C] hover:underline"
                  >
                    En savoir plus →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totaux.nb_articles > 0 && (
        <a
          href="/portail/panier"
          className="fixed bottom-6 right-6 px-5 py-3 rounded-2xl text-sm font-semibold text-white shadow-lg"
          style={{ background: '#C9A84C' }}
        >
          Voir panier ({totaux.nb_articles})
        </a>
      )}
    </div>
  )
}
