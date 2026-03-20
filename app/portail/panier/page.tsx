'use client'
// app/portail/panier/page.tsx
// Panier unifié — récap + action WhatsApp + sauvegarde Firestore

import { useState } from 'react'
import { usePanier } from '@/hooks/usePanier'
import type { ArticlePanier, CategorieArticle } from '@/lib/panierTypes'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n)) + ' FCFA'
}

function getUidFromCookie(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/portail_uid=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

const CAT_LABELS: Record<CategorieArticle, string> = {
  PHOTO_VIDEO: 'Photo / Vidéo',
  DECORATION: 'Décoration',
  TRAITEUR: 'Traiteur',
  MUSIQUE: 'Musique',
  COORDINATION: 'Coordination',
  HEBERGEMENT: 'Hébergement',
  BOUTIQUE: 'Boutique',
  AUTRE: 'Autre',
}

function BudgetGauge({ depense, budget }: { depense: number; budget: number }) {
  if (budget <= 0) return null
  const pct = Math.min(100, Math.round((depense / budget) * 100))
  const color = pct < 60 ? '#7C9A7E' : pct < 85 ? '#C9A84C' : '#C0392B'
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs text-[#888] mb-1">
        <span>Budget utilisé</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2.5 bg-[#F5F0E8] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function ArticleRow({ article, onMoins, onPlus, onSupprimer }: {
  article: ArticlePanier
  onMoins: () => void
  onPlus: () => void
  onSupprimer: () => void
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#F5F0E8] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1A1A1A] truncate">{article.nom}</p>
        <p className="text-[11px] text-[#888]">{formatFCFA(article.prix_unitaire)} / unité</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onMoins} className="w-7 h-7 rounded-full bg-[#F5F0E8] text-[#1A1A1A] font-bold flex items-center justify-center text-sm">−</button>
        <span className="text-sm font-semibold w-5 text-center">{article.quantite}</span>
        <button onClick={onPlus} className="w-7 h-7 rounded-full bg-[#C9A84C] text-white font-bold flex items-center justify-center text-sm">+</button>
      </div>
      <div className="text-right min-w-[90px]">
        <p className="text-sm font-semibold text-[#1A1A1A]">{formatFCFA(article.prix_unitaire * article.quantite)}</p>
        <button onClick={onSupprimer} className="text-[10px] text-red-400 hover:text-red-600">Retirer</button>
      </div>
    </div>
  )
}

export default function PanierPage() {
  const [uid] = useState(() => getUidFromCookie())
  const [budgetSaisi, setBudgetSaisi] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { articles, totaux, modifierQuantite, supprimerArticle, viderPanier } = usePanier(uid)

  // Grouper par catégorie
  const groupes = articles.reduce<Record<CategorieArticle, ArticlePanier[]>>((acc, a) => {
    if (!acc[a.categorie]) acc[a.categorie] = []
    acc[a.categorie].push(a)
    return acc
  }, {} as Record<CategorieArticle, ArticlePanier[]>)

  function buildWhatsAppMessage() {
    const lines = ['*Récapitulatif panier L&Lui Signature*', '']
    Object.entries(groupes).forEach(([cat, items]) => {
      lines.push(`*${CAT_LABELS[cat as CategorieArticle]}*`)
      items.forEach(a => lines.push(`- ${a.nom} x${a.quantite} : ${formatFCFA(a.prix_unitaire * a.quantite)}`))
      lines.push('')
    })
    lines.push(`*Total HT : ${formatFCFA(totaux.total_ht)}*`)
    return encodeURIComponent(lines.join('\n'))
  }

  async function handleSaveFirestore() {
    if (!uid) return
    setSaving(true)
    try {
      await fetch('/api/portail/panier/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, articles, total_ht: totaux.total_ht }),
      })
      setSaved(true)
    } catch {
      // silently ignore
    } finally {
      setSaving(false)
    }
  }

  if (articles.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">🛍️</p>
        <h2 className="font-serif italic text-2xl text-[#1A1A1A] mb-2">Panier vide</h2>
        <p className="text-sm text-[#888] mb-6">Ajoutez des prestations depuis le configurateur ou les escales</p>
        <a href="/portail/configurateur" className="px-5 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: '#C9A84C' }}>
          Parcourir le catalogue
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-serif italic text-2xl text-[#1A1A1A] mb-1">Mon Panier</h1>
      <p className="text-sm text-[#888] mb-5">{totaux.nb_articles} article(s)</p>

      {/* Budget gauge */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-[#888]">Budget prévisionnel</span>
          <input
            type="number"
            placeholder="ex: 5000000"
            className="flex-1 text-sm border border-[#E8E0D0] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#C9A84C]"
            onChange={e => setBudgetSaisi(Number(e.target.value))}
          />
        </div>
        <BudgetGauge depense={totaux.total_ht} budget={budgetSaisi} />
      </div>

      {/* Articles groupés */}
      {Object.entries(groupes).map(([cat, items]) => (
        <div key={cat} className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] mb-3">
          <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">
            {CAT_LABELS[cat as CategorieArticle]}
          </p>
          {items.map(a => (
            <ArticleRow
              key={a.id}
              article={a}
              onMoins={() => modifierQuantite(a.id, a.quantite - 1)}
              onPlus={() => modifierQuantite(a.id, a.quantite + 1)}
              onSupprimer={() => supprimerArticle(a.id)}
            />
          ))}
        </div>
      ))}

      {/* Récap dark */}
      <div className="bg-[#1A1A1A] rounded-2xl p-5 mb-4">
        <div className="flex justify-between text-white/60 text-sm mb-2">
          <span>Sous-total HT</span>
          <span>{formatFCFA(totaux.total_ht)}</span>
        </div>
        <div className="flex justify-between text-white font-bold text-lg">
          <span>Total</span>
          <span className="text-[#C9A84C]">{formatFCFA(totaux.total_ht)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <a
          href={`https://wa.me/237600000000?text=${buildWhatsAppMessage()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 rounded-2xl text-sm font-semibold text-white text-center"
          style={{ background: '#25D366' }}
        >
          Envoyer sur WhatsApp
        </a>
        <button
          onClick={handleSaveFirestore}
          disabled={saving || saved}
          className="w-full py-3 rounded-2xl text-sm font-semibold transition-all"
          style={{ background: saved ? '#7C9A7E' : '#C9A84C', color: 'white' }}
        >
          {saved ? 'Sauvegardé !' : saving ? 'Sauvegarde…' : 'Sauvegarder mon panier'}
        </button>
        <button onClick={viderPanier} className="text-xs text-red-400 text-center py-2">
          Vider le panier
        </button>
      </div>
    </div>
  )
}
