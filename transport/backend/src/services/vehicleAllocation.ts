import { db } from '../db/connection.js';
import {
  VehicleCategory,
  VehicleScore,
  ScoreBreakdown,
  VehicleAvailabilityRequest,
} from '../types/index.js';

// =============================================================================
// Constantes de scoring (total max = 200 pts)
// =============================================================================

const SCORE = {
  AGREMENT_PAYS:         60,  // Agrément transporteur valide pour pays destination
  CARTE_ROSE_VALID:      40,  // Carte Rose CEMAC valide, non expirée dans 30 jours
  DRIVER_PASSPORT:       30,  // Chauffeur avec passeport valide +6 mois
  NO_CRITICAL_INCIDENT:  30,  // 0 incident critique non résolu sur 12 mois
  BADGE_PORTUAIRE:       20,  // Badge PAD ou Kribi actif
  CORRIDOR_EXPERIENCE:   20,  // Véhicule déjà passé ce corridor dans 90 jours
} as const;

const EXCLUSION_SCORE = -999; // Véhicule non proposé

// =============================================================================
// Requête principale — scoring de tous les véhicules candidats
// =============================================================================

export async function scoreVehicles(
  req: VehicleAvailabilityRequest,
): Promise<VehicleScore[]> {
  const { destinationCountryId, cargoWeightTons, cargoVolumeM3, corridorId } = req;

  // ---- 1. Candidats : véhicules disponibles avec capacité suffisante ----
  const candidatesResult = await db.query<{
    id: string;
    plate_number: string;
    category: VehicleCategory;
    payload_tons: string;
    volume_m3: string | null;
    status: string;
  }>(
    `SELECT id, plate_number, category, payload_tons, volume_m3, status
     FROM vehicles
     WHERE status NOT IN ('maintenance', 'incident', 'retired')
       AND payload_tons >= $1
       AND ($2::numeric IS NULL OR volume_m3 IS NULL OR volume_m3 >= $2)`,
    [cargoWeightTons, cargoVolumeM3 ?? null],
  );

  if (candidatesResult.rows.length === 0) return [];

  const vehicleIds = candidatesResult.rows.map((r) => r.id);

  // ---- 2. Données documentaires en masse (une seule requête) ----
  const [docsResult, authResult, incidentResult, badgeResult, corridorExpResult] =
    await Promise.all([
      // Documents véhicules (carte rose, assurance CEMAC, visite technique)
      db.query<{
        vehicle_id: string;
        doc_type: string;
        expiry_date: string;
        is_valid: boolean;
      }>(
        `SELECT vehicle_id, doc_type, expiry_date, is_valid
         FROM vehicle_documents
         WHERE vehicle_id = ANY($1)
           AND doc_type IN ('assurance_cemac', 'visite_technique', 'carte_rose')`,
        [vehicleIds],
      ),

      // Agrément transporteur pour le pays de destination
      db.query<{ vehicle_id: string; expiry_date: string }>(
        `SELECT vehicle_id, expiry_date
         FROM vehicle_country_auth
         WHERE vehicle_id = ANY($1)
           AND country_id = $2
           AND auth_type = 'agrement_transporteur'
           AND is_active = TRUE
           AND expiry_date > NOW()`,
        [vehicleIds, destinationCountryId],
      ),

      // Incidents critiques non résolus sur 12 mois
      db.query<{ vehicle_id: string; count: string }>(
        `SELECT t.vehicle_id, COUNT(*) AS count
         FROM incidents i
         JOIN trips t ON t.id = i.trip_id
         WHERE t.vehicle_id = ANY($1)
           AND i.severity = 'critical'
           AND i.is_resolved = FALSE
           AND i.reported_at > NOW() - INTERVAL '12 months'
         GROUP BY t.vehicle_id`,
        [vehicleIds],
      ),

      // Badge portuaire actif (PAD ou Kribi)
      db.query<{ vehicle_id: string }>(
        `SELECT vehicle_id
         FROM vehicle_country_auth
         WHERE vehicle_id = ANY($1)
           AND auth_type IN ('badge_portuaire_pad', 'badge_portuaire_kribi')
           AND is_active = TRUE
           AND expiry_date > NOW()`,
        [vehicleIds],
      ),

      // Expérience corridor (90 derniers jours)
      corridorId
        ? db.query<{ vehicle_id: string }>(
            `SELECT DISTINCT vehicle_id
             FROM trips
             WHERE vehicle_id = ANY($1)
               AND corridor_id = $2
               AND status = 'delivered'
               AND actual_arrival > NOW() - INTERVAL '90 days'`,
            [vehicleIds, corridorId],
          )
        : Promise.resolve({ rows: [] as { vehicle_id: string }[] }),
    ]);

  // ---- 3. Indexer les données pour O(1) lookup ----
  const docsByVehicle = new Map<
    string,
    { doc_type: string; expiry_date: Date; is_valid: boolean }[]
  >();
  for (const row of docsResult.rows) {
    const list = docsByVehicle.get(row.vehicle_id) ?? [];
    list.push({
      doc_type: row.doc_type,
      expiry_date: new Date(row.expiry_date),
      is_valid: row.is_valid,
    });
    docsByVehicle.set(row.vehicle_id, list);
  }

  const agrementSet = new Set(authResult.rows.map((r) => r.vehicle_id));
  const criticalIncidentSet = new Set(incidentResult.rows.map((r) => r.vehicle_id));
  const badgeSet = new Set(badgeResult.rows.map((r) => r.vehicle_id));
  const corridorExpSet = new Set(corridorExpResult.rows.map((r) => r.vehicle_id));

  // ---- 4. Scoring par véhicule ----
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const in6Months = new Date(now.getTime() + 183 * 24 * 3600 * 1000);

  const results: VehicleScore[] = [];

  for (const vehicle of candidatesResult.rows) {
    const docs = docsByVehicle.get(vehicle.id) ?? [];
    const exclusions: string[] = [];
    let score = 0;
    const breakdown: ScoreBreakdown = {
      agrement: 0,
      carteRose: 0,
      driverPassport: 0,
      incidentHistory: 0,
      badgePortuaire: 0,
      corridorExperience: 0,
    };

    // --- Exclusions dures ---

    const assuranceCemac = docs.find(
      (d) => d.doc_type === 'assurance_cemac' && d.is_valid,
    );
    if (!assuranceCemac || assuranceCemac.expiry_date <= now) {
      exclusions.push('Assurance CEMAC expirée ou absente');
    }

    const visiteTechnique = docs.find(
      (d) => d.doc_type === 'visite_technique' && d.is_valid,
    );
    if (!visiteTechnique || visiteTechnique.expiry_date <= now) {
      exclusions.push('Visite technique expirée ou absente');
    }

    if (criticalIncidentSet.has(vehicle.id)) {
      exclusions.push('Incident critique non résolu sur 12 mois');
    }

    // Statut "maintenance" ou "incident" déjà filtré en SQL,
    // mais on double-vérifie pour la transparence
    if (vehicle.status === 'maintenance' || vehicle.status === 'incident') {
      exclusions.push(`Véhicule en statut ${vehicle.status}`);
    }

    if (exclusions.length > 0) {
      results.push({
        vehicleId: vehicle.id,
        plateNumber: vehicle.plate_number,
        score: EXCLUSION_SCORE,
        category: vehicle.category,
        payloadTons: parseFloat(vehicle.payload_tons),
        volumeM3: vehicle.volume_m3 ? parseFloat(vehicle.volume_m3) : null,
        breakdown,
        exclusions,
        isEligible: false,
      });
      continue;
    }

    // --- Points positifs ---

    if (agrementSet.has(vehicle.id)) {
      score += SCORE.AGREMENT_PAYS;
      breakdown.agrement = SCORE.AGREMENT_PAYS;
    }

    const carteRose = docs.find((d) => d.doc_type === 'carte_rose' && d.is_valid);
    if (carteRose && carteRose.expiry_date > in30Days) {
      score += SCORE.CARTE_ROSE_VALID;
      breakdown.carteRose = SCORE.CARTE_ROSE_VALID;
    } else if (carteRose && carteRose.expiry_date > now) {
      // Expire dans moins de 30 jours → demi-points
      score += Math.floor(SCORE.CARTE_ROSE_VALID / 2);
      breakdown.carteRose = Math.floor(SCORE.CARTE_ROSE_VALID / 2);
    }

    // Driver passport : requiert la jointure driver (non disponible ici —
    // le dispatcher doit avoir assigné un chauffeur pour ce critère)
    // On le calcule séparément si un driverId est fourni
    breakdown.driverPassport = 0; // calculé dans scoreVehicleWithDriver()

    if (!criticalIncidentSet.has(vehicle.id)) {
      score += SCORE.NO_CRITICAL_INCIDENT;
      breakdown.incidentHistory = SCORE.NO_CRITICAL_INCIDENT;
    }

    if (badgeSet.has(vehicle.id)) {
      score += SCORE.BADGE_PORTUAIRE;
      breakdown.badgePortuaire = SCORE.BADGE_PORTUAIRE;
    }

    if (corridorExpSet.has(vehicle.id)) {
      score += SCORE.CORRIDOR_EXPERIENCE;
      breakdown.corridorExperience = SCORE.CORRIDOR_EXPERIENCE;
    }

    results.push({
      vehicleId: vehicle.id,
      plateNumber: vehicle.plate_number,
      score,
      category: vehicle.category,
      payloadTons: parseFloat(vehicle.payload_tons),
      volumeM3: vehicle.volume_m3 ? parseFloat(vehicle.volume_m3) : null,
      breakdown,
      exclusions: [],
      isEligible: true,
    });
  }

  // Trier : éligibles en tête, puis par score décroissant
  return results.sort((a, b) => {
    if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
    return b.score - a.score;
  });
}

