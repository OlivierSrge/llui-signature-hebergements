// ignore_for_file: invalid_annotation_target
import 'dart:convert';

// =============================================================================
// Modèles de données — Voyage (Trip)
// =============================================================================

enum TripStatus {
  draft,
  assigned,
  inTransit,
  atBorder,
  delivered,
  incident,
  cancelled;

  static TripStatus fromString(String s) => switch (s) {
    'draft'       => draft,
    'assigned'    => assigned,
    'in_transit'  => inTransit,
    'at_border'   => atBorder,
    'delivered'   => delivered,
    'incident'    => incident,
    'cancelled'   => cancelled,
    _             => draft,
  };

  String get label => switch (this) {
    draft      => 'Brouillon',
    assigned   => 'Assigné',
    inTransit  => 'En transit',
    atBorder   => 'En frontière',
    delivered  => 'Livré',
    incident   => 'Incident',
    cancelled  => 'Annulé',
  };

  bool get isActive => this == inTransit || this == atBorder || this == assigned;
}

class GeoPoint {
  final double latitude;
  final double longitude;

  const GeoPoint({required this.latitude, required this.longitude});

  factory GeoPoint.fromJson(Map<String, dynamic> json) {
    // Support GeoJSON format: {"type":"Point","coordinates":[lng,lat]}
    if (json['type'] == 'Point') {
      final coords = (json['coordinates'] as List).cast<double>();
      return GeoPoint(latitude: coords[1], longitude: coords[0]);
    }
    return GeoPoint(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
    );
  }
}

class CheckpointStop {
  final String id;
  final String name;
  final int kmFromOrigin;
  final String type;
  final double latitude;
  final double longitude;
  final String? instructions;

  const CheckpointStop({
    required this.id,
    required this.name,
    required this.kmFromOrigin,
    required this.type,
    required this.latitude,
    required this.longitude,
    this.instructions,
  });

  factory CheckpointStop.fromJson(Map<String, dynamic> json) => CheckpointStop(
    id:            json['id'] as String,
    name:          json['name'] as String,
    kmFromOrigin:  json['kmFromOrigin'] as int,
    type:          json['type'] as String,
    latitude:      (json['latitude'] as num).toDouble(),
    longitude:     (json['longitude'] as num).toDouble(),
    instructions:  json['instructions'] as String?,
  );
}

class BorderCrossingStop {
  final String id;
  final String name;
  final String? openingHours;
  final double? avgWaitingTimeHours;
  final List<String> requiredDocuments;
  final int feeEstimateXaf;
  final double latitude;
  final double longitude;

  const BorderCrossingStop({
    required this.id,
    required this.name,
    this.openingHours,
    this.avgWaitingTimeHours,
    required this.requiredDocuments,
    required this.feeEstimateXaf,
    required this.latitude,
    required this.longitude,
  });

  factory BorderCrossingStop.fromJson(Map<String, dynamic> json) =>
      BorderCrossingStop(
        id:                   json['id'] as String,
        name:                 json['name'] as String,
        openingHours:         json['openingHours'] as String?,
        avgWaitingTimeHours:  (json['avgWaitingTimeHours'] as num?)?.toDouble(),
        requiredDocuments:    (json['requiredDocuments'] as List?)
                                  ?.cast<String>() ?? [],
        feeEstimateXaf:       (json['feeEstimateXaf'] as num?)?.toInt() ?? 0,
        latitude:             (json['latitude'] as num).toDouble(),
        longitude:            (json['longitude'] as num).toDouble(),
      );
}

class RoadbookData {
  final String corridorCode;
  final String corridorName;
  final String originCountry;
  final String destinationCountry;
  final int totalDistanceKm;
  final int estimatedDurationHours;
  final List<CheckpointStop> checkpoints;
  final List<BorderCrossingStop> borderCrossings;
  final List<String> requiredDocuments;

  const RoadbookData({
    required this.corridorCode,
    required this.corridorName,
    required this.originCountry,
    required this.destinationCountry,
    required this.totalDistanceKm,
    required this.estimatedDurationHours,
    required this.checkpoints,
    required this.borderCrossings,
    required this.requiredDocuments,
  });

