import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock de la connexion DB
vi.mock('../src/db/connection.js', () => ({
  db: {
    query: vi.fn(),
  },
}));

import { db } from '../src/db/connection.js';
import { scoreVehicles, addDriverScore } from '../src/services/vehicleAllocation.js';
import { VehicleCategory } from '../src/types/index.js';

// ---------------------------------------------------------------------------
// Helpers pour construire des mocks cohérents
// ---------------------------------------------------------------------------

const DEST_COUNTRY_ID = 'country-tchad-001';
const CORRIDOR_ID     = 'corridor-dla-ndj-001';
const VEHICLE_1       = 'vehicle-001';
const VEHICLE_2       = 'vehicle-002';
const DRIVER_1        = 'driver-001';

function makeCandidate(id: string, status = 'available', payloadTons = 30) {
  return {
    id,
    plate_number: `LT-${id.slice(-3)}-CM`,
    category: VehicleCategory.EXTRA_HEAVY,
    payload_tons: String(payloadTons),
    volume_m3: '90',
    status,
  };
}

function makeDoc(vehicleId: string, docType: string, expiryDate: Date, isValid = true) {
  return { vehicle_id: vehicleId, doc_type: docType, expiry_date: expiryDate.toISOString(), is_valid: isValid };
}

// ---------------------------------------------------------------------------
// Tests : Exclusions dures
// ---------------------------------------------------------------------------

describe('scoreVehicles — Exclusions dures', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exclut un véhicule sans assurance CEMAC valide', async () => {
    const future = new Date(Date.now() + 60 * 24 * 3600 * 1000);
    const past   = new Date(Date.now() - 1 * 24 * 3600 * 1000); // Expirée hier

    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [makeCandidate(VEHICLE_1)] }) // candidates
      .mockResolvedValueOnce({ rows: [
        makeDoc(VEHICLE_1, 'assurance_cemac',  past,   true),  // EXPIRÉE
        makeDoc(VEHICLE_1, 'visite_technique', future, true),
        makeDoc(VEHICLE_1, 'carte_rose',       future, true),
      ]}) // docs
      .mockResolvedValueOnce({ rows: [] })  // agrement
      .mockResolvedValueOnce({ rows: [] })  // incidents critiques
      .mockResolvedValueOnce({ rows: [] })  // badge
      .mockResolvedValueOnce({ rows: [] }); // corridor exp

    const scores = await scoreVehicles({
      destinationCountryId: DEST_COUNTRY_ID,
      cargoWeightTons: 25,
    });

    expect(scores).toHaveLength(1);
    expect(scores[0].isEligible).toBe(false);
    expect(scores[0].score).toBe(-999);
    expect(scores[0].exclusions).toContain('Assurance CEMAC expirée ou absente');
  });

  it('exclut un véhicule sans visite technique valide', async () => {
    const future = new Date(Date.now() + 60 * 24 * 3600 * 1000);
    const past   = new Date(Date.now() - 5 * 24 * 3600 * 1000);

    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [makeCandidate(VEHICLE_1)] })
      .mockResolvedValueOnce({ rows: [
        makeDoc(VEHICLE_1, 'assurance_cemac',  future, true),
        makeDoc(VEHICLE_1, 'visite_technique', past,   true),  // EXPIRÉE
        makeDoc(VEHICLE_1, 'carte_rose',       future, true),
      ]})
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const scores = await scoreVehicles({ destinationCountryId: DEST_COUNTRY_ID, cargoWeightTons: 25 });

    expect(scores[0].isEligible).toBe(false);
    expect(scores[0].exclusions).toContain('Visite technique expirée ou absente');
  });

  it('exclut un véhicule avec incident critique non résolu', async () => {
    const future = new Date(Date.now() + 60 * 24 * 3600 * 1000);

    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [makeCandidate(VEHICLE_1)] })
      .mockResolvedValueOnce({ rows: [
        makeDoc(VEHICLE_1, 'assurance_cemac',  future, true),
        makeDoc(VEHICLE_1, 'visite_technique', future, true),
        makeDoc(VEHICLE_1, 'carte_rose',       future, true),
      ]})
      .mockResolvedValueOnce({ rows: [] })                               // agrement
      .mockResolvedValueOnce({ rows: [{ vehicle_id: VEHICLE_1, count: '1' }] }) // INCIDENT CRITIQUE
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const scores = await scoreVehicles({ destinationCountryId: DEST_COUNTRY_ID, cargoWeightTons: 25 });

    expect(scores[0].isEligible).toBe(false);
    expect(scores[0].exclusions).toContain('Incident critique non résolu sur 12 mois');
  });

  it('retourne un tableau vide si aucun candidat (capacité insuffisante)', async () => {
    (db.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });

    const scores = await scoreVehicles({
      destinationCountryId: DEST_COUNTRY_ID,
      cargoWeightTons: 999, // Trop lourd pour tous les véhicules
    });

    expect(scores).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests : Scoring positif
// ---------------------------------------------------------------------------

describe('scoreVehicles — Scoring positif', () => {
  beforeEach(() => vi.clearAllMocks());

  it('donne le score maximum (180 pts sans chauffeur) à un véhicule parfait', async () => {
    const future60 = new Date(Date.now() + 60 * 24 * 3600 * 1000);  // +60 jours
    const future31 = new Date(Date.now() + 31 * 24 * 3600 * 1000);  // +31 jours (> 30j)

    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [makeCandidate(VEHICLE_1)] })
      .mockResolvedValueOnce({ rows: [
        makeDoc(VEHICLE_1, 'assurance_cemac',  future60, true),
        makeDoc(VEHICLE_1, 'visite_technique', future60, true),
        makeDoc(VEHICLE_1, 'carte_rose',       future31, true), // Valide > 30j → +40pts
      ]})
      .mockResolvedValueOnce({ rows: [{ vehicle_id: VEHICLE_1, expiry_date: future60.toISOString() }] }) // agrement +60
      .mockResolvedValueOnce({ rows: [] })  // 0 incident critique → +30
      .mockResolvedValueOnce({ rows: [{ vehicle_id: VEHICLE_1 }] })  // badge +20
      .mockResolvedValueOnce({ rows: [{ vehicle_id: VEHICLE_1 }] }); // corridor exp +20

    const scores = await scoreVehicles({
      destinationCountryId: DEST_COUNTRY_ID,
      cargoWeightTons: 25,
      corridorId: CORRIDOR_ID,
    });

    expect(scores).toHaveLength(1);
    expect(scores[0].isEligible).toBe(true);
    // Score = agrement(60) + carteRose(40) + noIncident(30) + badge(20) + corridorExp(20) = 170
    // Note: driverPassport non calculé sans driverId → 0
    expect(scores[0].score).toBe(170);
    expect(scores[0].breakdown.agrement).toBe(60);
    expect(scores[0].breakdown.carteRose).toBe(40);
    expect(scores[0].breakdown.incidentHistory).toBe(30);
    expect(scores[0].breakdown.badgePortuaire).toBe(20);
    expect(scores[0].breakdown.corridorExperience).toBe(20);
  });

  it('donne 20 pts de carteRose si expiration dans < 30 jours', async () => {
    const future60  = new Date(Date.now() + 60 * 24 * 3600 * 1000);
    const future20  = new Date(Date.now() + 20 * 24 * 3600 * 1000); // < 30 jours

    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [makeCandidate(VEHICLE_1)] })
      .mockResolvedValueOnce({ rows: [
        makeDoc(VEHICLE_1, 'assurance_cemac',  future60, true),
        makeDoc(VEHICLE_1, 'visite_technique', future60, true),
        makeDoc(VEHICLE_1, 'carte_rose',       future20, true), // Bientôt expirée
      ]})
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const scores = await scoreVehicles({ destinationCountryId: DEST_COUNTRY_ID, cargoWeightTons: 25 });

    // Demi-points carte rose : 40/2 = 20
    expect(scores[0].breakdown.carteRose).toBe(20);
  });

  it('trie les éligibles avant les inéligibles', async () => {
    const future = new Date(Date.now() + 60 * 24 * 3600 * 1000);
    const past   = new Date(Date.now() - 1);

    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [makeCandidate(VEHICLE_1), makeCandidate(VEHICLE_2)] })
      .mockResolvedValueOnce({ rows: [
        makeDoc(VEHICLE_1, 'assurance_cemac',  future, true),
        makeDoc(VEHICLE_1, 'visite_technique', future, true),
        makeDoc(VEHICLE_1, 'carte_rose',       future, true),
        makeDoc(VEHICLE_2, 'assurance_cemac',  past,   true),   // EXPIRÉ
        makeDoc(VEHICLE_2, 'visite_technique', future, true),
        makeDoc(VEHICLE_2, 'carte_rose',       future, true),
      ]})
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const scores = await scoreVehicles({ destinationCountryId: DEST_COUNTRY_ID, cargoWeightTons: 25 });

    expect(scores[0].vehicleId).toBe(VEHICLE_1);
    expect(scores[0].isEligible).toBe(true);
    expect(scores[1].vehicleId).toBe(VEHICLE_2);
    expect(scores[1].isEligible).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests : addDriverScore
