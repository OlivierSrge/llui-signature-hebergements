// lib/generateMagicLink.ts
// Génération de magic links pour les invités Guest Connect

import { nanoid } from 'nanoid'

/**
 * Génère un slug unique depuis le nom de l'invité
 * Format : initiales (max 2) + nanoid(6)   ex: "ma_a8x2pq"
 */
export function generateSlug(nom: string): string {
  const initiales = nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toLowerCase() ?? '')
    .join('')
  const suffix = nanoid(6).toLowerCase()
  return `${initiales}_${suffix}`
}

/**
 * Construit l'URL complète du magic link
 */
export function getMagicLinkUrl(slug: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
  return `${base}/invite/${slug}`
}

/**
 * Valide un numéro de téléphone camerounais
 * Accepte : +237XXXXXXXXX / 06XXXXXXXX / 07XXXXXXXX / 237XXXXXXXXX
 */
export function validateTelephoneCM(tel: string): boolean {
  const t = tel.replace(/[\s\-().]/g, '')
  return (
    /^\+237[0-9]{9}$/.test(t) ||
    /^237[0-9]{9}$/.test(t) ||
    /^0[67][0-9]{8}$/.test(t)
  )
}

/**
 * Normalise un numéro vers le format +237XXXXXXXXX
 */
export function normalizeTelephone(tel: string): string {
  const t = tel.replace(/[\s\-().]/g, '')
  if (/^0[67]/.test(t)) return `+237${t.slice(1)}`
  if (/^237/.test(t) && !t.startsWith('+')) return `+${t}`
  return t
}
