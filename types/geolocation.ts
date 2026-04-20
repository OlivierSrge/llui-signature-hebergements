// types/geolocation.ts — Types géolocalisation pour la carte partenaires L&Lui Stars

import type { AvantageStars } from './avantages-stars'

export interface GeoLocation {
  latitude: number
  longitude: number
  adresse_gps: string     // adresse formatée Google ou saisie manuelle
}

export interface PartenaireAvecLocation {
  id: string
  nom: string
  type: string            // hotel, restaurant, bar, etc.
  photoUrl?: string
  latitude: number
  longitude: number
  adresse_gps: string
  avantages_stars?: AvantageStars[]
  accepte_pass_vip?: boolean
}
