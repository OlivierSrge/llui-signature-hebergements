import { Worker, Job } from 'bullmq';
import { db } from '../db/connection.js';
import { OcrJobData, ParsedOcrData, TripDocType } from '../types/index.js';
import { notificationQueue } from './queues.js';

const MINDEE_API_KEY = process.env.MINDEE_API_KEY ?? '';
const OCR_AUTO_VALIDATE_THRESHOLD = 0.85;

// =============================================================================
// Worker BullMQ — Traitement OCR des documents
// =============================================================================

const ocrWorker = new Worker<OcrJobData>(
  'ocr-processing',
  async (job: Job<OcrJobData>) => {
    const { documentId, tripId, fileUrl, docType, mimeType } = job.data;

    console.log(`[OCR] Traitement document ${documentId} (${docType})`);

    try {
      // ---- 1. Appel OCR (Mindee API) ----
      let ocrRaw: Record<string, unknown>;
      let ocrParsed: ParsedOcrData;
      let confidence: number;

      if (MINDEE_API_KEY) {
        const result = await callMindeeApi(fileUrl, docType, mimeType);
        ocrRaw = result.raw;
        ocrParsed = result.parsed;
        confidence = result.confidence;
      } else {
        // Mode développement : simulation OCR
        const mock = mockOcrResult(docType);
        ocrRaw = mock.raw;
        ocrParsed = mock.parsed;
        confidence = mock.confidence;
        console.warn('[OCR] MINDEE_API_KEY absent — résultat simulé');
      }

      // ---- 2. Auto-validation si confiance > seuil ----
      const autoValidated = confidence >= OCR_AUTO_VALIDATE_THRESHOLD;

      await db.query(
        `UPDATE trip_documents
         SET ocr_raw = $1,
             ocr_parsed = $2,
             ocr_confidence = $3,
             is_validated = $4,
             validated_at = CASE WHEN $4 = TRUE THEN NOW() ELSE NULL END
         WHERE id = $5`,
        [
          JSON.stringify(ocrRaw),
          JSON.stringify(ocrParsed),
          confidence,
          autoValidated,
          documentId,
        ],
      );

      // ---- 3. Récupérer infos voyage pour la notification ----
      const tripResult = await db.query<{
        reference: string;
        dispatcher_id: string | null;
      }>(
        `SELECT reference, dispatcher_id FROM trips WHERE id = $1`,
        [tripId],
      );

      const trip = tripResult.rows[0];

      // ---- 4. Notification dispatcher ----
      if (trip?.dispatcher_id) {
        const docLabel = getDocLabel(docType);
        const statusLabel = autoValidated
          ? 'validé automatiquement ✓'
          : 'à vérifier manuellement ⚠';

        await notificationQueue.add('document-ocr-complete', {
          userId: trip.dispatcher_id,
          tripId,
          title: `Document ${docLabel} — ${trip.reference}`,
          body: `OCR terminé (confiance ${Math.round(confidence * 100)}%) — ${statusLabel}`,
          data: {
            type: 'document_ocr',
            tripId,
            documentId,
            docType,
            autoValidated: String(autoValidated),
          },
          channel: 'push',
        });
      }

      // ---- 5. Si confiance < seuil → ajouter à la file agent ----
      if (!autoValidated) {
        console.log(
          `[OCR] Document ${documentId} — confiance ${confidence.toFixed(3)} < ${OCR_AUTO_VALIDATE_THRESHOLD} → file agent`,
        );
      }

      return { documentId, confidence, autoValidated };
    } catch (err: any) {
      console.error(`[OCR] Erreur traitement ${documentId}:`, err.message);

      // Marquer l'échec en base pour alerte
      await db.query(
        `UPDATE trip_documents
         SET ocr_raw = $1
         WHERE id = $2`,
        [JSON.stringify({ error: err.message, failedAt: new Date().toISOString() }), documentId],
      ).catch(() => {}); // Ne pas faire échouer le re-throw

      throw err; // BullMQ gérera le retry
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
    },
    concurrency: 3,
  },
);

ocrWorker.on('completed', (job) => {
  console.log(`[OCR] Job ${job.id} terminé — document ${job.data.documentId}`);
});

ocrWorker.on('failed', (job, err) => {
  console.error(`[OCR] Job ${job?.id} échoué (tentative ${job?.attemptsMade}):`, err.message);
});

// =============================================================================
// Appel Mindee API
// =============================================================================

