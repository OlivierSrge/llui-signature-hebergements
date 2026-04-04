import 'dart:async';
import 'package:geolocator/geolocator.dart';
import '../models/gps_entry.dart';
import 'local_db_service.dart';

// =============================================================================
// Service GPS — Enregistrement en arrière-plan + queue locale
// =============================================================================

class GpsService {
  static const Duration _recordingInterval = Duration(seconds: 30);
  static const double   _autoCheckinDistanceKm = 190.0;

  StreamSubscription<Position>? _positionSubscription;
  String? _activeTripId;
  double  _distanceSinceLastCheckin = 0.0;
  Position? _lastPosition;

  /// Callback déclenché quand la distance > 190 km depuis le dernier check-in
  void Function(Position position, double kmTraveled)? onAutoCheckinRequired;

  // ---------------------------------------------------------------------------
  // Démarrage de l'enregistrement GPS
  // ---------------------------------------------------------------------------

  Future<void> startRecording(String tripId) async {
    if (_activeTripId != null) await stopRecording();

    // Vérifier et demander les permissions
    final permission = await _ensurePermissions();
    if (!permission) {
      throw Exception('Permission GPS refusée. Veuillez activer la localisation.');
    }

    _activeTripId = tripId;
    _distanceSinceLastCheckin = 0.0;
    _lastPosition = null;

    // Configuration haute précision pour les longs trajets
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 50, // Enregistrer si déplacement > 50m (économie batterie)
    );

    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen(
      _onPositionReceived,
      onError: (err) => print('[GPS] Erreur stream: $err'),
    );

    print('[GPS] Enregistrement démarré pour voyage $tripId');
  }

  // ---------------------------------------------------------------------------
  // Arrêt
  // ---------------------------------------------------------------------------

  Future<void> stopRecording() async {
    await _positionSubscription?.cancel();
    _positionSubscription = null;
    _activeTripId = null;
    print('[GPS] Enregistrement arrêté');
  }

  // ---------------------------------------------------------------------------
  // Réception d'une position
  // ---------------------------------------------------------------------------

  void _onPositionReceived(Position position) {
    if (_activeTripId == null) return;

    final entry = GpsEntry(
      tripId:          _activeTripId!,
      recordedAt:      DateTime.now().toUtc(),
      latitude:        position.latitude,
      longitude:       position.longitude,
      speedKmh:        position.speed >= 0 ? position.speed * 3.6 : null, // m/s → km/h
      heading:         position.heading >= 0 ? position.heading.round() : null,
      accuracyMeters:  position.accuracy,
      altitudeM:       position.altitude,
    );

    // Stocker localement (sans await pour ne pas bloquer)
    LocalDbService.insertGpsEntry(entry);

    // Calculer la distance parcourue depuis la dernière position
    if (_lastPosition != null) {
      final distanceM = Geolocator.distanceBetween(
        _lastPosition!.latitude,
        _lastPosition!.longitude,
        position.latitude,
        position.longitude,
      );
      _distanceSinceLastCheckin += distanceM / 1000.0; // km

      // Déclencher auto check-in si seuil atteint
      if (_distanceSinceLastCheckin >= _autoCheckinDistanceKm) {
        final kmCallback = _distanceSinceLastCheckin;
        _distanceSinceLastCheckin = 0.0;
        onAutoCheckinRequired?.call(position, kmCallback);
      }
    }

    _lastPosition = position;
  }

  // ---------------------------------------------------------------------------
  // Position courante instantanée
  // ---------------------------------------------------------------------------

  Future<Position?> getCurrentPosition() async {
    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
    } catch (e) {
      print('[GPS] Impossible d\'obtenir la position: $e');
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Réinitialiser le compteur de distance (après un check-in manuel)
  // ---------------------------------------------------------------------------

  void resetCheckinDistance() {
    _distanceSinceLastCheckin = 0.0;
  }

  double get distanceSinceLastCheckinKm => _distanceSinceLastCheckin;
  bool get isRecording => _activeTripId != null;

  // ---------------------------------------------------------------------------
  // Permissions
  // ---------------------------------------------------------------------------

  Future<bool> _ensurePermissions() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    LocationPermission permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return false;
    }

    return permission != LocationPermission.deniedForever;
  }

  Future<bool> get hasPermission async {
    final permission = await Geolocator.checkPermission();
    return permission == LocationPermission.always ||
           permission == LocationPermission.whileInUse;
  }
}
