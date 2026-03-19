// app/api/portail/hebergements/route.ts
// Partenaires hébergements L&Lui Signature — données statiques

import { NextResponse } from 'next/server'

export interface Hebergement {
  id: string
  nom: string
  lieu: string
  type: 'VILLA' | 'HOTEL' | 'LODGE' | 'APPARTEMENT'
  capacite: number         // nombre de personnes
  prix_nuit: number        // FCFA
  reduction_fidelite: number // % de réduction pour membres portail
  description: string
  tags: string[]
  disponible: boolean
}

const HEBERGEMENTS: Hebergement[] = [
  {
    id: 'villa-rosa-yaounde',
    nom: 'Villa Rosa',
    lieu: 'Yaoundé, Bastos',
    type: 'VILLA',
    capacite: 20,
    prix_nuit: 350_000,
    reduction_fidelite: 10,
    description: 'Villa luxueuse avec piscine, parfaite pour les familles de mariés',
    tags: ['Piscine', 'Jardin', 'Parking'],
    disponible: true,
  },
  {
    id: 'hotel-mont-febe',
    nom: 'Hôtel Mont Fébe',
    lieu: 'Yaoundé, Mont Fébe',
    type: 'HOTEL',
    capacite: 80,
    prix_nuit: 120_000,
    reduction_fidelite: 8,
    description: 'Hôtel 4 étoiles avec vue panoramique sur Yaoundé',
    tags: ['Vue panoramique', 'Restaurant', 'Spa'],
    disponible: true,
  },
  {
    id: 'lodge-wouri-douala',
    nom: 'Lodge du Wouri',
    lieu: 'Douala, Akwa Nord',
    type: 'LODGE',
    capacite: 30,
    prix_nuit: 200_000,
    reduction_fidelite: 12,
    description: 'Lodge en bord de fleuve, ambiance naturelle et raffinée',
    tags: ['Bord de fleuve', 'Terrasse', 'BBQ'],
    disponible: true,
  },
  {
    id: 'appart-bonapriso',
    nom: 'Résidence Bonapriso',
    lieu: 'Douala, Bonapriso',
    type: 'APPARTEMENT',
    capacite: 8,
    prix_nuit: 85_000,
    reduction_fidelite: 15,
    description: 'Appartements meublés haut de gamme en plein cœur de Douala',
    tags: ['Centre-ville', 'Sécurisé', 'Wifi'],
    disponible: true,
  },
  {
    id: 'villa-ngaoundere',
    nom: 'Villa des Hauts Plateaux',
    lieu: 'Ngaoundéré, Adamaoua',
    type: 'VILLA',
    capacite: 15,
    prix_nuit: 180_000,
    reduction_fidelite: 10,
    description: 'Villa authentique sur les hauts plateaux camerounais',
    tags: ['Vue montagne', 'Calme', 'Nature'],
    disponible: true,
  },
  {
    id: 'hotel-kribi-beach',
    nom: 'Hôtel Kribi Beach',
    lieu: 'Kribi, Bord de mer',
    type: 'HOTEL',
    capacite: 50,
    prix_nuit: 160_000,
    reduction_fidelite: 10,
    description: 'Hôtel en bord de mer, idéal pour les lunes de miel',
    tags: ['Plage privée', 'Piscine', 'Brunch'],
    disponible: true,
  },
  {
    id: 'lodge-limbe',
    nom: 'Atlantic Lodge Limbé',
    lieu: 'Limbé, Sud-Ouest',
    type: 'LODGE',
    capacite: 25,
    prix_nuit: 140_000,
    reduction_fidelite: 8,
    description: 'Lodge face à l\'océan Atlantique, plages volcaniques',
    tags: ['Océan', 'Volcan', 'Plongée'],
    disponible: false,
  },
  {
    id: 'villa-bafoussam',
    nom: 'Villa Bamiléké',
    lieu: 'Bafoussam, Ouest',
    type: 'VILLA',
    capacite: 18,
    prix_nuit: 220_000,
    reduction_fidelite: 12,
    description: 'Villa authentique dans la région bamiléké, idéale pour les célébrations',
    tags: ['Culture', 'Jardins', 'Cuisine locale'],
    disponible: true,
  },
]

export async function GET() {
  return NextResponse.json(HEBERGEMENTS)
}
