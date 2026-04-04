import { db } from '../db/connection.js';
import { TrackingResponse, GpsPosition, CheckinSummary } from '../types/index.js';

const SILENT_VEHICLE_THRESHOLD_HOURS = 4;
const AVG_SPEED_KMH = 60; // vitesse moyenne sur corridors africains

/**
 * Retourne le tracking complet d'un voyage avec ETA recalculé.
 */
export async function getTripTracking(tripId: string): Promise<TrackingResponse> {
  // ---- Données du voyage ----
  const tripResult = await db.query<{
    id: string;
    reference: string;
    status: string;
    corridor_id: string;
    estimated_arrival: string | null;
    actual_departure: string | null;
    distance_km: number;
  }>(
    `SELECT t.id, t.reference, t.status, t.corridor_id,
            t.estimated_arrival, t.actual_departure,
            c.distance_km
     FROM trips t
     JOIN corridors c ON c.id = t.corridor_id
     WHERE t.id = $1`,
    [tripId],
  );

  if (tripResult.rows.length === 0) {
    throw new Error(`Voyage ${tripId} introuvable`);
  }

  const trip = tripResult.rows[0];

  // ---- Position courante (dernière position GPS) ----
  const lastPositionResult = await db.query<{
    recorded_at: string;
    server_received_at: string;
    longitude: number;
    latitude: number;
    speed_kmh: number | null;
  }>(
    `SELECT
       recorded_at,
       server_received_at,
       ST_X(location::geometry) AS longitude,
       ST_Y(location::geometry) AS latitude,
       speed_kmh
     FROM gps_logs
     WHERE trip_id = $1
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [tripId],
  );

  // ---- 20 dernières positions pour la carte ----
  const recentPositionsResult = await db.query<{
    recorded_at: string;
    longitude: number;
    latitude: number;
    speed_kmh: number | null;
    heading: number | null;
    accuracy_meters: number | null;
    altitude_m: number | null;
  }>(
    `SELECT
       recorded_at,
       ST_X(location::geometry) AS longitude,
       ST_Y(location::geometry) AS latitude,
       speed_kmh, heading, accuracy_meters, altitude_m
     FROM gps_logs
     WHERE trip_id = $1
     ORDER BY recorded_at DESC
     LIMIT 20`,
    [tripId],
  );

  // ---- Checkins ----
  const checkinsResult = await db.query<{
    id: string;
    checked_at: string;
    checkpoint_name: string | null;
    km_traveled: number | null;
    status: string;
    method: string;
  }>(
    `SELECT
       ci.id, ci.checked_at,
       cp.name AS checkpoint_name,
       ci.km_traveled, ci.status, ci.method
     FROM checkins ci
     LEFT JOIN checkpoints cp ON cp.id = ci.checkpoint_id
     WHERE ci.trip_id = $1
     ORDER BY ci.checked_at DESC
     LIMIT 20`,
    [tripId],
  );

  // ---- Calcul ETA ----
  let estimatedArrival = trip.estimated_arrival;
  let etaRecalculatedAt: string | null = null;

  if (
    trip.actual_departure &&
    lastPositionResult.rows.length > 0 &&
    ['in_transit', 'at_border'].includes(trip.status)
  ) {
    const eta = recalculateEta(
      trip.actual_departure,
      lastPositionResult.rows[0].recorded_at,
      checkinsResult.rows,
      trip.distance_km,
    );
    if (eta) {
      estimatedArrival = eta.toISOString();
      etaRecalculatedAt = new Date().toISOString();
    }
  }

  // ---- Alerte véhicule silencieux ----
  let hoursSinceLastUpdate: number | null = null;
  let alertSilentVehicle = false;

  if (lastPositionResult.rows.length > 0) {
    const lastUpdate = new Date(lastPositionResult.rows[0].server_received_at);
    hoursSinceLastUpdate =
      (Date.now() - lastUpdate.getTime()) / (1000 * 3600);
    alertSilentVehicle =
      ['in_transit', 'at_border'].includes(trip.status) &&
      hoursSinceLastUpdate > SILENT_VEHICLE_THRESHOLD_HOURS;
  }

  // ---- Construction réponse ----
  const lastPos = lastPositionResult.rows[0];

  const recentPositions: GpsPosition[] = recentPositionsResult.rows.map((r) => ({
    recordedAt: r.recorded_at,
    latitude: r.latitude,
    longitude: r.longitude,
    speedKmh: r.speed_kmh ?? undefined,
    heading: r.heading ?? undefined,
    accuracyMeters: r.accuracy_meters ?? undefined,
    altitudeM: r.altitude_m ?? undefined,
  }));

  const checkins: CheckinSummary[] = checkinsResult.rows.map((r) => ({
    id: r.id,
    checkedAt: r.checked_at,
    checkpointName: r.checkpoint_name,
    kmTraveled: r.km_traveled ? Number(r.km_traveled) : null,
    status: r.status as CheckinSummary['status'],
    method: r.method as CheckinSummary['method'],
  }));

  return {
    tripId,
    reference: trip.reference,
    status: trip.status as TrackingResponse['status'],
    currentPosition: lastPos
      ? { type: 'Point', coordinates: [lastPos.longitude, lastPos.latitude] }
      : null,
    lastUpdateAt: lastPos ? lastPos.recorded_at : null,
    hoursSinceLastUpdate,
    estimatedArrival,
    etaRecalculatedAt,
    checkins,
    recentPositions,
    alertSilentVehicle,
  };
}

function recalculateEta(
  actualDeparture: string,
  lastPositionAt: string,
  checkins: { km_traveled: number | null }[],
  totalDistanceKm: number,
): Date | null {
  // Distance parcourue : utiliser le dernier checkin avec km
  const lastKmCheckin = checkins.find((c) => c.km_traveled !== null);
  const kmTraveled = lastKmCheckin?.km_traveled ?? 0;

  if (kmTraveled <= 0 || kmTraveled >= totalDistanceKm) return null;

  const remainingKm = totalDistanceKm - kmTraveled;
  const remainingHours = remainingKm / AVG_SPEED_KMH;

  const lastPosDate = new Date(lastPositionAt);
  return new Date(lastPosDate.getTime() + remainingHours * 3600 * 1000);
}
