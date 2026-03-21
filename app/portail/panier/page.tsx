'use client'
// app/portail/panier/page.tsx — Panier dynamique Option B — honoraires PACK_MARIAGE uniquement

import { useState } from 'react'
import { useClientIdentity } from '@/hooks/useClientIdentity'
import { usePanier } from '@/hooks/usePanier'
import type { ArticlePanier, CategorieArticle } from '@/lib/panierTypes'

function getUid() {
  if (typeof document === 'undefined') return ''
  return decodeURIComponent(document.cookie.match(/portail_uid=([^;]+)/)?.[1] ?? '')
}
function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

const CAT_LABELS: Record<CategorieArticle, string> = {
  BOUTIQUE: 'Services & Prestations', HEBERGEMENT: 'Hébergements',
  PHOTO_VIDEO: 'Photo & Vidéo', DECORATION: 'Décoration', TRAITEUR: 'Traiteur',
  MUSIQUE: 'Musique', COORDINATION: 'Coordination', AUTRE: 'Autre',
}
const CAT_ICONS: Partial<Record<CategorieArticle, string>> = { BOUTIQUE: '🛍️', HEBERGEMENT: '🏡' }

// RÈGLE : honoraires 10% sur HEBERGEMENT uniquement (= PACK_MARIAGE)
const isPackMariage = (a: ArticlePanier) => a.categorie === 'HEBERGEMENT'

