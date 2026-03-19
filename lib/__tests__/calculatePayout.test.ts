// lib/__tests__/calculatePayout.test.ts
// Tests unitaires du moteur de commissions L&Lui Signature

import {
  calculatePayout,
  checkFastStart,
  getGradeFromRev,
} from '../calculatePayout'

// ─── calculatePayout ─────────────────────────────────────────

describe('calculatePayout — BOUTIQUE', () => {
  test('N1 : 50 000 FCFA → 5 000 commission, 3 500 cash, 1 500 crédits, 5 REV', () => {
    const result = calculatePayout(50_000, 'BOUTIQUE', 1)
    expect(result.commission_brute).toBe(5_000)
    expect(result.cash).toBe(3_500)
    expect(result.credits_services).toBe(1_500)
    expect(result.rev_gagnes).toBe(5)
    expect(result.level).toBe(1)
  })

  test('N2 : 50 000 FCFA → 2 500 commission, 1 750 cash, 750 crédits', () => {
    const result = calculatePayout(50_000, 'BOUTIQUE', 2)
    expect(result.commission_brute).toBe(2_500)
    expect(result.cash).toBe(1_750)
    expect(result.credits_services).toBe(750)
    expect(result.rev_gagnes).toBe(5)
  })
})

describe('calculatePayout — PACK_MARIAGE', () => {
  test('N1 : 20 000 000 FCFA → 240 000 commission, 168 000 cash, 72 000 crédits, 200 REV', () => {
    const result = calculatePayout(20_000_000, 'PACK_MARIAGE', 1)
    expect(result.commission_brute).toBe(240_000)
    expect(result.cash).toBe(168_000)
    expect(result.credits_services).toBe(72_000)
    expect(result.rev_gagnes).toBe(200)
  })

  test('N2 : 20 000 000 FCFA → 100 000 commission', () => {
    const result = calculatePayout(20_000_000, 'PACK_MARIAGE', 2)
    expect(result.commission_brute).toBe(100_000)
  })
})

// ─── getGradeFromRev ─────────────────────────────────────────

describe('getGradeFromRev', () => {
  test('0 REV → START',     () => expect(getGradeFromRev(0)).toBe('START'))
  test('5 000 REV → START', () => expect(getGradeFromRev(5_000)).toBe('START'))
  test('5 001 REV → BRONZE',() => expect(getGradeFromRev(5_001)).toBe('BRONZE'))
  test('15 001 REV → ARGENT',() => expect(getGradeFromRev(15_001)).toBe('ARGENT'))
  test('35 001 REV → OR',   () => expect(getGradeFromRev(35_001)).toBe('OR'))
  test('76 000 REV → SAPHIR',() => expect(getGradeFromRev(76_000)).toBe('SAPHIR'))
  test('150 001 REV → DIAMANT',() => expect(getGradeFromRev(150_001)).toBe('DIAMANT'))
})

// ─── checkFastStart ──────────────────────────────────────────

describe('checkFastStart', () => {
  test('85 REV à J28 → palier 30j débloqué (prime 30 000)', () => {
    const enrolled = new Date()
    enrolled.setDate(enrolled.getDate() - 28)
    const result = checkFastStart(85, enrolled)
    expect(result.prime).toBe(30_000)
    expect(result.palier).toContain('30j')
  })

  test('210 REV à J55 → palier 60j débloqué (prime 80 000)', () => {
    const enrolled = new Date()
    enrolled.setDate(enrolled.getDate() - 55)
    const result = checkFastStart(210, enrolled)
    expect(result.prime).toBe(80_000)
  })

  test('50 REV à J28 → aucun palier', () => {
    const enrolled = new Date()
    enrolled.setDate(enrolled.getDate() - 28)
    const result = checkFastStart(50, enrolled)
    expect(result.palier).toBeNull()
    expect(result.prime).toBe(0)
  })

  test('85 REV à J95 → hors délai, aucun palier', () => {
    const enrolled = new Date()
    enrolled.setDate(enrolled.getDate() - 95)
    const result = checkFastStart(85, enrolled)
    expect(result.palier).toBeNull()
  })
})
