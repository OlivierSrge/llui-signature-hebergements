'use client'
// hooks/usePanier.ts
// Gestion du panier portail — persisté dans localStorage

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ArticlePanier, TotauxPanier } from '@/lib/panierTypes'

const STORAGE_KEY_PREFIX = 'llui_panier_'

function getKey(uid: string) {
  return `${STORAGE_KEY_PREFIX}${uid}`
}

function loadFromStorage(uid: string): ArticlePanier[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(getKey(uid))
    return raw ? (JSON.parse(raw) as ArticlePanier[]) : []
  } catch {
    return []
  }
}

function saveToStorage(uid: string, articles: ArticlePanier[]) {
  try {
    localStorage.setItem(getKey(uid), JSON.stringify(articles))
  } catch {
    // storage full — silently ignore
  }
}

export function usePanier(uid: string) {
  const [articles, setArticles] = useState<ArticlePanier[]>([])

  // Chargement initial depuis localStorage
  useEffect(() => {
    setArticles(loadFromStorage(uid))
  }, [uid])

  // Persiste à chaque changement
  const updateArticles = useCallback((next: ArticlePanier[]) => {
    setArticles(next)
    saveToStorage(uid, next)
  }, [uid])

  const ajouterArticle = useCallback((article: Omit<ArticlePanier, 'quantite'> & { quantite?: number }) => {
    setArticles(prev => {
      const existing = prev.find(a => a.id === article.id)
      let next: ArticlePanier[]
      if (existing) {
        next = prev.map(a =>
          a.id === article.id
            ? { ...a, quantite: a.quantite + (article.quantite ?? 1) }
            : a
        )
      } else {
        next = [...prev, { ...article, quantite: article.quantite ?? 1 }]
      }
      saveToStorage(uid, next)
      return next
    })
  }, [uid])

  const supprimerArticle = useCallback((id: string) => {
    setArticles(prev => {
      const next = prev.filter(a => a.id !== id)
      saveToStorage(uid, next)
      return next
    })
  }, [uid])

  const modifierQuantite = useCallback((id: string, quantite: number) => {
    if (quantite <= 0) {
      supprimerArticle(id)
      return
    }
    setArticles(prev => {
      const next = prev.map(a => a.id === id ? { ...a, quantite } : a)
      saveToStorage(uid, next)
      return next
    })
  }, [uid, supprimerArticle])

  const viderPanier = useCallback(() => {
    updateArticles([])
  }, [updateArticles])

  const totaux = useMemo((): TotauxPanier => ({
    nb_articles: articles.reduce((s, a) => s + a.quantite, 0),
    total_ht: articles.reduce((s, a) => s + a.prix_unitaire * a.quantite, 0),
    total_articles: articles,
  }), [articles])

  return { articles, totaux, ajouterArticle, supprimerArticle, modifierQuantite, viderPanier }
}
