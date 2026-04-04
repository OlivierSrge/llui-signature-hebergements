import { db } from '../db/connection.js';
import {
  EstimateCostRequest,
  CostEstimateResponse,
  CostBreakdown,
  SegmentCost,
  FeeLine,
  FeeType,
  VehicleCategory,
} from '../types/index.js';

// =============================================================================
// Configuration opérateur
// =============================================================================

const OPERATOR_MARGIN_PCT = parseFloat(process.env.OPERATOR_MARGIN_PCT ?? '12');
const INSURANCE_RATE_PCT  = parseFloat(process.env.INSURANCE_RATE_PCT  ?? '0.8'); // 0.8% valeur cargo
const ESTIMATE_TTL_HOURS  = 48;

// =============================================================================
// Calculateur principal
// =============================================================================

export async function calculateTripEstimate(
  req: EstimateCostRequest,
): Promise<CostEstimateResponse> {
  const {
    corridorId,
    cargoWeightTons,
    cargoValueXaf,
    vehicleCategory,
  } = req;

  // ---- 1. Récupérer le corridor et ses données ----
  const corridorResult = await db.query<{
    id: string;
    distance_km: number;
    estimated_hours: number;
  }>(
    `SELECT id, distance_km, estimated_hours FROM corridors WHERE id = $1 AND is_active = TRUE`,
    [corridorId],
  );

  if (corridorResult.rows.length === 0) {
    throw new Error(`Corridor ${corridorId} introuvable ou inactif`);
  }

  const corridor = corridorResult.rows[0];

  // ---- 2. Récupérer tous les postes frontières du corridor ----
  const bordersResult = await db.query<{
    id: string;
    name: string;
    avg_waiting_time_hours: number | null;
  }>(
    `SELECT id, name, avg_waiting_time_hours
     FROM border_crossings
     WHERE corridor_id = $1 AND is_active = TRUE
     ORDER BY name`,
    [corridorId],
  );

  const borderIds = bordersResult.rows.map((b) => b.id);

  if (borderIds.length === 0) {
    throw new Error(`Aucun poste frontière trouvé pour le corridor ${corridorId}`);
  }

  // ---- 3. Récupérer les fee_structures applicables ----
  const feesResult = await db.query<{
    border_crossing_id: string;
    fee_type: FeeType;
    description: string | null;
    amount: string;
    currency: string;
    vehicle_category: VehicleCategory | null;
    min_cargo_tons: string | null;
    max_cargo_tons: string | null;
    cargo_value_threshold_xaf: string | null;
  }>(
    `SELECT border_crossing_id, fee_type, description, amount, currency,
            vehicle_category, min_cargo_tons, max_cargo_tons,
            cargo_value_threshold_xaf
     FROM fee_structures
     WHERE border_crossing_id = ANY($1)
       AND is_active = TRUE
       AND valid_from <= CURRENT_DATE
       AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
       AND (vehicle_category IS NULL OR vehicle_category = $2)`,
    [borderIds, vehicleCategory],
  );

  // ---- 4. Récupérer les taux de change les plus récents ----
  const ratesResult = await db.query<{
    from_currency: string;
    to_currency: string;
    rate: string;
  }>(
    `SELECT DISTINCT ON (from_currency, to_currency)
       from_currency, to_currency, rate
     FROM exchange_rates
     ORDER BY from_currency, to_currency, recorded_at DESC`,
  );

  const exchangeRates: Record<string, number> = {};
  for (const row of ratesResult.rows) {
    exchangeRates[`${row.from_currency}_${row.to_currency}`] = parseFloat(row.rate);
  }

  // Taux fallback si absent de la base
  const xafToUsd = exchangeRates['XAF_USD'] ?? 1 / 606;
  const xafToEur = exchangeRates['XAF_EUR'] ?? 1 / 655.957;

  // ---- 5. Construire le breakdown par segment ----
  const feesByBorder = new Map<string, typeof feesResult.rows>();
  for (const fee of feesResult.rows) {
    const list = feesByBorder.get(fee.border_crossing_id) ?? [];
    list.push(fee);
    feesByBorder.set(fee.border_crossing_id, list);
  }

  const categoryTotals = {
    tolls: 0,
    taxes: 0,
    handling: 0,
    escort: 0,
    insurance: 0,
    margin: 0,
  };

  const segmentCosts: SegmentCost[] = [];
  let totalWaitingHours = 0;

  for (const border of bordersResult.rows) {
    const borderFees = feesByBorder.get(border.id) ?? [];
    const feeLines: FeeLine[] = [];
    let segmentSubtotalXaf = 0;

    for (const fee of borderFees) {
      const amountXaf = convertToXaf(
        parseFloat(fee.amount),
        fee.currency,
        exchangeRates,
      );

      // Escorte conditionnelle : uniquement si cargo_value_threshold_xaf est défini et dépassé
      if (
        fee.fee_type === FeeType.ESCORT &&
        fee.cargo_value_threshold_xaf !== null &&
        cargoValueXaf < parseFloat(fee.cargo_value_threshold_xaf)
      ) {
        continue; // Seuil non atteint
      }

      // Filtre par poids si applicable
      if (
        fee.min_cargo_tons !== null &&
        cargoWeightTons < parseFloat(fee.min_cargo_tons)
      ) {
        continue;
      }
      if (
        fee.max_cargo_tons !== null &&
        cargoWeightTons > parseFloat(fee.max_cargo_tons)
      ) {
        continue;
      }

      feeLines.push({
        feeType: fee.fee_type,
        description: fee.description ?? fee.fee_type,
        amountXaf,
      });

      segmentSubtotalXaf += amountXaf;

      switch (fee.fee_type) {
        case FeeType.TOLL:     categoryTotals.tolls    += amountXaf; break;
        case FeeType.TAX:      categoryTotals.taxes    += amountXaf; break;
        case FeeType.HANDLING: categoryTotals.handling += amountXaf; break;
        case FeeType.ESCORT:   categoryTotals.escort   += amountXaf; break;
      }
    }

    if (feeLines.length > 0) {
      segmentCosts.push({
        borderCrossingId: border.id,
        borderCrossingName: border.name,
        fees: feeLines,
        subtotalXaf: segmentSubtotalXaf,
      });
    }

    totalWaitingHours += border.avg_waiting_time_hours ?? 0;
  }

  // ---- 6. Assurance cargo ----
  const insuranceXaf = Math.round(cargoValueXaf * (INSURANCE_RATE_PCT / 100));
  categoryTotals.insurance = insuranceXaf;

  // ---- 7. Sous-total hors marge ----
  const subtotalBeforeMargin =
    categoryTotals.tolls +
    categoryTotals.taxes +
    categoryTotals.handling +
    categoryTotals.escort +
    categoryTotals.insurance;

  // ---- 8. Marge opérateur ----
  const marginXaf = Math.round(subtotalBeforeMargin * (OPERATOR_MARGIN_PCT / 100));
  categoryTotals.margin = marginXaf;

  const totalXaf = subtotalBeforeMargin + marginXaf;

  // ---- 9. Durée estimée (trajet + attentes aux frontières) ----
  const estimatedDurationHours = corridor.estimated_hours + Math.round(totalWaitingHours);

  // ---- 10. Construire la réponse ----
  const breakdown: CostBreakdown = {
    bySegment: segmentCosts,
    byCategory: categoryTotals,
  };

  const validUntil = new Date(Date.now() + ESTIMATE_TTL_HOURS * 3600 * 1000);

  return {
    breakdown,
    totalXaf,
    totalUsd: Math.round(totalXaf * xafToUsd * 100) / 100,
    totalEur: Math.round(totalXaf * xafToEur * 100) / 100,
    exchangeRatesUsed: {
      XAF_USD: xafToUsd,
      XAF_EUR: xafToEur,
    },
    estimatedDurationHours,
    validUntil: validUntil.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function convertToXaf(
  amount: number,
  currency: string,
  rates: Record<string, number>,
): number {
  if (currency === 'XAF') return Math.round(amount);

  const rateKey = `${currency}_XAF`;
  const rate = rates[rateKey];

  if (!rate) {
    // Fallback : on garde tel quel avec un warning
    console.warn(`[CostCalculator] Taux ${rateKey} absent — utilisation du montant brut`);
    return Math.round(amount);
  }

  return Math.round(amount * rate);
}
