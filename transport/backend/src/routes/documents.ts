import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { UploadDocumentRequest, TripDocType } from '../types/index.js';
import { requireRole } from '../middleware/auth.js';
import { ocrQueue } from '../workers/queues.js';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/documents/upload — Upload document + déclenche OCR async
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /api/documents/upload:
 *   post:
 *     summary: Uploader un document de transit (déclenche OCR asynchrone)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tripId, docType, fileUrl]
 *             properties:
 *               tripId:    { type: string, format: uuid }
 *               docType:   { type: string, enum: [lettre_voiture, manifeste, declaration_douane, t1, bon_livraison] }
 *               fileUrl:   { type: string, description: URL S3/Firebase du document }
 *               fileSizeBytes: { type: integer }
 *               mimeType:  { type: string }
 */
router.post(
  '/upload',
  requireRole(['driver', 'super_admin', 'dispatcher', 'doc_agent']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as UploadDocumentRequest;

      if (!body.tripId || !body.docType || !body.fileUrl) {
        return res.status(400).json({
          error: 'Champs requis : tripId, docType, fileUrl',
        });
      }

      if (!Object.values(TripDocType).includes(body.docType)) {
        return res.status(400).json({
          error: `docType invalide. Valeurs : ${Object.values(TripDocType).join(', ')}`,
        });
      }

      // Vérifier que le voyage existe
      const tripCheck = await db.query<{ id: string; status: string }>(
        `SELECT id, status FROM trips WHERE id = $1`,
        [body.tripId],
      );

      if (tripCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Voyage introuvable' });
      }

      // Insérer le document (non encore validé, OCR pending)
      const result = await db.query<{ id: string }>(
        `INSERT INTO trip_documents
           (trip_id, doc_type, file_url, file_size_bytes, mime_type,
            is_validated)
         VALUES ($1, $2, $3, $4, $5, FALSE)
         RETURNING id`,
        [
          body.tripId,
          body.docType,
          body.fileUrl,
          body.fileSizeBytes ?? null,
          body.mimeType ?? null,
        ],
      );

      const documentId = result.rows[0].id;

      // Enqueuer le job OCR (asynchrone — BullMQ)
      const ocrJob = await ocrQueue.add(
        'process-document',
        {
          documentId,
          tripId: body.tripId,
          fileUrl: body.fileUrl,
          docType: body.docType,
          mimeType: body.mimeType ?? null,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
        },
      );

      return res.status(202).json({
        documentId,
        jobId: ocrJob.id,
        status: 'processing',
        message: 'Document reçu. OCR en cours de traitement.',
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/documents/:id — Statut et données d'un document
// ---------------------------------------------------------------------------

router.get(
  '/:id',
  requireRole(['super_admin', 'dispatcher', 'doc_agent', 'driver']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db.query(
        `SELECT
           td.*,
           u.full_name AS validated_by_name
         FROM trip_documents td
         LEFT JOIN users u ON u.id = td.validated_by
         WHERE td.id = $1`,
        [req.params.id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Document introuvable' });
      }

      return res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/documents/trip/:tripId — Tous les documents d'un voyage
// ---------------------------------------------------------------------------

router.get(
  '/trip/:tripId',
  requireRole(['super_admin', 'dispatcher', 'doc_agent', 'driver', 'client']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db.query(
        `SELECT
           id, doc_type, file_url, mime_type,
           ocr_confidence, is_validated, uploaded_at, validated_at,
           validation_note,
           CASE WHEN is_validated THEN 'validated'
                WHEN ocr_confidence IS NULL THEN 'pending_ocr'
                WHEN ocr_confidence >= 0.85 THEN 'auto_validated'
                ELSE 'needs_review'
           END AS review_status
         FROM trip_documents
         WHERE trip_id = $1
         ORDER BY uploaded_at DESC`,
        [req.params.tripId],
      );

      return res.json(result.rows);
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/documents/:id/validate — Validation manuelle par agent
// ---------------------------------------------------------------------------

router.patch(
  '/:id/validate',
  requireRole(['super_admin', 'doc_agent']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { isValidated, validationNote, corrections } = req.body as {
        isValidated: boolean;
        validationNote?: string;
        corrections?: Record<string, unknown>;
      };

      if (typeof isValidated !== 'boolean') {
        return res.status(400).json({ error: 'isValidated (boolean) requis' });
      }

      // Si des corrections OCR sont fournies, fusionner avec ocr_parsed
      const correctionUpdate = corrections
        ? `, ocr_parsed = ocr_parsed || $4::jsonb`
        : '';

      const params: unknown[] = [
        req.params.id,
        isValidated,
        validationNote ?? null,
        ...(corrections ? [JSON.stringify(corrections)] : []),
      ];

      const result = await db.query(
        `UPDATE trip_documents
         SET is_validated = $2,
             validation_note = $3,
             validated_by = '${(req as any).user?.sub}',
             validated_at = CASE WHEN $2 = TRUE THEN NOW() ELSE NULL END
             ${correctionUpdate}
         WHERE id = $1
         RETURNING id, is_validated`,
        params,
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Document introuvable' });
      }

      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, 'VALIDATE_DOCUMENT', 'trip_documents', $2, $3)`,
        [
          (req as any).user?.sub,
          req.params.id,
          JSON.stringify({ isValidated, validationNote }),
        ],
      );

      return res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/documents/queue — File d'attente des documents à valider
// ---------------------------------------------------------------------------

router.get(
  '/queue/pending',
  requireRole(['super_admin', 'doc_agent']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db.query(
        `SELECT
           td.id, td.doc_type, td.file_url, td.ocr_confidence,
           td.uploaded_at, td.mime_type,
           t.reference AS trip_reference,
           t.id AS trip_id
         FROM trip_documents td
         JOIN trips t ON t.id = td.trip_id
         WHERE td.is_validated = FALSE
           AND td.ocr_confidence IS NOT NULL
           AND td.ocr_confidence < 0.85
         ORDER BY td.uploaded_at ASC
         LIMIT 50`,
      );

      return res.json({
        queue: result.rows,
        total: result.rows.length,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
