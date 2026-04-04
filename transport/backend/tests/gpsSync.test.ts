import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Tests sur la logique de synchronisation GPS offline
// Ces fonctions reproduisent la logique pure du handler (sans Express)
// ---------------------------------------------------------------------------

interface GpsPosition {
  recordedAt: string;
  latitude: number;
  longitude: number;
  speedKmh?: number;
}

function validateGpsPosition(pos: GpsPosition): string | null {
  if (!pos.recordedAt) return 'recordedAt manquant';
  if (typeof pos.latitude !== 'number')  return 'latitude invalide';
  if (typeof pos.longitude !== 'number') return 'longitude invalide';
  if (pos.latitude < -90 || pos.latitude > 90)    return 'latitude hors plage [-90, 90]';
  if (pos.longitude < -180 || pos.longitude > 180) return 'longitude hors plage [-180, 180]';
  return null;
}

function getLastPosition(positions: GpsPosition[]): GpsPosition | null {
  if (positions.length === 0) return null;
  return positions.reduce((latest, pos) =>
    new Date(pos.recordedAt) > new Date(latest.recordedAt) ? pos : latest,
  );
}

function deduplicatePositions(positions: GpsPosition[]): GpsPosition[] {
  const seen = new Set<string>();
  return positions.filter((pos) => {
    const key = `${pos.recordedAt}-${pos.latitude}-${pos.longitude}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildValueChunks(positions: GpsPosition[], chunkSize: number): GpsPosition[][] {
  const chunks: GpsPosition[][] = [];
  for (let i = 0; i < positions.length; i += chunkSize) {
    chunks.push(positions.slice(i, i + chunkSize));
  }
  return chunks;
}

function isVehicleSilent(lastUpdateAt: Date | null, thresholdHours = 4): boolean {
  if (!lastUpdateAt) return true;
  const hoursSince = (Date.now() - lastUpdateAt.getTime()) / (1000 * 3600);
  return hoursSince > thresholdHours;
}

// ---------------------------------------------------------------------------

describe('GPS Sync — validateGpsPosition', () => {
  it('accepte une position valide', () => {
    expect(validateGpsPosition({
      recordedAt: '2024-01-15T10:30:00Z',
      latitude: 4.05,
      longitude: 9.71,
    })).toBeNull();
  });

  it('rejette si recordedAt est manquant', () => {
    expect(validateGpsPosition({
      recordedAt: '',
      latitude: 4.05,
      longitude: 9.71,
    })).not.toBeNull();
  });

  it('rejette les latitudes hors plage', () => {
    expect(validateGpsPosition({ recordedAt: 'T', latitude: 91,  longitude: 0 })).not.toBeNull();
    expect(validateGpsPosition({ recordedAt: 'T', latitude: -91, longitude: 0 })).not.toBeNull();
  });

  it('rejette les longitudes hors plage', () => {
    expect(validateGpsPosition({ recordedAt: 'T', latitude: 0, longitude: 181  })).not.toBeNull();
    expect(validateGpsPosition({ recordedAt: 'T', latitude: 0, longitude: -181 })).not.toBeNull();
  });

  it('accepte les coordonnées aux limites exactes', () => {
    expect(validateGpsPosition({ recordedAt: 'T', latitude: 90,   longitude: 180  })).toBeNull();
    expect(validateGpsPosition({ recordedAt: 'T', latitude: -90,  longitude: -180 })).toBeNull();
  });
});

describe('GPS Sync — getLastPosition', () => {
  it('retourne null pour un tableau vide', () => {
    expect(getLastPosition([])).toBeNull();
  });

  it('retourne la position la plus récente', () => {
    const positions: GpsPosition[] = [
      { recordedAt: '2024-01-15T08:00:00Z', latitude: 4.00, longitude: 9.70 },
      { recordedAt: '2024-01-15T10:30:00Z', latitude: 4.05, longitude: 9.71 },
      { recordedAt: '2024-01-15T09:00:00Z', latitude: 4.02, longitude: 9.705 },
    ];

    const last = getLastPosition(positions);
    expect(last?.recordedAt).toBe('2024-01-15T10:30:00Z');
    expect(last?.latitude).toBe(4.05);
  });

  it('retourne l\'unique position si tableau d\'un élément', () => {
    const pos: GpsPosition = { recordedAt: '2024-01-15T10:00:00Z', latitude: 5.0, longitude: 10.0 };
    expect(getLastPosition([pos])).toEqual(pos);
  });
});

describe('GPS Sync — deduplicatePositions', () => {
  it('supprime les doublons exacts', () => {
    const pos: GpsPosition = { recordedAt: '2024-01-15T10:00:00Z', latitude: 4.0, longitude: 9.7 };
    const result = deduplicatePositions([pos, pos, pos]);
    expect(result).toHaveLength(1);
  });

  it('conserve les positions avec des timestamps différents', () => {
    const positions: GpsPosition[] = [
      { recordedAt: '2024-01-15T10:00:00Z', latitude: 4.0, longitude: 9.7 },
      { recordedAt: '2024-01-15T10:00:30Z', latitude: 4.0, longitude: 9.7 },
    ];
    expect(deduplicatePositions(positions)).toHaveLength(2);
  });

  it('ne modifie pas un tableau sans doublons', () => {
    const positions: GpsPosition[] = Array.from({ length: 5 }, (_, i) => ({
      recordedAt: `2024-01-15T10:0${i}:00Z`,
      latitude: 4.0 + i * 0.01,
      longitude: 9.7,
    }));
    expect(deduplicatePositions(positions)).toHaveLength(5);
  });
});

describe('GPS Sync — buildValueChunks', () => {
  it('découpe correctement en chunks de 100', () => {
    const positions = Array.from({ length: 250 }, (_, i) => ({
      recordedAt: `2024-01-15T${String(i).padStart(2, '0')}:00:00Z`,
      latitude: 4.0,
      longitude: 9.7,
    }));

    const chunks = buildValueChunks(positions, 100);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(100);
    expect(chunks[1]).toHaveLength(100);
    expect(chunks[2]).toHaveLength(50);
  });

  it('retourne un seul chunk si moins que la taille max', () => {
    const positions = Array.from({ length: 10 }, (_, i) => ({
      recordedAt: `T${i}`, latitude: 0, longitude: 0,
    }));
    const chunks = buildValueChunks(positions, 100);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(10);
  });
});

describe('GPS Sync — isVehicleSilent', () => {
  it('détecte un véhicule silencieux depuis > 4h', () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 3600 * 1000);
    expect(isVehicleSilent(fiveHoursAgo)).toBe(true);
  });

  it('ne sonne pas l\'alarme si dernier signal il y a < 4h', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
    expect(isVehicleSilent(twoHoursAgo)).toBe(false);
  });

  it('considère un véhicule sans signal comme silencieux', () => {
    expect(isVehicleSilent(null)).toBe(true);
  });

  it('respect le seuil personnalisé', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000);
    expect(isVehicleSilent(threeHoursAgo, 2)).toBe(true);  // seuil 2h
    expect(isVehicleSilent(threeHoursAgo, 4)).toBe(false); // seuil 4h
  });
});
