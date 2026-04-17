// lib/loyaltyEngine.ts — Moteur de fidélité L&Lui Stars (fonctions pures, sans effets de bord)

export type MembershipStatus = 'novice' | 'explorateur' | 'ambassadeur' | 'excellence'
export type NiveauPass = 'argent' | 'or' | 'platine'

interface LoyaltyThresholds {
  seuil_novice: number
  seuil_explorateur: number
  seuil_ambassadeur: number
  seuil_excellence: number
}

interface RemiseParams {
  remise_argent_pct: number
  remise_or_pct: number
  remise_platine_pct: number
}

interface MultiplierParams {
  multiplicateur_argent: number
  multiplicateur_or: number
  multiplicateur_platine: number
}

/**
 * Détermine le statut de fidélité selon le total de stars historique (cumul à vie).
 */
export function getMembershipStatus(
  totalStars: number,
  thresholds: LoyaltyThresholds
): MembershipStatus {
  if (totalStars >= thresholds.seuil_excellence) return 'excellence'
  if (totalStars >= thresholds.seuil_ambassadeur) return 'ambassadeur'
  if (totalStars >= thresholds.seuil_explorateur) return 'explorateur'
  return 'novice'
}

/**
 * Détermine le niveau de pass (Argent/Or/Platine) selon le statut.
 * Retourne null pour les Novices (pas de pass).
 */
export function getNiveauPass(status: MembershipStatus): NiveauPass | null {
  switch (status) {
    case 'excellence': return 'platine'
    case 'ambassadeur': return 'or'
    case 'explorateur': return 'argent'
    default: return null
  }
}

/**
 * Retourne le pourcentage de remise boutique applicable selon le statut.
 */
export function getRemisePct(status: MembershipStatus, params: RemiseParams): number {
  switch (status) {
    case 'excellence': return params.remise_platine_pct
    case 'ambassadeur': return params.remise_or_pct
    case 'explorateur': return params.remise_argent_pct
    default: return 0
  }
}

/**
 * Retourne le multiplicateur de stars selon le statut.
 */
export function getMultiplier(status: MembershipStatus, params: MultiplierParams): number {
  switch (status) {
    case 'excellence': return params.multiplicateur_platine
    case 'ambassadeur': return params.multiplicateur_or
    case 'explorateur': return params.multiplicateur_argent
    default: return 1.0
  }
}

/**
 * Calcule le nombre de stars gagnées pour une transaction.
 * Base : 1 star par 100 FCFA dépensés (montant net après remise) × multiplicateur.
 * Le paramètre remisePercent est gardé pour la traçabilité mais ne modifie pas le calcul
 * car montantNet est déjà le montant après remise.
 */
export function calculateStars(
  montantNet: number,
  _remisePercent: number,
  multiplier: number
): number {
  return Math.round((montantNet / 100) * multiplier)
}

/**
 * Calcule le montant de la remise en FCFA sur le montant brut.
 */
export function calculateRemiseAmount(montantBrut: number, remisePct: number): number {
  return Math.round(montantBrut * remisePct / 100)
}

/**
 * Vérifie que le partenaire dispose d'assez de provision pour couvrir les stars à attribuer.
 */
export function canUseTransaction(
  partnerProvision: number,
  starsToAward: number,
  starValueFcfa: number
): boolean {
  return partnerProvision >= starsToAward * starValueFcfa
}

// ─── Labels et styles UI ──────────────────────────────────────

export const MEMBERSHIP_LABELS: Record<MembershipStatus, string> = {
  novice: 'Novice',
  explorateur: 'Explorateur',
  ambassadeur: 'Ambassadeur',
  excellence: 'Excellence',
}

export const PASS_LABELS: Record<NiveauPass, string> = {
  argent: 'Pass Argent',
  or: 'Pass Or',
  platine: 'Pass Platine',
}

export const PASS_CARD_GRADIENTS: Record<NiveauPass, string> = {
  argent: 'from-[#8E9EAB] via-[#B8C6CB] to-[#6B7280]',
  or: 'from-[#C9A84C] via-[#F0C040] to-[#8B6914]',
  platine: 'from-[#B0BAC8] via-[#E8EDF2] to-[#8898AA]',
}

export const STATUS_COLORS: Record<MembershipStatus, string> = {
  novice: 'bg-gray-100 text-gray-600',
  explorateur: 'bg-blue-100 text-blue-700',
  ambassadeur: 'bg-amber-100 text-amber-700',
  excellence: 'bg-purple-100 text-purple-700',
}

export const STATUS_ICONS: Record<MembershipStatus, string> = {
  novice: '🌱',
  explorateur: '🔵',
  ambassadeur: '🥇',
  excellence: '💎',
}
