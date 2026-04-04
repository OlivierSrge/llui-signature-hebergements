// =============================================================================
// Modèle — Entrée GPS pour la queue locale SQLite
// =============================================================================

class GpsEntry {
  final int? id;           // NULL avant insertion en DB locale
  final String tripId;
  final DateTime recordedAt;
  final double latitude;
  final double longitude;
  final double? speedKmh;
  final int? heading;      // 0-359 degrés
  final double? accuracyMeters;
  final double? altitudeM;
  final bool isSynced;

  const GpsEntry({
    this.id,
    required this.tripId,
    required this.recordedAt,
    required this.latitude,
    required this.longitude,
    this.speedKmh,
    this.heading,
    this.accuracyMeters,
    this.altitudeM,
    this.isSynced = false,
  });

  Map<String, dynamic> toMap() => {
    if (id != null) 'id': id,
    'trip_id':         tripId,
    'recorded_at':     recordedAt.toUtc().toIso8601String(),
    'latitude':        latitude,
    'longitude':       longitude,
    'speed_kmh':       speedKmh,
    'heading':         heading,
    'accuracy_meters': accuracyMeters,
    'altitude_m':      altitudeM,
    'is_synced':       isSynced ? 1 : 0,
  };

  factory GpsEntry.fromMap(Map<String, dynamic> map) => GpsEntry(
    id:              map['id'] as int?,
    tripId:          map['trip_id'] as String,
    recordedAt:      DateTime.parse(map['recorded_at'] as String),
    latitude:        (map['latitude'] as num).toDouble(),
    longitude:       (map['longitude'] as num).toDouble(),
    speedKmh:        (map['speed_kmh'] as num?)?.toDouble(),
    heading:         map['heading'] as int?,
    accuracyMeters:  (map['accuracy_meters'] as num?)?.toDouble(),
    altitudeM:       (map['altitude_m'] as num?)?.toDouble(),
    isSynced:        (map['is_synced'] as int) == 1,
  );

  GpsEntry copyWith({bool? isSynced}) => GpsEntry(
    id:              id,
    tripId:          tripId,
    recordedAt:      recordedAt,
    latitude:        latitude,
    longitude:       longitude,
    speedKmh:        speedKmh,
    heading:         heading,
    accuracyMeters:  accuracyMeters,
    altitudeM:       altitudeM,
    isSynced:        isSynced ?? this.isSynced,
  );

  /// Sérialise pour l'envoi au serveur (POST /api/sync/gps-batch)
  Map<String, dynamic> toApiPayload() => {
    'recordedAt':      recordedAt.toUtc().toIso8601String(),
    'latitude':        latitude,
    'longitude':       longitude,
    if (speedKmh != null)       'speedKmh':       speedKmh,
    if (heading != null)        'heading':         heading,
    if (accuracyMeters != null) 'accuracyMeters': accuracyMeters,
    if (altitudeM != null)      'altitudeM':      altitudeM,
  };
}
