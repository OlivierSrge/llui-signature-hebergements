import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/db/connection.js', () => ({
  db: { query: vi.fn() },
}));

import { db } from '../src/db/connection.js';
import { calculateTripEstimate } from '../src/services/costCalculator.js';
import { VehicleCategory, FeeType } from '../src/types/index.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CORRIDOR_ID    = 'b0000001-0000-0000-0000-000000000001';  // DLA-NDJ
const BORDER_1_ID    = 'c0000001-0000-0000-0000-000000000001';
const BORDER_2_ID    = 'c0000001-0000-0000-0000-000000000002';

const mockCorridor = {
  id: CORRIDOR_ID,
  distance_km: 1820,
  estimated_hours: 72,
};

const mockBorders = [
  { id: BORDER_1_ID, name: 'Ngaoundéré sortie', avg_waiting_time_hours: 2.5 },
  { id: BORDER_2_ID, name: 'Kousseri/N\'Djamena', avg_waiting_time_hours: 6.0 },
];

const mockFees = [
  { border_crossing_id: BORDER_1_ID, fee_type: 'toll',     description: 'Péages CMR',    amount: '110000', currency: 'XAF', vehicle_category: 'extra_heavy', min_cargo_tons: null, max_cargo_tons: null, cargo_value_threshold_xaf: null },
  { border_crossing_id: BORDER_1_ID, fee_type: 'handling', description: 'Inspection CMR', amount: '25000',  currency: 'XAF', vehicle_category: null,          min_cargo_tons: null, max_cargo_tons: null, cargo_value_threshold_xaf: null },
  { border_crossing_id: BORDER_2_ID, fee_type: 'tax',      description: 'Taxe transit',   amount: '480000', currency: 'XAF', vehicle_category: 'extra_heavy', min_cargo_tons: null, max_cargo_tons: null, cargo_value_threshold_xaf: null },
  { border_crossing_id: BORDER_2_ID, fee_type: 'handling', description: 'Dédouanement',   amount: '95000',  currency: 'XAF', vehicle_category: null,          min_cargo_tons: null, max_cargo_tons: null, cargo_value_threshold_xaf: null },
  { border_crossing_id: BORDER_2_ID, fee_type: 'escort',   description: 'Escorte',        amount: '185000', currency: 'XAF', vehicle_category: null,          min_cargo_tons: null, max_cargo_tons: null, cargo_value_threshold_xaf: '50000000' },
];

const mockRates = [
  { from_currency: 'XAF', to_currency: 'USD', rate: '0.001651' },
  { from_currency: 'XAF', to_currency: 'EUR', rate: '0.001524' },
  { from_currency: 'EUR', to_currency: 'XAF', rate: '655.957' },
];

