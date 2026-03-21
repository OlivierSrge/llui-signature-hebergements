'use client'
// app/portail/panier/page.tsx — Devis manuel : saisie + récap + WhatsApp

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

const CATEGORIES: { value: CategorieArticle; label: string }[] = [
  { value: 'BOUTIQUE', label: 'Boutique' },
  { value: 'HEBERGEMENT', label: 'Hébergement' },
  { value: 'DECORATION', label: 'Décoration' },
  { value: 'PHOTO_VIDEO', label: 'Photo & Vidéo' },
  { value: 'TRAITEUR', label: 'Traiteur' },
  { value: 'MUSIQUE', label: 'Musique' },
  { value: 'COORDINATION', label: 'Coordination' },
  { value: 'AUTRE', label: 'Autre' },
]

const CAT_LABELS: Record<CategorieArticle, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label])) as Record<CategorieArticle, string>

export default function PanierPage() {
  const [uid] = useState(() => getUidFromCookie())
  const { articles, totaux, modifierQuantite, supprimerArticle, viderPanier, ajouterArticle } = usePanier(uid)

  // Formulaire saisie manuelle
  const [nom, setNom] = useState('')
  const [categorie, setCategorie] = useState<CategorieArticle>('BOUTIQUE')
  const [prix, setPrix] = useState('')
  const [qte, setQte] = useState('1')

  function handleAjouter(e: React.FormEvent) {
    e.preventDefault()
    if (!nom.trim() || !prix || Number(prix) <= 0) return
    ajouterArticle({
      id: `manuel-${Date.now()}`,
      nom: nom.trim(),
      categorie,
      prix_unitaire: Math.round(Number(prix)),
      quantite: Math.max(1, Math.round(Number(qte))),
    })
    setNom(''); setPrix(''); setQte('1')
  }

  // Calculs
  const honoraires = Math.round(totaux.total_ht * 0.10)
  const totalTTC = totaux.total_ht + honoraires
  const revPotentiels = Math.round(totalTTC * 0.05)

  function buildWhatsApp() {
    const lines = ['*Devis L&Lui Signature*', '']
    const groupes = articles.reduce<Record<string, ArticlePanier[]>>((acc, a) => {
      const k = CAT_LABELS[a.categorie] ?? a.categorie
      if (!acc[k]) acc[k] = []
      acc[k].push(a)
      return acc
    }, {})
    Object.entries(groupes).forEach(([cat, items]) => {
      lines.push(`*${cat}*`)
      items.forEach(a => lines.push(`- ${a.nom} x${a.quantite} : ${formatFCFA(a.prix_unitaire * a.quantite)}`))
      lines.push('')
    })
    lines.push(`Total HT : ${formatFCFA(totaux.total_ht)}`)
    lines.push(`Honoraires 10% : ${formatFCFA(honoraires)}`)
    lines.push(`*Total TTC : ${formatFCFA(totalTTC)}*`)
    return encodeURIComponent(lines.join('\n'))
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-serif italic text-2xl text-[#1A1A1A] mb-1">Mon Devis</h1>
      <p className="text-sm text-[#888] mb-5">Saisissez vos articles et générez votre récapitulatif</p>

      {/* FORMULAIRE AJOUT MANUEL */}
      <form onSubmit={handleAjouter} className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] mb-5">
        <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Ajouter un article</p>
        <div className="space-y-2.5">
          <input
            type="text"
            placeholder="Nom du service ou produit"
            value={nom}
            onChange={e => setNom(e.target.value)}
            className="w-full text-sm border border-[#E8E0D0] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A84C]"
            required
          />
          <div className="flex gap-2">
            <select
              value={categorie}
              onChange={e => setCategorie(e.target.value as CategorieArticle)}
              className="flex-1 text-sm border border-[#E8E0D0] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A84C] bg-white"
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input
              type="number"
              placeholder="Qté"
              value={qte}
              min="1"
              onChange={e => setQte(e.target.value)}
              className="w-16 text-sm border border-[#E8E0D0] rounded-xl px-2 py-2.5 focus:outline-none focus:border-[#C9A84C] text-center"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Prix unitaire (FCFA)"
              value={prix}
              min="0"
              onChange={e => setPrix(e.target.value)}
              className="flex-1 text-sm border border-[#E8E0D0] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A84C]"
              required
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex-shrink-0"
              style={{ background: '#C9A84C' }}
            >
              + Ajouter
            </button>
          </div>
        </div>
      </form>

      {/* LISTE DES ARTICLES */}
      {articles.length === 0 ? (
        <div className="text-center py-10 text-[#888] text-sm">
          <p className="text-4xl mb-3">📋</p>
          <p>Aucun article pour le moment.</p>
          <p className="text-xs mt-1">Ajoutez vos services ci-dessus ou explorez la boutique.</p>
        </div>
      ) : (
        <>
          {articles.map(a => (
            <div key={a.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-[#F5F0E8] mb-2 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1A1A1A] truncate">{a.nom}</p>
                <p className="text-[11px] text-[#888]">{CAT_LABELS[a.categorie]} · {formatFCFA(a.prix_unitaire)}/u</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => modifierQuantite(a.id, a.quantite - 1)} className="w-7 h-7 rounded-full bg-[#F5F0E8] text-[#1A1A1A] font-bold text-sm flex items-center justify-center">−</button>
                <span className="text-sm font-semibold w-5 text-center">{a.quantite}</span>
                <button onClick={() => modifierQuantite(a.id, a.quantite + 1)} className="w-7 h-7 rounded-full bg-[#C9A84C] text-white font-bold text-sm flex items-center justify-center">+</button>
              </div>
              <div className="text-right min-w-[80px]">
                <p className="text-sm font-semibold text-[#1A1A1A]">{formatFCFA(a.prix_unitaire * a.quantite)}</p>
                <button onClick={() => supprimerArticle(a.id)} className="text-[10px] text-red-400 hover:text-red-600">Retirer</button>
              </div>
            </div>
          ))}

          {/* RÉCAPITULATIF */}
          <div className="bg-[#1A1A1A] rounded-2xl p-5 mt-4 mb-4">
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-white/60 text-sm">
                <span>Sous-total HT</span><span>{formatFCFA(totaux.total_ht)}</span>
              </div>
              <div className="flex justify-between text-white/60 text-sm">
                <span>Honoraires 10%</span><span>{formatFCFA(honoraires)}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between text-white font-bold text-base">
                <span>Total TTC</span><span style={{ color: '#C9A84C' }}>{formatFCFA(totalTTC)}</span>
              </div>
            </div>
            <p className="text-[11px] text-white/40">💎 REV potentiels : {formatFCFA(revPotentiels)}</p>
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-3">
            <a
              href={`https://wa.me/237600000000?text=${buildWhatsApp()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white text-center"
              style={{ background: '#25D366' }}
            >
              📲 Envoyer ce devis par WhatsApp
            </a>
            <a
              href="/portail/commande"
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white text-center"
              style={{ background: '#C9A84C' }}
            >
              Confirmer la commande →
            </a>
            <button onClick={viderPanier} className="text-xs text-red-400 text-center py-2">
              Vider le devis
            </button>
          </div>
        </>
      )}
    </div>
  )
}
