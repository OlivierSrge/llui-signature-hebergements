// lib/calculatePayout.ts
// Moteur de calcul des commissions L&Lui Signature — Portail affiliation
// Décisions validées Olivier — NE JAMAIS MODIFIER SANS VALIDATION

import type { PortailGrade } from '@/lib/portailGrades'

// ─── Types ───────────────────────────────────────────────────
export type TransactionType = 'BOUTIQUE' | 'PACK_MARIAGE'
export type CommissionLevel = 1 | 2

export interface PayoutResult {
  commission_brute: number
  cash: number           // 70% de la commission brute
  credits_services: number // 30% de la commission brute
  rev_gagnes: number
  level: CommissionLevel
}

export interface FastStartResult {
  palier: string | null
  prime: number
}

// ─── Constantes validées (ne pas modifier) ───────────────────
export const COMMISSION_RATES: Record<TransactionType, Record<CommissionLevel, number>> = {
  BOUTIQUE:     { 1: 0.10, 2: 0.05 },   // N1 : 10% / N2 : 5%
  PACK_MARIAGE: { 1: 0.012, 2: 0.005 }, // N1 : 1,2% / N2 : 0,5%
}

const REV_RATIO: Record<TransactionType, number> = {
  BOUTIQUE:     10_000,  // 10 000 FCFA = 1 REV
  PACK_MARIAGE: 100_000, // 100 000 FCFA = 1 REV
}

const SPLIT = { cash: 0.70, credits: 0.30 }

export const FAST_START_PALIERS = [
  { rev: 80,  jours: 30, prime: 30_000,  label: 'Fast Start 30j — 80 REV'  },
  { rev: 200, jours: 60, prime: 80_000,  label: 'Fast Start 60j — 200 REV' },
  { rev: 450, jours: 90, prime: 200_000, label: 'Fast Start 90j — 450 REV' },
]

export const GRADE_THRESHOLDS: Record<PortailGrade, number> = {
  START:   0,
  BRONZE:  5_001,
  ARGENT:  15_001,
  OR:      35_001,
  SAPHIR:  75_001,
  DIAMANT: 150_001,
}

// ─── Fonctions principales ───────────────────────────────────

/**
 * Calcule la commission et les REV gagnés pour une transaction
 */
export function calculatePayout(
  amount_ht: number,
  type: TransactionType,
  level: CommissionLevel
): PayoutResult {
  const taux = COMMISSION_RATES[type][level]
  const commission_brute = Math.round(amount_ht * taux)
  const cash = Math.round(commission_brute * SPLIT.cash)
  const credits_services = Math.round(commission_brute * SPLIT.credits)
  const rev_gagnes = Math.floor(amount_ht / REV_RATIO[type])
  return { commission_brute, cash, credits_services, rev_gagnes, level }
}

/**
 * Vérifie les paliers Fast Start atteints depuis la date d'inscription
 */
export function checkFastStart(
  rev_lifetime: number,
  enrolled_at: Date
): FastStartResult {
  const now = new Date()
  const joursEcoules = Math.floor((now.getTime() - enrolled_at.getTime()) / (1000 * 60 * 60 * 24))

  // Parcourir les paliers du plus grand au plus petit
  for (const palier of [...FAST_START_PALIERS].reverse()) {
    if (joursEcoules <= palier.jours && rev_lifetime >= palier.rev) {
      return { palier: palier.label, prime: palier.prime }
    }
  }
  return { palier: null, prime: 0 }
}

/**
 * Retourne le grade correspondant au nombre de REV lifetime
 */
export function getGradeFromRev(rev_lifetime: number): PortailGrade {
  if (rev_lifetime >= 150_001) return 'DIAMANT'
  if (rev_lifetime >= 75_001)  return 'SAPHIR'
  if (rev_lifetime >= 35_001)  return 'OR'
  if (rev_lifetime >= 15_001)  return 'ARGENT'
  if (rev_lifetime >= 5_001)   return 'BRONZE'
  return 'START'
}
