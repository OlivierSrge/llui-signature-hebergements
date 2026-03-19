// lib/pexelsClient.ts
// Client Pexels pour les images de fond des propositions commerciales
// Clé API depuis process.env.PEXELS_API_KEY (jamais en dur)

import { createClient } from 'pexels'

export const pexels = createClient(process.env.PEXELS_API_KEY || '')

export async function searchWeddingImage(query: string): Promise<string> {
  try {
    if (!process.env.PEXELS_API_KEY) return ''
    const result = await pexels.photos.search({
      query: `${query} wedding elegant`,
      per_page: 1,
      orientation: 'landscape',
    })
    if ('photos' in result && result.photos.length > 0) {
      return result.photos[0].src.large2x
    }
  } catch {
    // Silently fail — fallback géré par l'appelant
  }
  return ''
}

export const WEDDING_QUERIES: Record<string, string> = {
  cover: 'luxury wedding ceremony beach tropical',
  traiteur: 'wedding reception dinner elegant table',
  decoration: 'wedding decoration flowers luxury',
  photo: 'wedding photographer couple',
  animation: 'wedding dance celebration',
  logistique: 'wedding luxury car bride',
  lieu: 'tropical beach wedding venue',
  hebergement: 'luxury villa beach Cameroon',
  boutique: 'wedding accessories elegant',
  closing: 'wedding sunset couple happiness',
}