// ---------------------------------------------------------------------------

describe('addDriverScore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ajoute 30 pts si le chauffeur a un passeport valide +6 mois', async () => {
    const baseScore = {
      vehicleId: VEHICLE_1,
      plateNumber: 'LT-001-CM',
      score: 110,
      category: VehicleCategory.EXTRA_HEAVY,
      payloadTons: 30,
      volumeM3: 90,
      breakdown: { agrement: 60, carteRose: 40, driverPassport: 0, incidentHistory: 30, badgePortuaire: 0, corridorExperience: 0 },
      exclusions: [],
      isEligible: true,
    };

    const in7Months = new Date(Date.now() + 7 * 30 * 24 * 3600 * 1000);

    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [{ passport_expiry: in7Months.toISOString(), has_critical_incident: false }] }) // driver
      .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // visa ok

    const result = await addDriverScore(baseScore, DRIVER_1, DEST_COUNTRY_ID);

    expect(result.score).toBe(140); // 110 + 30
    expect(result.breakdown.driverPassport).toBe(30);
    expect(result.isEligible).toBe(true);
  });

  it('exclut le véhicule si le chauffeur a un incident critique', async () => {
    const baseScore = {
      vehicleId: VEHICLE_1, plateNumber: 'LT-001-CM', score: 110,
      category: VehicleCategory.EXTRA_HEAVY, payloadTons: 30, volumeM3: 90,
      breakdown: { agrement: 60, carteRose: 40, driverPassport: 0, incidentHistory: 30, badgePortuaire: 0, corridorExperience: 0 },
      exclusions: [], isEligible: true,
    };

    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [{ passport_expiry: null, has_critical_incident: true }] });

    const result = await addDriverScore(baseScore, DRIVER_1, DEST_COUNTRY_ID);

    expect(result.isEligible).toBe(false);
    expect(result.score).toBe(-999);
    expect(result.exclusions).toContain('Chauffeur avec incident critique non résolu');
  });
});
