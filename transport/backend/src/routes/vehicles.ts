import { Router, Request, Response, NextFunction } from 'express';
import { scoreVehicles, addDriverScore } from '../services/vehicleAllocation.js';
import { VehicleAvailabilityRequest } from '../types/index.js';
import { requireRole } from '../middleware/auth.js';
import { db } from '../db/connection.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/vehicles/available — Liste scorée des véhicules disponibles
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /api/vehicles/available:
 *   get:
 *     summary: Véhicules disponibles avec scoring d'allocation
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: destinationCountryId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: cargoWeightTons
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: cargoVolumeM3
 *         schema: { type: number }
 *       - in: query
 *         name: corridorId
 *         schema: { type: string }
 *       - in: query
 *         name: driverId
 *         schema: { type: string }
 *         description: Affiner le score avec un chauffeur spécifique
 */
router.get(
  '/available',
  requireRole(['super_admin', 'dispatcher']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        destinationCountryId,
        cargoWeightTons,
        cargoVolumeM3,
        corridorId,
        driverId,
      } = req.query as Record<string, string>;

      if (!destinationCountryId || !cargoWeightTons) {
        return res.status(400).json({
          error: 'Paramètres requis : destinationCountryId, cargoWeightTons',
        });
      }

      const request: VehicleAvailabilityRequest = {
        destinationCountryId,
        cargoWeightTons: parseFloat(cargoWeightTons),
        cargoVolumeM3: cargoVolumeM3 ? parseFloat(cargoVolumeM3) : undefined,
        corridorId: corridorId || undefined,
      };

      let scores = await scoreVehicles(request);

      // Affiner avec le chauffeur si fourni
      if (driverId) {
        scores = await Promise.all(
          scores.map((s) => addDriverScore(s, driverId, destinationCountryId)),
        );
        // Retrier après ajout du score chauffeur
        scores.sort((a, b) => {
          if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
          return b.score - a.score;
        });
      }

      return res.json({
        eligible: scores.filter((s) => s.isEligible),
        ineligible: scores.filter((s) => !s.isEligible),
        total: scores.length,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/vehicles/:id — Détail d'un véhicule avec compliance
// ---------------------------------------------------------------------------

router.get(
  '/:id',
  requireRole(['super_admin', 'dispatcher']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db.query(
        `SELECT
           v.*,
           ST_AsGeoJSON(v.current_location)::json AS current_location_geojson,
           vcs.has_valid_assurance_cemac,
           vcs.assurance_cemac_expiry,
           vcs.has_valid_visite_technique,
           vcs.visite_technique_expiry,
           vcs.has_valid_carte_rose,
           vcs.carte_rose_expiry
         FROM vehicles v
         LEFT JOIN vehicle_compliance_status vcs ON vcs.id = v.id
         WHERE v.id = $1`,
        [req.params.id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Véhicule introuvable' });
      }

      return res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
