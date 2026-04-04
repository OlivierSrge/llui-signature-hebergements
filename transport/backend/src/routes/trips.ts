import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { calculateTripEstimate } from '../services/costCalculator.js';
import { getTripTracking } from '../services/etaCalculator.js';
import {
  CreateTripRequest,
  EstimateCostRequest,
  VehicleCategory,
  TripStatus,
} from '../types/index.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/trips/estimate — Calculateur de coût de transit
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /api/trips/estimate:
 *   post:
 *     summary: Calculer le coût estimé d'un transit
 *     tags: [Trips]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EstimateCostRequest'
 *     responses:
 *       200:
 *         description: Estimation détaillée du coût
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CostEstimateResponse'
 */
router.post(
  '/estimate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as EstimateCostRequest;

      // Validation minimale
      if (
        !body.corridorId ||
        !body.originCountryId ||
        !body.destinationCountryId ||
        !body.cargoWeightTons ||
        !body.cargoValueXaf ||
        !body.vehicleCategory
      ) {
        return res.status(400).json({
          error: 'Champs requis : corridorId, originCountryId, destinationCountryId, cargoWeightTons, cargoValueXaf, vehicleCategory',
        });
      }

      if (!Object.values(VehicleCategory).includes(body.vehicleCategory)) {
        return res.status(400).json({
          error: `vehicleCategory invalide. Valeurs acceptées : ${Object.values(VehicleCategory).join(', ')}`,
        });
      }

      const estimate = await calculateTripEstimate(body);

      // Persister l'estimation si un tripId est fourni
      if (body.tripId) {
        await db.query(
          `INSERT INTO transit_cost_estimates
             (trip_id, breakdown, total_xaf, total_usd, total_eur,
              exchange_rate_used, operator_margin_pct, valid_until)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            body.tripId,
            JSON.stringify(estimate.breakdown),
            estimate.totalXaf,
            estimate.totalUsd,
            estimate.totalEur,
            JSON.stringify(estimate.exchangeRatesUsed),
            parseFloat(process.env.OPERATOR_MARGIN_PCT ?? '12'),
            estimate.validUntil,
          ],
        );
      }

      return res.json(estimate);
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/trips — Créer une mission de transport
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /api/trips:
 *   post:
 *     summary: Créer une nouvelle mission de transport
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  requireRole(['super_admin', 'dispatcher']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as CreateTripRequest;

      // Validation
      const required = [
        'originCountryId',
        'destinationCountryId',
        'corridorId',
        'cargoDescription',
        'cargoWeightTons',
        'cargoValueXaf',
        'plannedDeparture',
      ] as const;

      for (const field of required) {
        if (body[field] === undefined || body[field] === null || body[field] === '') {
          return res.status(400).json({ error: `Champ requis manquant : ${field}` });
        }
      }

      // Vérifier existence du corridor
      const corridorCheck = await db.query(
        `SELECT id FROM corridors
         WHERE id = $1
           AND origin_country_id = $2
           AND destination_country_id = $3
           AND is_active = TRUE`,
        [body.corridorId, body.originCountryId, body.destinationCountryId],
      );

      if (corridorCheck.rows.length === 0) {
        return res.status(400).json({
          error: 'Corridor invalide ou incompatible avec les pays sélectionnés',
        });
      }

      // Générer la référence
      const refResult = await db.query<{ ref: string }>(
        `SELECT generate_trip_reference() AS ref`,
      );
      const reference = refResult.rows[0].ref;

      // Construire le roadbook offline
      const roadbookJson = await buildRoadbook(
        body.corridorId,
        body.originCountryId,
        body.destinationCountryId,
      );

      const result = await db.query<{ id: string; reference: string }>(
        `INSERT INTO trips (
           reference, origin_country_id, destination_country_id, corridor_id,
           vehicle_id, driver_id, client_id, dispatcher_id,
           cargo_description, cargo_weight_tons, cargo_volume_m3, cargo_value_xaf,
           cargo_hazardous, status, planned_departure, roadbook_json, notes
         ) VALUES (
           $1, $2, $3, $4,
           $5, $6, $7, $8,
           $9, $10, $11, $12,
           $13, 'draft', $14, $15, $16
         )
         RETURNING id, reference`,
        [
          reference,
          body.originCountryId,
          body.destinationCountryId,
          body.corridorId,
          body.vehicleId ?? null,
          body.driverId ?? null,
          body.clientId ?? null,
          (req as any).user?.sub ?? null,
          body.cargoDescription,
          body.cargoWeightTons,
          body.cargoVolumeM3 ?? null,
          body.cargoValueXaf,
          body.cargoHazardous ?? false,
          new Date(body.plannedDeparture).toISOString(),
          JSON.stringify(roadbookJson),
          body.notes ?? null,
        ],
      );

      const trip = result.rows[0];

      // Audit log
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, 'CREATE_TRIP', 'trips', $2, $3)`,
        [
          (req as any).user?.sub ?? null,
          trip.id,
          JSON.stringify({ reference, status: 'draft' }),
        ],
      );

      return res.status(201).json({
        id: trip.id,
        reference: trip.reference,
        status: TripStatus.DRAFT,
        roadbookUrl: `/api/trips/${trip.id}/roadbook`,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/trips/:id/tracking — Suivi en temps réel
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /api/trips/{id}/tracking:
 *   get:
 *     summary: Suivi temps réel d'un voyage (position + ETA)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:id/tracking',
  requireRole(['super_admin', 'dispatcher', 'client', 'driver']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Vérifier que le client n'accède qu'à ses propres voyages
      const user = (req as any).user;
      if (user?.role === 'client') {
        const check = await db.query(
          `SELECT id FROM trips WHERE id = $1 AND client_id = (
             SELECT id FROM clients WHERE user_id = $2
           )`,
          [id, user.sub],
        );
        if (check.rows.length === 0) {
          return res.status(403).json({ error: 'Accès refusé' });
        }
      }

      const tracking = await getTripTracking(id);
      return res.json(tracking);
    } catch (err: any) {
      if (err.message?.includes('introuvable')) {
        return res.status(404).json({ error: err.message });
      }
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/trips/:id/roadbook — Données offline pour le chauffeur
// ---------------------------------------------------------------------------

router.get(
  '/:id/roadbook',
  requireRole(['super_admin', 'dispatcher', 'driver']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await db.query<{ roadbook_json: unknown; reference: string }>(
        `SELECT roadbook_json, reference FROM trips WHERE id = $1`,
        [id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Voyage introuvable' });
      }

      return res.json(result.rows[0].roadbook_json);
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/trips/:id/status — Mise à jour du statut
// ---------------------------------------------------------------------------

router.patch(
  '/:id/status',
  requireRole(['super_admin', 'dispatcher', 'driver']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body as { status: TripStatus };

      const validStatuses = Object.values(TripStatus);
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Statut invalide. Valeurs : ${validStatuses.join(', ')}` });
      }

      // Transitions autorisées
      const transitions: Record<TripStatus, TripStatus[]> = {
        [TripStatus.DRAFT]:      [TripStatus.ASSIGNED, TripStatus.CANCELLED],
        [TripStatus.ASSIGNED]:   [TripStatus.IN_TRANSIT, TripStatus.DRAFT, TripStatus.CANCELLED],
        [TripStatus.IN_TRANSIT]: [TripStatus.AT_BORDER, TripStatus.DELIVERED, TripStatus.INCIDENT],
        [TripStatus.AT_BORDER]:  [TripStatus.IN_TRANSIT, TripStatus.DELIVERED, TripStatus.INCIDENT],
        [TripStatus.DELIVERED]:  [],
        [TripStatus.INCIDENT]:   [TripStatus.IN_TRANSIT, TripStatus.CANCELLED],
        [TripStatus.CANCELLED]:  [],
      };

      const currentResult = await db.query<{ status: TripStatus }>(
        `SELECT status FROM trips WHERE id = $1`,
        [id],
      );

      if (currentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Voyage introuvable' });
      }

      const currentStatus = currentResult.rows[0].status;
      if (!transitions[currentStatus].includes(status)) {
        return res.status(409).json({
          error: `Transition ${currentStatus} → ${status} non autorisée`,
        });
      }

      const extraFields: string[] = [];
      const extraValues: unknown[] = [];

      if (status === TripStatus.IN_TRANSIT && currentStatus === TripStatus.ASSIGNED) {
        extraFields.push(`actual_departure = NOW()`);
      }
      if (status === TripStatus.DELIVERED) {
        extraFields.push(`actual_arrival = NOW()`);
      }

      const setClause = ['status = $2', ...extraFields].join(', ');

      await db.query(
        `UPDATE trips SET ${setClause}, updated_at = NOW() WHERE id = $1`,
        [id, status, ...extraValues],
      );

      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
         VALUES ($1, 'UPDATE_TRIP_STATUS', 'trips', $2, $3, $4)`,
        [
          (req as any).user?.sub,
          id,
          JSON.stringify({ status: currentStatus }),
          JSON.stringify({ status }),
        ],
      );

      return res.json({ id, status });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Helper : construction du roadbook offline
// ---------------------------------------------------------------------------

async function buildRoadbook(
  corridorId: string,
  originCountryId: string,
  destinationCountryId: string,
): Promise<unknown> {
  const [corridorResult, checkpointsResult, bordersResult, countriesResult] =
    await Promise.all([
      db.query(
        `SELECT c.*, oc.name AS origin_name, dc.name AS destination_name
         FROM corridors c
         JOIN countries oc ON oc.id = c.origin_country_id
         JOIN countries dc ON dc.id = c.destination_country_id
         WHERE c.id = $1`,
        [corridorId],
      ),
      db.query(
        `SELECT id, name, km_from_origin, type,
                ST_X(location::geometry) AS lng,
                ST_Y(location::geometry) AS lat
         FROM checkpoints WHERE corridor_id = $1 AND is_active = TRUE
         ORDER BY km_from_origin`,
        [corridorId],
      ),
      db.query(
        `SELECT bc.id, bc.name, bc.opening_hours, bc.avg_waiting_time_hours,
                bc.required_documents,
                ST_X(bc.location::geometry) AS lng,
                ST_Y(bc.location::geometry) AS lat
         FROM border_crossings bc
         WHERE bc.corridor_id = $1 AND bc.is_active = TRUE`,
        [corridorId],
      ),
    ]);

  const corridor = corridorResult.rows[0];
  if (!corridor) return null;

  return {
    corridorCode: corridor.code,
    corridorName: corridor.name,
    originCountry: corridor.origin_name,
    destinationCountry: corridor.destination_name,
    totalDistanceKm: corridor.distance_km,
    estimatedDurationHours: corridor.estimated_hours,
    checkpoints: checkpointsResult.rows.map((cp) => ({
      id: cp.id,
      name: cp.name,
      kmFromOrigin: cp.km_from_origin,
      type: cp.type,
      latitude: cp.lat,
      longitude: cp.lng,
    })),
    borderCrossings: bordersResult.rows.map((bc) => ({
      id: bc.id,
      name: bc.name,
      openingHours: bc.opening_hours,
      avgWaitingTimeHours: bc.avg_waiting_time_hours,
      requiredDocuments: bc.required_documents,
      latitude: bc.lat,
      longitude: bc.lng,
    })),
    emergencyContacts: [
      { name: 'Dispatch L&Lui', phone: '+237233XXXXXX', role: 'dispatcher', country: 'CM' },
      { name: 'Urgence Douala',  phone: '+237117',       role: 'emergency',   country: 'CM' },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export default router;
