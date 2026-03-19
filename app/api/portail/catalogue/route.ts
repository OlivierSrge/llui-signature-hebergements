// app/api/portail/catalogue/route.ts
// Catalogue des prestations mariage — données statiques

import { NextResponse } from 'next/server'
import type { CategorieArticle } from '@/lib/panierTypes'

export interface ArticleCatalogue {
  id: string
  nom: string
  categorie: CategorieArticle
  prix_unitaire: number   // FCFA HT
  description: string
  unite: string           // ex: "forfait", "heure", "personne"
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

export async function GET() {
  return NextResponse.json(CATALOGUE)
}