export default function PanierPage() {
  const [uid] = useState(() => getUid())
  const identity = useClientIdentity()
  const { articles, totaux, modifierQuantite, supprimerArticle, viderPanier } = usePanier(uid)

  // Calculs séparés
  const articlesBoutique = articles.filter(a => !isPackMariage(a))
  const articlesPack = articles.filter(a => isPackMariage(a))
  const ssBoutique = articlesBoutique.reduce((s, a) => s + a.prix_unitaire * a.quantite, 0)
  const ssPack = articlesPack.reduce((s, a) => s + a.prix_unitaire * a.quantite, 0)
  const honoraires = Math.round(ssPack * 0.10)
  const totalTTC = ssBoutique + ssPack + honoraires
  const revPotentiels = Math.round(totalTTC * 0.05)

  const groupes = articles.reduce<Record<string, ArticlePanier[]>>((acc, a) => {
    const k = CAT_LABELS[a.categorie] ?? a.categorie
    if (!acc[k]) acc[k] = []
    acc[k].push(a)
    return acc
  }, {})

  function buildWhatsApp() {
    const lines = [`*Devis mariage — ${identity.noms_maries}*`, '']
    if (ssBoutique > 0) {
      lines.push('🛍️ *Services & Prestations*')
      articlesBoutique.forEach(a => lines.push(`- ${a.nom} x${a.quantite} : ${formatFCFA(a.prix_unitaire * a.quantite)}`))
      lines.push(`Sous-total : ${formatFCFA(ssBoutique)}`, '')
    }
    if (ssPack > 0) {
      lines.push('🏡 *Hébergements*')
      articlesPack.forEach(a => lines.push(`- ${a.nom} x${a.quantite} : ${formatFCFA(a.prix_unitaire * a.quantite)}`))
      lines.push(`Sous-total : ${formatFCFA(ssPack)}`)
      lines.push(`Honoraires 10% : ${formatFCFA(honoraires)}`, '')
    }
    lines.push(`*TOTAL TTC : ${formatFCFA(totalTTC)}*`)
    return encodeURIComponent(lines.join('\n'))
  }

  if (articles.length === 0) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-5xl mb-4">🛒</p>
      <h2 className="font-serif italic text-2xl text-[#1A1A1A] mb-2">Votre panier est vide</h2>
      <p className="text-sm text-[#888] mb-6">Ajoutez des prestations ou des hébergements</p>
      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        <a href="/portail/configurateur" className="py-3 rounded-2xl text-sm font-semibold text-white text-center" style={{ background: '#1A1A1A' }}>Boutique L&amp;Lui Signature →</a>
        <a href="/portail/escales" className="py-3 rounded-2xl text-sm font-semibold text-[#1A1A1A] text-center" style={{ background: '#C9A84C' }}>Sélection Hébergements →</a>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-5">
        <a href="/portail/configurateur" className="text-xs text-[#C9A84C]">← Continuer mes achats</a>
        <h1 className="font-serif italic text-2xl text-[#1A1A1A] mt-1">Mon Panier</h1>
        {identity.noms_maries !== 'Mon mariage' && <p className="text-sm text-[#888]">{identity.noms_maries}</p>}
      </div>

      {/* Articles groupés */}
      {Object.entries(groupes).map(([cat, items]) => {
        const catKey = Object.keys(CAT_LABELS).find(k => CAT_LABELS[k as CategorieArticle] === cat) as CategorieArticle
        return (
          <div key={cat} className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] mb-3">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">
              {CAT_ICONS[catKey] ?? ''} {cat}
            </p>
            {items.map(a => (
              <div key={a.id} className="flex items-center gap-2 py-2 border-b border-[#F5F0E8] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">{a.nom}</p>
                  <p className="text-[11px] text-[#888]">{formatFCFA(a.prix_unitaire)}/u</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => modifierQuantite(a.id, a.quantite - 1)} className="w-6 h-6 rounded-full bg-[#F5F0E8] font-bold text-sm flex items-center justify-center">−</button>
                  <span className="text-sm font-semibold w-4 text-center">{a.quantite}</span>
                  <button onClick={() => modifierQuantite(a.id, a.quantite + 1)} className="w-6 h-6 rounded-full bg-[#C9A84C] text-white font-bold text-sm flex items-center justify-center">+</button>
                </div>
                <div className="text-right min-w-[70px]">
                  <p className="text-sm font-semibold">{formatFCFA(a.prix_unitaire * a.quantite)}</p>
                  <button onClick={() => supprimerArticle(a.id)} className="text-[10px] text-red-400">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {/* Récapitulatif */}
      <div className="bg-[#1A1A1A] rounded-2xl p-5 mb-4">
        {ssBoutique > 0 && (
          <div className="flex justify-between text-white/60 text-sm mb-1">
            <span>🛍️ Services</span><span>{formatFCFA(ssBoutique)}</span>
          </div>
        )}
        {ssPack > 0 && <>
          <div className="flex justify-between text-white/60 text-sm mb-1">
            <span>🏡 Hébergements</span><span>{formatFCFA(ssPack)}</span>
          </div>
          <div className="flex justify-between text-white/60 text-sm mb-2">
            <span>Honoraires 10%</span><span>{formatFCFA(honoraires)}</span>
          </div>
        </>}
        <div className="border-t border-white/10 pt-2 flex justify-between text-white font-bold text-lg">
          <span>Total TTC</span><span style={{ color: '#C9A84C' }}>{formatFCFA(totalTTC)}</span>
        </div>
        <p className="text-[11px] text-white/30 mt-1">💎 REV potentiels : +{formatFCFA(revPotentiels)}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <a href="/portail/commande" className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white text-center" style={{ background: '#C9A84C' }}>Confirmer ma commande →</a>
        <a href={`https://wa.me/237600000000?text=${buildWhatsApp()}`} target="_blank" rel="noopener noreferrer"
          className="w-full py-3 rounded-2xl text-sm font-semibold text-white text-center" style={{ background: '#25D366' }}>
          📲 Envoyer par WhatsApp
        </a>
        <a href="/portail/configurateur" className="w-full py-2.5 rounded-2xl text-sm text-center text-[#888] border border-[#E8E0D0]">← Continuer mes achats</a>
        <button onClick={viderPanier} className="text-xs text-red-400 text-center py-1">Vider le panier</button>
      </div>
    </div>
  )
}
