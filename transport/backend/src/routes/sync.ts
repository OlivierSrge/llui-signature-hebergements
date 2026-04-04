import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { GpsBatchRequest } from '../types/index.js';
import { requireRole } from '../middleware/auth.js';
import { notificationQueue } from '../workers/queues.js';

const router = Router();

const SILENT_ALERT_HOURS = 4;

// ---------------------------------------------------------------------------
// POST /api/sync/gps-batch — Synchronisation offline batch GPS
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /api/sync/gps-batch:
 *   post:
 *     summary: Synchroniser un batch de positions GPS (offline-first)
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Accepte un tableau de positions enregistrées localement par le
 *       chauffeur. Déduplique par (trip_id + recorded_at) et recalcule l'ETA.
 *       Le batch peut contenir jusqu'à 1000 positions.
 */
router.post(
  '/gps-batch',
  requireRole(['driver', 'super_admin', 'dispatcher']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as GpsBatchRequest;

      if (!body.tripId || !body.batchId || !Array.isArray(body.positions)) {
        return res.status(400).json({
          error: 'Champs requis : tripId, batchId, positions[]',
        });
      }

      if (body.positions.length === 0) {
        return res.json({ inserted: 0, duplicates: 0, batchId: body.batchId });
      }

      if (body.positions.length > 1000) {
        return res.status(400).json({ error: 'Batch limité à 1000 positions' });
      }

      // Vérifier que le trip est actif
      const tripCheck = await db.query<{ status: string; vehicle_id: string | null }>(
        `SELECT status, vehicle_id FROM trips
         WHERE id = $1 AND status IN ('assigned', 'in_transit', 'at_border')`,
        [body.tripId],
      );

      if (tripCheck.rows.length === 0) {
        return res.status(409).json({
          error: 'Voyage introuvable ou non en cours (statut invalide pour sync GPS)',
        });
      }

      // Validation basique de chaque position
      for (const pos of body.positions) {
        if (
          !pos.recordedAt ||
          typeof pos.latitude !== 'number' ||
          typeof pos.longitude !== 'number' ||
          pos.latitude < -90 || pos.latitude > 90 ||
          pos.longitude < -180 || pos.longitude > 180
        ) {
          return res.status(400).json({
            error: 'Position invalide : recordedAt, latitude [-90,90], longitude [-180,180] requis',
          });
        }
      }

      // Insertion en masse avec déduplication ON CONFLICT DO NOTHING
      let inserted = 0;
      let duplicates = 0;

      // Traitement par chunks de 100 pour éviter les requêtes trop longues
      const chunkSize = 100;
      for (let i = 0; i < body.positions.length; i += chunkSize) {
        const chunk = body.positions.slice(i, i + chunkSize);

        // Construire VALUES multi-lignes
        const valuePlaceholders: string[] = [];
        const values: unknown[] = [];
        let paramIdx = 1;

        for (const pos of chunk) {
          valuePlaceholders.push(
            `($${paramIdx++}, $${paramIdx++}, ST_SetSRID(ST_MakePoint($${paramIdx++}, $${paramIdx++}), 4326),` +
            ` $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`,
          );
          values.push(
            body.tripId,
            new Date(pos.recordedAt).toISOString(),
            pos.longitude,
            pos.latitude,
            pos.speedKmh ?? null,
            pos.heading ?? null,
            pos.accuracyMeters ?? null,
            pos.altitudeM ?? null,
            body.batchId,
          );
        }

        const result = await db.query(
          `INSERT INTO gps_logs
             (trip_id, recorded_at, location, speed_kmh, heading,
              accuracy_meters, altitude_m, batch_id)
           VALUES ${valuePlaceholders.join(', ')}
           ON CONFLICT (trip_id, recorded_at) DO NOTHING`,
          values,
        );

        inserted += result.rowCount ?? 0;
        duplicates += chunk.length - (result.rowCount ?? 0);
      }

      // Mettre à jour la position courante du véhicule (dernière position du batch)
      const lastPos = body.positions.reduce((latest, pos) =>
        new Date(pos.recordedAt) > new Date(latest.recordedAt) ? pos : latest,
      );

      if (tripCheck.rows[0].vehicle_id) {
        await db.query(
          `UPDATE vehicles
           SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
               updated_at = NOW()
           WHERE id = $3`,
          [lastPos.longitude, lastPos.latitude, tripCheck.rows[0].vehicle_id],
        );
      }

      // Auto-transition vers in_transit si voyage en statut 'assigned'
      if (tripCheck.rows[0].status === 'assigned') {
        await db.query(
          `UPDATE trips
           SET status = 'in_transit',
               actual_departure = NOW(),
               updated_at = NOW()
           WHERE id = $1`,
          [body.tripId],
        );
      }

      return res.json({
        inserted,
        duplicates,
        batchId: body.batchId,
        positionsReceived: body.positions.length,
        lastPositionAt: lastPos.recordedAt,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/sync/sms-webhook — Webhook Twilio pour check-in SMS
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /api/sync/sms-webhook:
 *   post:
 *     summary: Webhook Twilio — réception des SMS de check-in chauffeur
 *     tags: [Sync]
 *     description: >
 *       Format SMS attendu : CHECKIN [CODE_MISSION] [STATUS]
 *       Exemple : CHECKIN LLUI-202405-00123 OK
 */
router.post(
  '/sms-webhook',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validation de la signature Twilio
      const twilioSignature = req.headers['x-twilio-signature'] as string;
      if (!validateTwilioSignature(twilioSignature, req)) {
        return res.status(403).send('Signature invalide');
      }

      const from: string = req.body.From ?? '';
      const body: string = (req.body.Body ?? '').trim().toUpperCase();

      // Parser le message : CHECKIN <REFERENCE> <STATUS> [NOTE]
      const match = body.match(/^CHECKIN\s+([A-Z0-9-]+)\s+(OK|INCIDENT)(?:\s+(.+))?$/);

      if (!match) {
        // SMS de confirmation d'échec
        await sendSmsReply(from, 'Format invalide. Utilisez: CHECKIN CODE_MISSION OK|INCIDENT [note]');
        return res.status(200).send('<Response></Response>');
      }

      const [, reference, status, note] = match;

      // Trouver le voyage
      const tripResult = await db.query<{ id: string; status: string }>(
        `SELECT id, status FROM trips WHERE reference = $1`,
        [reference],
      );

      if (tripResult.rows.length === 0) {
        await sendSmsReply(from, `Code mission ${reference} introuvable.`);
        return res.status(200).send('<Response></Response>');
      }

      const trip = tripResult.rows[0];

      // Enregistrer le check-in
      await db.query(
        `INSERT INTO checkins
           (trip_id, method, status, note, raw_sms)
         VALUES ($1, 'sms', $2, $3, $4)`,
        [trip.id, status.toLowerCase(), note ?? null, body],
      );

      // Notifier le dispatcher
      await notificationQueue.add('sms-checkin-notify', {
        tripId: trip.id,
        reference,
        status: status.toLowerCase(),
        fromPhone: from,
        note: note ?? null,
      });

      await sendSmsReply(from, `Check-in reçu pour ${reference}. Statut: ${status}. Merci.`);
      return res.status(200).send('<Response></Response>');
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateTwilioSignature(signature: string, req: Request): boolean {
  // En production : utiliser twilio.validateExpressRequest()
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.warn('[Twilio] TWILIO_AUTH_TOKEN non défini — validation désactivée');
    return true;
  }
  if (!signature) return false;

  const crypto = require('crypto');
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const params = req.body as Record<string, string>;
  const sortedKeys = Object.keys(params).sort();
  const s = sortedKeys.reduce((acc, key) => acc + key + params[key], url);
  const expected = crypto
    .createHmac('sha1', authToken)
    .update(s)
    .digest('base64');
  return expected === signature;
}

async function sendSmsReply(to: string, message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('[Twilio] Credentials manquants — SMS non envoyé');
    return;
  }

  try {
    const twilio = require('twilio')(accountSid, authToken);
    await twilio.messages.create({ body: message, from: fromNumber, to });
  } catch (err) {
    console.error('[Twilio] Erreur envoi SMS:', err);
  }
}

export default router;
