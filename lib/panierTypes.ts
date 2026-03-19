// lib/panierTypes.ts
// Types du panier portail L&Lui Signature

export type CategorieArticle =
  | 'PHOTO_VIDEO'
  | 'DECORATION'
  | 'TRAITEUR'
  | 'MUSIQUE'
  | 'COORDINATION'
  | 'HEBERGEMENT'
  | 'BOUTIQUE'

export interface ArticlePanier {
  id: string              // identifiant unique (ex: "photo-basic")
  nom: string
  categorie: CategorieArticle
  prix_unitaire: number   // en FCFA HT
  quantite: number
  description?: string
}

export interface TotauxPanier {
  nb_articles: number
  total_ht: number
  total_articles: ArticlePanier[]
}
