// app/api/portail/catalogue/route.ts
// Catalogue — lit Firestore catalogue_boutique (sync Netlify) avec fallback statique

import { NextResponse } from 'next/server'
import type { CategorieArticle } from '@/lib/panierTypes'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export interface ArticleCatalogue {
  id: string
  nom: string
  categorie: CategorieArticle
  prix_unitaire: number   // FCFA HT
  description: string
  unite: string           // ex: "forfait", "heure", "personne"
  image_url?: string
  url_fiche?: string
  source?: 'BOUTIQUE' | 'STATIC'
}

const CATALOGUE: ArticleCatalogue[] = [
  // Photo / Vidéo
  { id: 'photo-basic', nom: 'Reportage Photo Essentiel', categorie: 'PHOTO_VIDEO', prix_unitaire: 150_000, description: '6h de couverture, 200 photos retouchées', unite: 'forfait' },
  { id: 'photo-premium', nom: 'Reportage Photo Premium', categorie: 'PHOTO_VIDEO', prix_unitaire: 300_000, description: 'Journée complète, 400 photos + album', unite: 'forfait' },
  { id: 'video-basic', nom: 'Film Mariage Court', categorie: 'PHOTO_VIDEO', prix_unitaire: 200_000, description: 'Film 5 min highlight', unite: 'forfait' },
  { id: 'video-cinema', nom: 'Film Mariage Cinématique', categorie: 'PHOTO_VIDEO', prix_unitaire: 450_000, description: 'Film 20 min + drone + teaser', unite: 'forfait' },

  // Décoration
  { id: 'deco-fleurs', nom: 'Décoration Florale', categorie: 'DECORATION', prix_unitaire: 250_000, description: 'Arche florale + centres de table (10 tables)', unite: 'forfait' },
  { id: 'deco-lumiere', nom: 'Décoration Lumières', categorie: 'DECORATION', prix_unitaire: 180_000, description: 'Guirlandes, bougies, lustres LED', unite: 'forfait' },
  { id: 'deco-tissu', nom: 'Habillage Salle', categorie: 'DECORATION', prix_unitaire: 120_000, description: 'Voilages, housses de chaises, chemin de table', unite: 'forfait' },

  // Traiteur
  { id: 'traiteur-buffet', nom: 'Buffet Signature', categorie: 'TRAITEUR', prix_unitaire: 25_000, description: 'Buffet 3 plats + desserts, service inclus', unite: 'personne' },
  { id: 'traiteur-assis', nom: 'Repas Assis Gastronomique', categorie: 'TRAITEUR', prix_unitaire: 45_000, description: 'Menu 4 services, sommelier inclus', unite: 'personne' },
  { id: 'traiteur-cocktail', nom: 'Cocktail d\'accueil', categorie: 'TRAITEUR', prix_unitaire: 12_000, description: 'Canapés, boissons, 1h30', unite: 'personne' },

  // Musique
  { id: 'musique-dj', nom: 'DJ Professionnel', categorie: 'MUSIQUE', prix_unitaire: 200_000, description: 'DJ + sono + lumières de scène, 6h', unite: 'forfait' },
  { id: 'musique-live', nom: 'Groupe Live', categorie: 'MUSIQUE', prix_unitaire: 500_000, description: 'Groupe 4 musiciens, 3h de concert', unite: 'forfait' },
  { id: 'musique-gospel', nom: 'Chorale Gospel', categorie: 'MUSIQUE', prix_unitaire: 150_000, description: 'Chorale 12 voix, cérémonie + cocktail', unite: 'forfait' },

  // Coordination
  { id: 'coord-jour-j', nom: 'Coordination Jour J', categorie: 'COORDINATION', prix_unitaire: 200_000, description: 'Wedding planner dédié toute la journée', unite: 'forfait' },
  { id: 'coord-full', nom: 'Organisation Complète', categorie: 'COORDINATION', prix_unitaire: 800_000, description: '6 mois d\'accompagnement + jour J', unite: 'forfait' },
]

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

async function fetchFromFirestore(): Promise<{ articles: ArticleCatalogue[]; synced_at: string | null }> {
  const db = getDb()
  let snap = await db.collection('catalogue_boutique')
    .where('actif', '==', true)
    .get()

  // Si vide → déclencher sync et retenter
  if (snap.empty) {
    const headers: Record<string, string> = {}
    if (process.env.CRON_SECRET) headers['Authorization'] = `Bearer ${process.env.CRON_SECRET}`
    await fetch(`${SITE_URL}/api/cron/sync-boutique`, { headers }).catch(() => {})
    await new Promise(r => setTimeout(r, 3000))
    snap = await db.collection('catalogue_boutique')
      .where('actif', '==', true)
      .get()
  }

  if (snap.empty) return { articles: [], synced_at: null }

  const articles: ArticleCatalogue[] = snap.docs.map(doc => {
    const d = doc.data()
    return {
      id: doc.id,
      nom: d.nom ?? '',
      categorie: d.categorie ?? 'AUTRE',
      prix_unitaire: d.prix ?? 0,
      description: d.description ?? '',
      unite: 'forfait',
      image_url: d.image_url || undefined,
      url_fiche: d.url_fiche || undefined,
      source: 'BOUTIQUE' as const,
    }
  })
  const synced_at = snap.docs[0]?.data()?.synced_at?.toDate?.()?.toISOString() ?? null
  return { articles, synced_at }
}

export async function GET() {
  try {
    const { articles, synced_at } = await fetchFromFirestore()
    if (articles.length > 0) {
      return NextResponse.json({ articles, synced_at })
    }
  } catch {
    // Firestore indisponible → fallback statique
  }
  return NextResponse.json({ articles: CATALOGUE.map(a => ({ ...a, source: 'STATIC' as const })), synced_at: null })
}
