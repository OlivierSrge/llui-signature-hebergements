// lib/generatePromoCode.ts
// Génération du code promo unique par marié (traçabilité invités)

const BOUTIQUE_BASE = 'https://letlui-signature.netlify.app'
const HEBERGEMENT_BASE = 'https://llui-signature-hebergements.vercel.app'

/**
 * Génère un code promo unique pour le couple marié.
 * Format : LLUI-[INITIALES]-[ANNÉE]
 * Ex : "Gaëlle & Junior" → LLUI-GJ-2026
 */
export function generateCodePromo(nomsMaries: string, uid: string): string {
  const annee = new Date().getFullYear()

  // Extraire initiales depuis les noms (séparés par &, /, et, ou espace)
  const parties = nomsMaries
    .split(/[&\/]|(?:\s+et\s+)/i)
    .map(s => s.trim())
    .filter(Boolean)

  const initiales = parties
    .map(p => {
      const premier = p.trim().split(/\s+/)[0]
      return premier?.[0]?.toUpperCase() ?? ''
    })
    .filter(Boolean)
    .slice(0, 2)
    .join('')

  if (initiales.length >= 1) {
    return `LLUI-${initiales}-${annee}`
  }

  // Fallback : 4 premiers chiffres de l'uid
  const chiffres = uid.replace(/\D/g, '').slice(0, 4).padEnd(4, '0')
  return `LLUI-${chiffres}-${annee}`
}

/**
 * Construit l'URL avec code promo et ref vers la plateforme.
 */
export function getCodePromoUrl(
  code: string,
  uid: string,
  platform: 'boutique' | 'hebergement'
): string {
  const params = `?code=${encodeURIComponent(code)}&ref=${encodeURIComponent(uid)}`
  if (platform === 'boutique') {
    return `${BOUTIQUE_BASE}${params}`
  }
  return `${HEBERGEMENT_BASE}/hebergements${params}`
}
