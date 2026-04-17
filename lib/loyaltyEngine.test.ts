// lib/loyaltyEngine.test.ts — Tests unitaires Jest
// Pour exécuter : npx jest lib/loyaltyEngine.test.ts
// Prérequis : npm install --save-dev jest @types/jest ts-jest

import {
  getMembershipStatus,
  getNiveauPass,
  getRemisePct,
  getMultiplier,
  calculateStars,
  calculateRemiseAmount,
  canUseTransaction,
} from './loyaltyEngine'

const THRESHOLDS = {
  seuil_novice: 0,
  seuil_explorateur: 25000,
  seuil_ambassadeur: 75000,
  seuil_excellence: 150000,
}

const REMISE_PARAMS = {
  remise_argent_pct: 5,
  remise_or_pct: 10,
  remise_platine_pct: 20,
}

const MULTIPLIER_PARAMS = {
  multiplicateur_argent: 1.0,
  multiplicateur_or: 1.5,
  multiplicateur_platine: 2.0,
}

// ─── getMembershipStatus ──────────────────────────────────────

describe('getMembershipStatus', () => {
  test('0 stars → novice', () => {
    expect(getMembershipStatus(0, THRESHOLDS)).toBe('novice')
  })
  test('24 999 stars → novice', () => {
    expect(getMembershipStatus(24999, THRESHOLDS)).toBe('novice')
  })
  test('25 000 stars → explorateur', () => {
    expect(getMembershipStatus(25000, THRESHOLDS)).toBe('explorateur')
  })
  test('74 999 stars → explorateur', () => {
    expect(getMembershipStatus(74999, THRESHOLDS)).toBe('explorateur')
  })
  test('75 000 stars → ambassadeur', () => {
    expect(getMembershipStatus(75000, THRESHOLDS)).toBe('ambassadeur')
  })
  test('149 999 stars → ambassadeur', () => {
    expect(getMembershipStatus(149999, THRESHOLDS)).toBe('ambassadeur')
  })
  test('150 000 stars → excellence', () => {
    expect(getMembershipStatus(150000, THRESHOLDS)).toBe('excellence')
  })
  test('999 999 stars → excellence', () => {
    expect(getMembershipStatus(999999, THRESHOLDS)).toBe('excellence')
  })
})

// ─── getNiveauPass ────────────────────────────────────────────

describe('getNiveauPass', () => {
  test('novice → null (pas de pass)', () => {
    expect(getNiveauPass('novice')).toBeNull()
  })
  test('explorateur → argent', () => {
    expect(getNiveauPass('explorateur')).toBe('argent')
  })
  test('ambassadeur → or', () => {
    expect(getNiveauPass('ambassadeur')).toBe('or')
  })
  test('excellence → platine', () => {
    expect(getNiveauPass('excellence')).toBe('platine')
  })
})

// ─── getRemisePct ────────────────────────────────────────────

describe('getRemisePct', () => {
  test('novice → 0%', () => {
    expect(getRemisePct('novice', REMISE_PARAMS)).toBe(0)
  })
  test('explorateur → 5%', () => {
    expect(getRemisePct('explorateur', REMISE_PARAMS)).toBe(5)
  })
  test('ambassadeur → 10%', () => {
    expect(getRemisePct('ambassadeur', REMISE_PARAMS)).toBe(10)
  })
  test('excellence → 20%', () => {
    expect(getRemisePct('excellence', REMISE_PARAMS)).toBe(20)
  })
})

// ─── getMultiplier ────────────────────────────────────────────

describe('getMultiplier', () => {
  test('novice → 1.0x', () => {
    expect(getMultiplier('novice', MULTIPLIER_PARAMS)).toBe(1.0)
  })
  test('explorateur → 1.0x', () => {
    expect(getMultiplier('explorateur', MULTIPLIER_PARAMS)).toBe(1.0)
  })
  test('ambassadeur → 1.5x', () => {
    expect(getMultiplier('ambassadeur', MULTIPLIER_PARAMS)).toBe(1.5)
  })
  test('excellence → 2.0x', () => {
    expect(getMultiplier('excellence', MULTIPLIER_PARAMS)).toBe(2.0)
  })
})

// ─── calculateStars ───────────────────────────────────────────

describe('calculateStars', () => {
  test('5 000 FCFA à 1x → 50 stars', () => {
    expect(calculateStars(5000, 0, 1.0)).toBe(50)
  })
  test('5 000 FCFA à 1.5x → 75 stars', () => {
    expect(calculateStars(5000, 0, 1.5)).toBe(75)
  })
  test('5 000 FCFA à 2x → 100 stars', () => {
    expect(calculateStars(5000, 0, 2.0)).toBe(100)
  })
  test('montant 0 → 0 stars', () => {
    expect(calculateStars(0, 0, 1.5)).toBe(0)
  })
  test('arrondi correct (250 FCFA × 1.5 = 3.75 → 4)', () => {
    expect(calculateStars(250, 0, 1.5)).toBe(4)
  })
  test('montant inférieur à 100 FCFA → 0 stars (< 1 avant arrondi)', () => {
    expect(calculateStars(50, 0, 1.0)).toBe(1) // 0.5 → arrondi à 1
  })
})

// ─── calculateRemiseAmount ────────────────────────────────────

describe('calculateRemiseAmount', () => {
  test('10 000 FCFA × 5% → 500 FCFA', () => {
    expect(calculateRemiseAmount(10000, 5)).toBe(500)
  })
  test('15 000 FCFA × 10% → 1 500 FCFA', () => {
    expect(calculateRemiseAmount(15000, 10)).toBe(1500)
  })
  test('7 777 FCFA × 20% → 1 556 FCFA (arrondi)', () => {
    expect(calculateRemiseAmount(7777, 20)).toBe(1555) // 7777 * 0.2 = 1555.4 → 1555
  })
  test('0% → 0 FCFA', () => {
    expect(calculateRemiseAmount(20000, 0)).toBe(0)
  })
})

// ─── canUseTransaction ────────────────────────────────────────

describe('canUseTransaction', () => {
  test('provision 10 000, stars 50, valeur 1 FCFA → OK', () => {
    expect(canUseTransaction(10000, 50, 1)).toBe(true)
  })
  test('provision 49, stars 50, valeur 1 FCFA → refusé', () => {
    expect(canUseTransaction(49, 50, 1)).toBe(false)
  })
  test('provision exactement suffisante → OK', () => {
    expect(canUseTransaction(500, 100, 5)).toBe(true) // 100 * 5 = 500
  })
  test('provision 0 → refusé si stars > 0', () => {
    expect(canUseTransaction(0, 10, 1)).toBe(false)
  })
  test('stars 0 → toujours OK', () => {
    expect(canUseTransaction(0, 0, 1)).toBe(true)
  })
})