/**
 * Affine le score avec un chauffeur spécifique (critère passeport +6 mois)
 */
export async function addDriverScore(
  vehicleScore: VehicleScore,
  driverId: string,
  destinationCountryId: string,
): Promise<VehicleScore> {
  const result = await db.query<{
    passport_expiry: string | null;
    has_critical_incident: boolean;
  }>(
    `SELECT
       d.passport_expiry,
       EXISTS (
         SELECT 1 FROM incidents i
         JOIN trips t ON t.id = i.trip_id
         WHERE t.driver_id = d.id
           AND i.severity = 'critical'
           AND i.is_resolved = FALSE
           AND i.reported_at > NOW() - INTERVAL '12 months'
       ) AS has_critical_incident
     FROM drivers d
     WHERE d.id = $1`,
    [driverId],
  );

  if (result.rows.length === 0) return vehicleScore;

  const driver = result.rows[0];

  // Exclusion si incident critique chauffeur
  if (driver.has_critical_incident) {
    return {
      ...vehicleScore,
      score: EXCLUSION_SCORE,
      isEligible: false,
      exclusions: [...vehicleScore.exclusions, 'Chauffeur avec incident critique non résolu'],
    };
  }

  // Passeport valide +6 mois pour le pays de destination
  let driverPassportScore = 0;
  if (driver.passport_expiry) {
    const expiry = new Date(driver.passport_expiry);
    const in6Months = new Date(Date.now() + 183 * 24 * 3600 * 1000);
    if (expiry > in6Months) {
      driverPassportScore = SCORE.DRIVER_PASSPORT;
    }
  }

  // Vérifier aussi que le chauffeur a un visa/document pour ce pays si requis
  const visaResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM driver_documents
     WHERE driver_id = $1
       AND country_id = $2
       AND is_valid = TRUE
       AND (expiry_date IS NULL OR expiry_date > NOW())`,
    [driverId, destinationCountryId],
  );

  const hasVisa = parseInt(visaResult.rows[0].count) > 0;
  if (!hasVisa) {
    driverPassportScore = Math.floor(driverPassportScore * 0.5); // Malus si pas de visa
  }

  const newScore = vehicleScore.isEligible
    ? vehicleScore.score + driverPassportScore
    : vehicleScore.score;

  return {
    ...vehicleScore,
    score: newScore,
    breakdown: {
      ...vehicleScore.breakdown,
      driverPassport: driverPassportScore,
    },
  };
}
