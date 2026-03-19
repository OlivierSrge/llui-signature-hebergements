'use client'
// components/panier/BoutonAjouterPanier.tsx
// Bouton +/- pour ajouter un article au panier

import { useState } from 'react'
import { usePanier } from '@/hooks/usePanier'
import type { ArticlePanier } from '@/lib/panierTypes'

interface Props {
  uid: string
  article: Omit<ArticlePanier, 'quantite'>
  label?: string
}

export default function BoutonAjouterPanier({ uid, article, label }: Props) {
  const { articles, ajouterArticle, modifierQuantite } = usePanier(uid)
  const [feedback, setFeedback] = useState(false)

  const existant = articles.find(a => a.id === article.id)
  const qty = existant?.quantite ?? 0

  function handleAjouter() {
    ajouterArticle(article)
    setFeedback(true)
    setTimeout(() => setFeedback(false), 1200)
  }

  function handleMoins() {
    modifierQuantite(article.id, qty - 1)
  }

  function handlePlus() {
    modifierQuantite(article.id, qty + 1)
  }

  if (qty === 0) {
    return (
      <button
        onClick={handleAjouter}
        className="w-full py-2 rounded-xl text-sm font-medium transition-all"
        style={{
          background: feedback ? '#7C9A7E' : '#C9A84C',
          color: 'white',
        }}
      >
        {feedback ? 'Ajouté !' : (label ?? 'Ajouter au panier')}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 justify-center">
      <button
        onClick={handleMoins}
        className="w-8 h-8 rounded-full bg-[#F5F0E8] text-[#1A1A1A] font-bold text-lg flex items-center justify-center hover:bg-[#E8E0D0] transition-colors"
        aria-label="Diminuer quantité"
      >
        −
      </button>
      <span className="text-sm font-semibold w-6 text-center">{qty}</span>
      <button
        onClick={handlePlus}
        className="w-8 h-8 rounded-full bg-[#C9A84C] text-white font-bold text-lg flex items-center justify-center hover:bg-[#B8973B] transition-colors"
        aria-label="Augmenter quantité"
      >
        +
      </button>
    </div>
  )
}