  factory RoadbookData.fromJson(Map<String, dynamic> json) => RoadbookData(
    corridorCode:           json['corridorCode'] as String,
    corridorName:           json['corridorName'] as String,
    originCountry:          json['originCountry'] as String,
    destinationCountry:     json['destinationCountry'] as String,
    totalDistanceKm:        json['totalDistanceKm'] as int,
    estimatedDurationHours: json['estimatedDurationHours'] as int,
    checkpoints:            (json['checkpoints'] as List)
                                .map((e) => CheckpointStop.fromJson(e as Map<String, dynamic>))
                                .toList(),
    borderCrossings:        (json['borderCrossings'] as List)
                                .map((e) => BorderCrossingStop.fromJson(e as Map<String, dynamic>))
                                .toList(),
    requiredDocuments:      (json['requiredDocuments'] as List?)
                                ?.cast<String>() ?? [],
  );

  /// Sérialisation pour stockage SQLite local (roadbook offline)
  String toJsonString() => jsonEncode({
    'corridorCode':           corridorCode,
    'corridorName':           corridorName,
    'originCountry':          originCountry,
    'destinationCountry':     destinationCountry,
    'totalDistanceKm':        totalDistanceKm,
    'estimatedDurationHours': estimatedDurationHours,
    'checkpoints':            checkpoints.map((c) => {
      'id': c.id, 'name': c.name, 'kmFromOrigin': c.kmFromOrigin,
      'type': c.type, 'latitude': c.latitude, 'longitude': c.longitude,
    }).toList(),
    'borderCrossings':        borderCrossings.map((b) => {
      'id': b.id, 'name': b.name, 'openingHours': b.openingHours,
      'requiredDocuments': b.requiredDocuments,
      'latitude': b.latitude, 'longitude': b.longitude,
    }).toList(),
    'requiredDocuments': requiredDocuments,
  });

  static RoadbookData fromJsonString(String s) =>
      RoadbookData.fromJson(jsonDecode(s) as Map<String, dynamic>);
}

class ActiveTrip {
  final String id;
  final String reference;
  final TripStatus status;
  final RoadbookData roadbook;
  final DateTime plannedDeparture;
  final DateTime? estimatedArrival;
  final String cargoDescription;
  final double cargoWeightTons;
  final int cargoValueXaf;
  final int lastKmTraveled;

  const ActiveTrip({
    required this.id,
    required this.reference,
    required this.status,
    required this.roadbook,
    required this.plannedDeparture,
    this.estimatedArrival,
    required this.cargoDescription,
    required this.cargoWeightTons,
    required this.cargoValueXaf,
    this.lastKmTraveled = 0,
  });

  factory ActiveTrip.fromJson(Map<String, dynamic> json, RoadbookData roadbook) =>
      ActiveTrip(
        id:               json['id'] as String,
        reference:        json['reference'] as String,
        status:           TripStatus.fromString(json['status'] as String),
        roadbook:         roadbook,
        plannedDeparture: DateTime.parse(json['planned_departure'] as String),
        estimatedArrival: json['estimated_arrival'] != null
            ? DateTime.parse(json['estimated_arrival'] as String)
            : null,
        cargoDescription: json['cargo_description'] as String,
        cargoWeightTons:  (json['cargo_weight_tons'] as num).toDouble(),
        cargoValueXaf:    json['cargo_value_xaf'] as int,
      );

  double get progressPct {
    if (roadbook.totalDistanceKm == 0) return 0;
    return (lastKmTraveled / roadbook.totalDistanceKm).clamp(0.0, 1.0);
  }

  CheckpointStop? get nextCheckpoint {
    return roadbook.checkpoints
        .where((c) => c.kmFromOrigin > lastKmTraveled)
        .fold<CheckpointStop?>(null, (closest, c) {
          if (closest == null) return c;
          return c.kmFromOrigin < closest.kmFromOrigin ? c : closest;
        });
  }

  int get kmToNextCheckpoint {
    final next = nextCheckpoint;
    if (next == null) return 0;
    return next.kmFromOrigin - lastKmTraveled;
  }
}
