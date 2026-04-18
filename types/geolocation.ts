// types/geolocation.ts — Types géolocalisation pour la carte partenaires L&Lui Stars

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
}
