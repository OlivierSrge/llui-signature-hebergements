// ============================================================
// Templates WhatsApp centralisés — L&Lui Signature
// ============================================================
// Ce fichier est la source de vérité pour tous les templates
// WhatsApp du projet. Utilisé à la fois par l'espace admin
// (/admin/reservations) et l'espace partenaire (/partenaire/reservations).

export type FicheVariant = 'complete' | 'simple'

export type NiveauFidelite = 'novice' | 'explorateur' | 'ambassadeur' | 'excellence' | null

const BOUTIQUE_URL = 'http://l-et-lui-signature.com'

// Retourne le label du niveau de fidélité
export function getLoyaltyLabel(niveau: NiveauFidelite): string {
  if (!niveau) return 'Novice'
  const labels: Record<string, string> = {
    novice: 'Novice',
    explorateur: 'Explorateur',
    ambassadeur: 'Ambassadeur',
    excellence: 'Excellence',
  }
  return labels[niveau] || 'Novice'
}

// Retourne la réduction boutique selon le niveau
export function getBoutiqueDiscount(niveau: NiveauFidelite): string {
  if (!niveau) return '-5%'
  const discounts: Record<string, string> = {
    novice: '-5%',
    explorateur: '-10%',
    ambassadeur: '-15%',
    excellence: '-20%',
  }
  return discounts[niveau] || '-5%'
}

export interface FicheV2Params {
  clientName: string
  dateArrivee: string      // DD/MM/YYYY
  dateDepart: string       // DD/MM/YYYY
  nomLogement: string
  nombrePersonnes: number | string
  codeReservation: string
  lienSuivi: string        // URL complète de suivi
  niveauFidelite: NiveauFidelite
}

/**
 * Construit le message V2 de la fiche d'accueil WhatsApp.
 * Variant 'complete' : inclut le bloc fidélité + lien boutique.
 * Variant 'simple'   : sans le bloc fidélité.
 */
export function buildFicheV2(params: FicheV2Params, variant: FicheVariant = 'complete'): string {
  const {
    clientName,
    dateArrivee,
    dateDepart,
    nomLogement,
    nombrePersonnes,
    codeReservation,
    lienSuivi,
    niveauFidelite,
  } = params

  const niveauLabel = getLoyaltyLabel(niveauFidelite)
  const reduction = getBoutiqueDiscount(niveauFidelite)

  let msg = `🌊 *Fiche d'accueil — L&Lui Signature – Kribi*\n\n`
  msg += `Bonjour ${clientName},\n\n`
  msg += `Votre séjour du ${dateArrivee} → ${dateDepart} à Kribi approche ! Nous sommes ravis de vous accueillir.\n\n`
  msg += `📍 Votre hébergement : *${nomLogement}*\n`
  msg += `👥 ${nombrePersonnes} personne(s)\n`
  msg += `🔑 Code réservation : *${codeReservation}*\n\n`
  msg += `Retrouvez tous les détails de votre réservation et votre QR Code d'accès ici :\n`
  msg += `👉 ${lienSuivi}\n`

  if (variant === 'complete') {
    msg += `\n🎁 *Avantage Membre L&Lui Stars :*\n`
    msg += `En tant que membre ${niveauLabel}, vous bénéficiez de ${reduction} sur toute notre boutique en ligne.\n`
    msg += `🛍️ Commander sur la boutique : ${BOUTIQUE_URL}\n`
  }

  msg += `\nÀ très vite sous le soleil de Kribi !\nL'équipe L&Lui Signature 🌺`

  return msg
}
