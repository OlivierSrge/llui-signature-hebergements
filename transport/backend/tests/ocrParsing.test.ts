import { describe, it, expect } from 'vitest';
import { TripDocType } from '../src/types/index.js';

// ---------------------------------------------------------------------------
// Tests sur la logique de parsing OCR (sans appel réseau)
// Les fonctions testées reproduisent la logique interne du worker
// ---------------------------------------------------------------------------

function extractGlobalConfidence(inference: Record<string, any>): number {
  if (!inference) return 0;
  const pages = inference.pages ?? [];
  if (pages.length === 0) return inference.prediction?.confidence ?? 0;
  const avg =
    pages.reduce((sum: number, p: any) => sum + (p.prediction?.confidence ?? 0), 0) /
    pages.length;
  return Math.min(1, Math.max(0, avg));
}

function parseMindeePrediction(
  inference: Record<string, any>,
  docType: TripDocType,
): Record<string, any> {
  const prediction = inference?.prediction ?? {};
  const fields: Record<string, any> = {};

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
  };
}

function shouldAutoValidate(confidence: number): boolean {
  return confidence >= 0.85;
}

// ---------------------------------------------------------------------------

describe('OCR — extractGlobalConfidence', () => {
  it('retourne 0 si inference est vide', () => {
    expect(extractGlobalConfidence({})).toBe(0);
  });

  it('utilise la confiance du prediction si pas de pages', () => {
    const inference = { prediction: { confidence: 0.92 } };
    expect(extractGlobalConfidence(inference)).toBe(0.92);
  });

  it('calcule la moyenne des confiances sur plusieurs pages', () => {
    const inference = {
      pages: [
        { prediction: { confidence: 0.90 } },
        { prediction: { confidence: 0.80 } },
      ],
    };
    expect(extractGlobalConfidence(inference)).toBeCloseTo(0.85, 5);
  });

  it('clamp à 1.0 maximum', () => {
    const inference = { pages: [{ prediction: { confidence: 1.5 } }] };
    expect(extractGlobalConfidence(inference)).toBe(1.0);
  });

  it('clamp à 0.0 minimum', () => {
    const inference = { pages: [{ prediction: { confidence: -0.1 } }] };
    expect(extractGlobalConfidence(inference)).toBe(0.0);
  });
});

describe('OCR — parseMindeePrediction', () => {
  it('extrait correctement les champs avec valeur et confiance', () => {
    const inference = {
      prediction: {
        document_number: { value: 'DOC-123456', confidence: 0.95 },
        issue_date:      { value: '2024-01-15',  confidence: 0.88 },
        gross_weight:    { value: '28.5 T',       confidence: 0.75 },
        _meta:           { internal: true },             // Champ sans .value → ignoré
      },
      confidence: 0.86,
    };

    const result = parseMindeePrediction(inference, TripDocType.T1);

    expect(result.documentType).toBe(TripDocType.T1);
    expect(result.fields.document_number.value).toBe('DOC-123456');
    expect(result.fields.document_number.confidence).toBe(0.95);
    expect(result.fields.issue_date.value).toBe('2024-01-15');
    expect(result.fields).not.toHaveProperty('_meta');
  });

  it('gère les champs avec value null', () => {
    const inference = {
      prediction: {
        optional_field: { value: null, confidence: 0.60 },
      },
    };

    const result = parseMindeePrediction(inference, TripDocType.DECLARATION_DOUANE);
    expect(result.fields.optional_field.value).toBeNull();
    expect(result.fields.optional_field.confidence).toBe(0.60);
  });

  it('retourne des champs vides si prediction est absent', () => {
    const result = parseMindeePrediction({}, TripDocType.MANIFESTE);
    expect(result.fields).toEqual({});
    expect(result.confidence).toBe(0);
  });
});

describe('OCR — Seuil de validation automatique', () => {
  it('valide automatiquement si confiance >= 0.85', () => {
    expect(shouldAutoValidate(0.85)).toBe(true);
    expect(shouldAutoValidate(0.90)).toBe(true);
    expect(shouldAutoValidate(1.00)).toBe(true);
  });

  it('envoie en file agent si confiance < 0.85', () => {
    expect(shouldAutoValidate(0.84)).toBe(false);
    expect(shouldAutoValidate(0.50)).toBe(false);
    expect(shouldAutoValidate(0.00)).toBe(false);
  });
});
