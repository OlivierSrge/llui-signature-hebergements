import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { CreateCheckinRequest, CheckinMethod, CheckinStatus } from '../types/index.js';
import { requireRole } from '../middleware/auth.js';
import { notificationQueue } from '../workers/queues.js';

const router = Router();

const AUTO_CHECKIN_DISTANCE_KM = 190; // Déclenche auto check-in tous les 190 km

// ---------------------------------------------------------------------------
// POST /api/checkins — Enregistrer un check-in chauffeur
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /api/checkins:
 *   post:
 *     summary: Enregistrer un check-in chauffeur (manuel ou automatique)
 *     tags: [Checkins]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  requireRole(['driver', 'super_admin', 'dispatcher']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as CreateCheckinRequest;

      if (!body.tripId || !body.method || !body.status) {
        return res.status(400).json({
          error: 'Champs requis : tripId, method, status',
        });
      }

      if (!Object.values(CheckinMethod).includes(body.method)) {
        return res.status(400).json({ error: `method invalide : ${Object.values(CheckinMethod).join(', ')}` });
      }

      if (!Object.values(CheckinStatus).includes(body.status)) {
        return res.status(400).json({ error: `status invalide : ${Object.values(CheckinStatus).join(', ')}` });
      }

      // Vérifier que le voyage est en cours
      const tripResult = await db.query<{
        id: string;
        status: string;
        reference: string;
        dispatcher_id: string | null;
      }>(
        `SELECT id, status, reference, dispatcher_id
         FROM trips WHERE id = $1`,
        [body.tripId],
      );

      if (tripResult.rows.length === 0) {
        return res.status(404).json({ error: 'Voyage introuvable' });
      }

      const trip = tripResult.rows[0];

      if (!['in_transit', 'at_border', 'assigned'].includes(trip.status)) {
        return res.status(409).json({
          error: `Check-in impossible : voyage en statut '${trip.status}'`,
        });
      }

      // Trouver le checkpoint le plus proche si coordonnées fournies
      let checkpointId: string | null = body.checkpointId ?? null;

      if (!checkpointId && body.latitude !== undefined && body.longitude !== undefined) {
        const nearestResult = await db.query<{ id: string; distance_m: number }>(
          `SELECT id,
                  ST_Distance(
                    location::geography,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                  ) AS distance_m
           FROM checkpoints
           WHERE corridor_id = (SELECT corridor_id FROM trips WHERE id = $3)
             AND is_active = TRUE
           ORDER BY distance_m
           LIMIT 1`,
          [body.longitude, body.latitude, body.tripId],
        );

        if (
          nearestResult.rows.length > 0 &&
          nearestResult.rows[0].distance_m < 5000  // Dans un rayon de 5 km
        ) {
          checkpointId = nearestResult.rows[0].id;
        }
      }

      const locationSql =
        body.latitude !== undefined && body.longitude !== undefined
          ? `ST_SetSRID(ST_MakePoint(${body.longitude}, ${body.latitude}), 4326)`
          : 'NULL';

      const result = await db.query<{ id: string }>(
        `INSERT INTO checkins
           (trip_id, checkpoint_id, location, method, km_traveled,
            status, note, photo_url)
         VALUES ($1, $2, ${locationSql}, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          body.tripId,
          checkpointId,
          body.method,
          body.kmTraveled ?? null,
          body.status,
          body.note ?? null,
          body.photoUrl ?? null,
        ],
      );

      const checkinId = result.rows[0].id;

      // Si incident → mettre à jour le statut du voyage et créer un incident
      if (body.status === CheckinStatus.INCIDENT) {
        await db.query(
          `UPDATE trips SET status = 'incident', updated_at = NOW() WHERE id = $1`,
          [body.tripId],
        );

        await db.query(
          `INSERT INTO incidents
             (trip_id, type, severity, description, reported_by)
           VALUES ($1, 'other', 'medium', $2, $3)`,
          [body.tripId, body.note ?? 'Incident signalé au check-in', (req as any).user?.sub],
        );
      }

      // Notifier le dispatcher
      if (trip.dispatcher_id) {
        await notificationQueue.add('checkin-notify', {
          userId: trip.dispatcher_id,
          tripId: body.tripId,
          reference: trip.reference,
          checkinId,
          status: body.status,
          method: body.method,
          kmTraveled: body.kmTraveled,
          note: body.note,
          channel: 'push',
        });
      }

      return res.status(201).json({
        id: checkinId,
        tripId: body.tripId,
        status: body.status,
        checkpointId,
        checkedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/checkins/trip/:tripId — Historique des check-ins d'un voyage
// ---------------------------------------------------------------------------

router.get(
  '/trip/:tripId',
  requireRole(['super_admin', 'dispatcher', 'client', 'driver']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db.query(
        `SELECT
           ci.id, ci.checked_at, ci.method, ci.status,
           ci.km_traveled, ci.note, ci.photo_url,
           cp.name AS checkpoint_name, cp.type AS checkpoint_type,
           cp.km_from_origin,
           ST_AsGeoJSON(ci.location)::json AS location
         FROM checkins ci
         LEFT JOIN checkpoints cp ON cp.id = ci.checkpoint_id
         WHERE ci.trip_id = $1
         ORDER BY ci.checked_at DESC`,
        [req.params.tripId],
      );

      return res.json(result.rows);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