function setupDbMocks() {
  const queryMock = db.query as ReturnType<typeof vi.fn>;
  queryMock
    .mockResolvedValueOnce({ rows: [mockCorridor] })   // corridor
    .mockResolvedValueOnce({ rows: mockBorders })       // borders
    .mockResolvedValueOnce({ rows: mockFees })          // fees
    .mockResolvedValueOnce({ rows: mockRates });        // exchange rates
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('calculateTripEstimate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calcule correctement les totaux de base', async () => {
    setupDbMocks();

    const result = await calculateTripEstimate({
      originCountryId:      'country-cm',
      destinationCountryId: 'country-td',
      corridorId:           CORRIDOR_ID,
      cargoWeightTons:      28,
      cargoValueXaf:        30_000_000, // 30M XAF (< seuil 50M → pas d'escorte)
      vehicleCategory:      VehicleCategory.EXTRA_HEAVY,
    });

    // Frais attendus :
    // tolls: 110000
    // handling: 25000 + 95000 = 120000
    // taxes: 480000
    // escort: 0 (cargo < 50M XAF)
    // insurance: 30_000_000 * 0.008 = 240000
    // subtotal = 110000 + 120000 + 480000 + 0 + 240000 = 950000
    // margin = 950000 * 0.12 = 114000
    // total = 1064000

    expect(result.breakdown.byCategory.tolls).toBe(110000);
    expect(result.breakdown.byCategory.taxes).toBe(480000);
    expect(result.breakdown.byCategory.handling).toBe(120000);
    expect(result.breakdown.byCategory.escort).toBe(0);
    expect(result.breakdown.byCategory.insurance).toBe(240000);
    expect(result.breakdown.byCategory.margin).toBe(114000);
    expect(result.totalXaf).toBe(1064000);
  });

  it('inclut l\'escorte si la valeur du cargo dépasse le seuil', async () => {
    setupDbMocks();

    const result = await calculateTripEstimate({
      originCountryId:      'country-cm',
      destinationCountryId: 'country-td',
      corridorId:           CORRIDOR_ID,
      cargoWeightTons:      28,
      cargoValueXaf:        60_000_000, // > 50M → escorte déclenchée
      vehicleCategory:      VehicleCategory.EXTRA_HEAVY,
    });

    expect(result.breakdown.byCategory.escort).toBe(185000);
    // Total doit inclure l'escorte
    expect(result.totalXaf).toBeGreaterThan(1064000);
  });

  it('calcule les conversions USD et EUR correctement', async () => {
    setupDbMocks();

    const result = await calculateTripEstimate({
      originCountryId:      'country-cm',
      destinationCountryId: 'country-td',
      corridorId:           CORRIDOR_ID,
      cargoWeightTons:      28,
      cargoValueXaf:        30_000_000,
      vehicleCategory:      VehicleCategory.EXTRA_HEAVY,
    });

    const expectedUsd = Math.round(result.totalXaf * 0.001651 * 100) / 100;
    const expectedEur = Math.round(result.totalXaf * 0.001524 * 100) / 100;

    expect(result.totalUsd).toBeCloseTo(expectedUsd, 1);
    expect(result.totalEur).toBeCloseTo(expectedEur, 1);
  });

  it('calcule la durée estimée incluant les attentes aux frontières', async () => {
    setupDbMocks();

    const result = await calculateTripEstimate({
      originCountryId:      'country-cm',
      destinationCountryId: 'country-td',
      corridorId:           CORRIDOR_ID,
      cargoWeightTons:      28,
      cargoValueXaf:        30_000_000,
      vehicleCategory:      VehicleCategory.EXTRA_HEAVY,
    });

    // 72h trajet + round(2.5 + 6.0) = 72 + 9 = 81h
    expect(result.estimatedDurationHours).toBe(81);
  });

  it('retourne une validité de 48h sur l\'estimation', async () => {
    setupDbMocks();

    const beforeCall = Date.now();
    const result = await calculateTripEstimate({
      originCountryId:      'country-cm',
      destinationCountryId: 'country-td',
      corridorId:           CORRIDOR_ID,
      cargoWeightTons:      28,
      cargoValueXaf:        30_000_000,
      vehicleCategory:      VehicleCategory.EXTRA_HEAVY,
    });

    const validUntil = new Date(result.validUntil).getTime();
    const expectedMin = beforeCall + 47 * 3600 * 1000;
    const expectedMax = beforeCall + 49 * 3600 * 1000;

    expect(validUntil).toBeGreaterThan(expectedMin);
    expect(validUntil).toBeLessThan(expectedMax);
  });

  it('construit le breakdown par segment avec les bons bordeaux', async () => {
    setupDbMocks();

    const result = await calculateTripEstimate({
      originCountryId:      'country-cm',
      destinationCountryId: 'country-td',
      corridorId:           CORRIDOR_ID,
      cargoWeightTons:      28,
      cargoValueXaf:        30_000_000,
      vehicleCategory:      VehicleCategory.EXTRA_HEAVY,
    });

    expect(result.breakdown.bySegment).toHaveLength(2);
    expect(result.breakdown.bySegment[0].borderCrossingId).toBe(BORDER_1_ID);
    expect(result.breakdown.bySegment[1].borderCrossingId).toBe(BORDER_2_ID);
  });

  it('lève une erreur si le corridor est introuvable', async () => {
    (db.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });

    await expect(
      calculateTripEstimate({
        originCountryId:      'country-cm',
        destinationCountryId: 'country-td',
        corridorId:           'corridor-inexistant',
        cargoWeightTons:      28,
        cargoValueXaf:        30_000_000,
        vehicleCategory:      VehicleCategory.EXTRA_HEAVY,
      }),
    ).rejects.toThrow('introuvable');
  });
});