async function callMindeeApi(
  fileUrl: string,
  docType: TripDocType,
  mimeType: string | null,
): Promise<{ raw: Record<string, unknown>; parsed: ParsedOcrData; confidence: number }> {
  const { default: Mindee } = await import('mindee');
  const mindeeClient = new Mindee.Client({ apiKey: MINDEE_API_KEY });

  // Sélectionner le product Mindee selon le type de document
  const productMap: Partial<Record<TripDocType, string>> = {
    [TripDocType.T1]:                'international_shipping_invoice',
    [TripDocType.DECLARATION_DOUANE]: 'customs_declaration',
    [TripDocType.MANIFESTE]:          'manifest',
    [TripDocType.LETTRE_VOITURE]:     'bill_of_lading',
  };

  const product = productMap[docType] ?? 'custom_document';

  // Récupérer le fichier depuis son URL
  const fileResponse = await fetch(fileUrl);
  if (!fileResponse.ok) {
    throw new Error(`Impossible de récupérer le fichier : ${fileUrl} (${fileResponse.status})`);
  }

  const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
  const inputSource = mindeeClient.docFromBytes(fileBuffer, 'document.pdf');

  // Appel API selon le product disponible
  let response: any;

  if (product === 'customs_declaration') {
    response = await mindeeClient.enqueueAndParse(
      Mindee.product.CustomsDeclarationV1,
      inputSource,
    );
  } else {
    // Fallback : OCR générique
    response = await mindeeClient.enqueueAndParse(
      Mindee.product.InternationalShippingInvoiceV1,
      inputSource,
    );
  }

  const rawResponse = response.document?.inference ?? response;
  const confidence = extractGlobalConfidence(rawResponse);
  const parsed = parseMindeePrediction(rawResponse, docType);

  return { raw: rawResponse as Record<string, unknown>, parsed, confidence };
}

function extractGlobalConfidence(inference: any): number {
  if (!inference) return 0;
  const pages = inference.pages ?? [];
  if (pages.length === 0) return inference.prediction?.confidence ?? 0;

  const avg =
    pages.reduce((sum: number, p: any) => sum + (p.prediction?.confidence ?? 0), 0) /
    pages.length;
  return Math.min(1, Math.max(0, avg));
}

function parseMindeePrediction(inference: any, docType: TripDocType): ParsedOcrData {
  const prediction = inference?.prediction ?? {};
  const fields: Record<string, { value: string | number | null; confidence: number }> = {};

  // Extraction générique des champs Mindee
  for (const [key, val] of Object.entries(prediction)) {
    if (val && typeof val === 'object' && 'value' in (val as any)) {
      fields[key] = {
        value: (val as any).value ?? null,
        confidence: (val as any).confidence ?? 0,
      };
    }
  }

  return {
    documentType: docType,
    fields,
    confidence: extractGlobalConfidence(inference),
    rawText: inference?.rawText ?? undefined,
  };
}

// =============================================================================
// Simulation OCR (développement / tests)
// =============================================================================

function mockOcrResult(docType: TripDocType): {
  raw: Record<string, unknown>;
  parsed: ParsedOcrData;
  confidence: number;
} {
  const confidence = 0.78 + Math.random() * 0.2; // 0.78 à 0.98

  const mockFields: Record<string, { value: string; confidence: number }> = {
    document_number: { value: `DOC-${Date.now()}`, confidence: 0.95 },
    issue_date:      { value: new Date().toISOString().slice(0, 10), confidence: 0.90 },
    issuing_country: { value: 'Cameroun', confidence: 0.88 },
    gross_weight:    { value: '28.5 T', confidence: 0.82 },
    cargo_origin:    { value: 'Port Autonome de Douala', confidence: 0.75 },
  };

  return {
    raw: { mock: true, docType, generatedAt: new Date().toISOString() },
    parsed: {
      documentType: docType,
      fields: mockFields,
      confidence,
    },
    confidence,
  };
}

function getDocLabel(docType: TripDocType): string {
  const labels: Record<TripDocType, string> = {
    [TripDocType.LETTRE_VOITURE]:    'Lettre de voiture',
    [TripDocType.MANIFESTE]:          'Manifeste',
    [TripDocType.DECLARATION_DOUANE]: 'Déclaration en douane',
    [TripDocType.T1]:                 'Document T1',
    [TripDocType.BON_LIVRAISON]:      'Bon de livraison',
  };
  return labels[docType] ?? docType;
}

export default ocrWorker;
