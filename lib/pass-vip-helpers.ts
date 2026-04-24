// lib/pass-vip-helpers.ts — Helpers partagés pour le système Pass VIP Boutique

import bcrypt from 'bcryptjs'

export type PassType = 'ARGENT' | 'OR' | 'SAPHIR' | 'DIAMANT'

export interface PendingOrder {
  id: string
  token: string
  email_client: string
  nom_client: string
  tel_client: string
  type_pass: string
  montant: number
  code_promo?: string | null
  nom_affilie?: string | null
  commission_pourcent?: number | null
  date_commande: string
  statut: 'pending' | 'confirmed' | 'cancelled'
  confirmed_at?: string | null
  sheets_row?: number | null
  sheets_id?: string | null
}

export interface PassVipBoutique {
  id: string
  email: string
  nom: string
  tel: string
  type_pass: PassType
  duree_jours: number
  date_achat: string
  date_debut: string
  date_fin: string
  statut: 'actif' | 'expire' | 'annule'
  montant: number
  code_promo?: string | null
  password_hash: string
  qr_generated_today: number
  qr_reset_date: string
  created_at: string
}

// ── Extraction ──────────────────────────────────────────────────────────────

export function extraireTypePass(produit_nom: string): PassType {
  const u = produit_nom.toUpperCase()
  if (u.includes('DIAMANT')) return 'DIAMANT'
  if (u.includes('SAPHIR')) return 'SAPHIR'
  if (u.includes('OR')) return 'OR'
  return 'ARGENT'
}

export function extraireDuree(produit_nom: string): number {
  if (produit_nom.includes('30')) return 30
  if (produit_nom.includes('15')) return 15
  if (produit_nom.includes('7')) return 7
  const defaults: Record<PassType, number> = { ARGENT: 7, OR: 15, SAPHIR: 30, DIAMANT: 30 }
  return defaults[extraireTypePass(produit_nom)]
}

export function calculerDateFin(duree_jours: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + duree_jours)
  return d
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Mot de passe temporaire ─────────────────────────────────────────────────

export function generateTempPassword(nom: string): string {
  const initiales = nom
    .split(' ')
    .map((n) => n[0] ?? 'X')
    .join('')
    .toUpperCase()
    .slice(0, 2)
    .padEnd(2, 'X')
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0')
  return `VIP2026${initiales}${random}`
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10)
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash)
}

// ── Réductions et couleurs ──────────────────────────────────────────────────

export const PASS_REDUCTIONS: Record<PassType, { hebergement: string; restaurant: string }> = {
  ARGENT:  { hebergement: '8%',  restaurant: '5%'  },
  OR:      { hebergement: '12%', restaurant: '8%'  },
  SAPHIR:  { hebergement: '15%', restaurant: '10%' },
  DIAMANT: { hebergement: '20%', restaurant: '15%' },
}

export const PASS_BADGE_COLORS: Record<PassType, { bg: string; text: string }> = {
  ARGENT:  { bg: '#A8A9AD', text: '#fff' },
  OR:      { bg: '#C9A84C', text: '#fff' },
  SAPHIR:  { bg: '#0F52BA', text: '#fff' },
  DIAMANT: { bg: '#1a1a1a', text: '#B9F2FF' },
}

export const PASS_LABELS: Record<PassType, string> = {
  ARGENT:  'Pass ARGENT',
  OR:      'Pass OR',
  SAPHIR:  'Pass SAPHIR',
  DIAMANT: 'Pass DIAMANT',
}

// ── Cookie session client ───────────────────────────────────────────────────

export const PASS_VIP_COOKIE = 'pass_vip_session'

export function makeSessionValue(passId: string): string {
  const expires = Date.now() + 7 * 24 * 3600 * 1000
  return `${passId}|${expires}`
}

export function parseSession(cookie: string | undefined): string | null {
  if (!cookie) return null
  const [passId, expires] = cookie.split('|')
  if (!passId || !expires) return null
  if (Date.now() > parseInt(expires, 10)) return null
  return passId
}
