import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';
import '../models/trip.dart';
import '../services/gps_service.dart';
import '../services/sync_service.dart';
import '../services/local_db_service.dart';
import '../models/gps_entry.dart';
import '../widgets/checkin_dialog.dart';

// =============================================================================
// Écran : Mission Active (chauffeur)
// =============================================================================

class ActiveMissionScreen extends StatefulWidget {
  final ActiveTrip trip;
  final GpsService gpsService;
  final SyncService syncService;

  const ActiveMissionScreen({
    super.key,
    required this.trip,
    required this.gpsService,
    required this.syncService,
  });

  @override
  State<ActiveMissionScreen> createState() => _ActiveMissionScreenState();
}

class _ActiveMissionScreenState extends State<ActiveMissionScreen>
    with WidgetsBindingObserver {

  final MapController _mapController = MapController();
  Position? _currentPosition;
  int _unsyncedCount = 0;
  bool _isSyncing = false;
  int _kmTraveled = 0;
  Timer? _syncTimer;
  Timer? _positionRefreshTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _kmTraveled = widget.trip.lastKmTraveled;
    _startGpsAndSync();
  }

  void _startGpsAndSync() {
    // Démarrer l'enregistrement GPS
    widget.gpsService.startRecording(widget.trip.id);

    // Callback auto check-in
    widget.gpsService.onAutoCheckinRequired = _onAutoCheckinRequired;

    // Synchronisation auto toutes les 2 minutes si réseau disponible
    _syncTimer = Timer.periodic(const Duration(minutes: 2), (_) => _syncGps());

    // Rafraîchir la position sur la carte toutes les 10 secondes
    _positionRefreshTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _refreshPosition();
    });

    // Écouter les changements de connectivité
    widget.syncService.watchConnectivity(widget.trip.id);

    // Premier refresh immédiat
    _refreshPosition();
    _updateUnsyncedCount();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // L'enregistrement GPS continue via WorkManager même si l'app est en arrière-plan
    // Le service GPS Flutter Background continue si configuré
  }

  Future<void> _refreshPosition() async {
    final position = await widget.gpsService.getCurrentPosition();
    if (!mounted) return;
    if (position != null) {
      setState(() => _currentPosition = position);
      _mapController.move(
        LatLng(position.latitude, position.longitude),
        _mapController.camera.zoom,
      );
    }
    await _updateUnsyncedCount();
  }

  Future<void> _updateUnsyncedCount() async {
    final count = await LocalDbService.countUnsyncedEntries(widget.trip.id);
    if (mounted) setState(() => _unsyncedCount = count);
  }

  Future<void> _syncGps() async {
    if (_isSyncing) return;
    setState(() => _isSyncing = true);

    try {
      final result = await widget.syncService.syncGpsQueue(widget.trip.id);
      if (result.sent > 0) {
        _showSnackBar('${result.sent} positions synchronisées', isSuccess: true);
      }
    } finally {
      if (mounted) setState(() => _isSyncing = false);
      await _updateUnsyncedCount();
    }
  }

  // ---------------------------------------------------------------------------
  // Auto check-in déclenché à 190 km
  // ---------------------------------------------------------------------------

  void _onAutoCheckinRequired(Position position, double kmTraveled) {
    _kmTraveled += kmTraveled.round();
    LocalDbService.updateTripKm(widget.trip.id, _kmTraveled);
    widget.gpsService.resetCheckinDistance();

    // Enregistrer le check-in automatique localement
    final entry = GpsEntry(
      tripId:     widget.trip.id,
      recordedAt: DateTime.now().toUtc(),
      latitude:   position.latitude,
      longitude:  position.longitude,
      speedKmh:   position.speed * 3.6,
    );
    LocalDbService.insertGpsEntry(entry);

    if (mounted) {
      setState(() {});
      _showAutoCheckinBanner(_kmTraveled);
    }
  }

  void _showAutoCheckinBanner(int km) {
    ScaffoldMessenger.of(context).showMaterialBanner(
      MaterialBanner(
        content: Text(
          'Check-in automatique à ${km} km — Tout va bien ?',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          TextButton(
            onPressed: () {
              ScaffoldMessenger.of(context).hideCurrentMaterialBanner();
            },
            child: const Text('OK'),
          ),
          TextButton(
            onPressed: () {
              ScaffoldMessenger.of(context).hideCurrentMaterialBanner();
              _openManualCheckinDialog(isIncident: true);
            },
            child: const Text('SIGNALER INCIDENT', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Check-in manuel
  // ---------------------------------------------------------------------------

  Future<void> _openManualCheckinDialog({bool isIncident = false}) async {
    final result = await showDialog<CheckinResult>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => CheckinDialog(
        trip: widget.trip,
        currentPosition: _currentPosition,
        kmTraveled: _kmTraveled,
        isIncident: isIncident,
      ),
    );

    if (result == null) return;

    // Mettre à jour km
    if (result.kmTraveled != null) {
      _kmTraveled = result.kmTraveled!;
      await LocalDbService.updateTripKm(widget.trip.id, _kmTraveled);
      widget.gpsService.resetCheckinDistance();
    }

    if (result.status == CheckinStatus.incident) {
      await LocalDbService.updateTripStatus(widget.trip.id, TripStatus.incident);
    }

    if (mounted) setState(() {});
    _showSnackBar('Check-in enregistré', isSuccess: true);
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.trip.reference,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              '${widget.trip.roadbook.originCountry} → ${widget.trip.roadbook.destinationCountry}',
              style: const TextStyle(fontSize: 12),
            ),
          ],
        ),
        backgroundColor: _getTripStatusColor(widget.trip.status),
        actions: [
          // Indicateur de sync
          Stack(
            alignment: Alignment.topRight,
            children: [
              IconButton(
                icon: _isSyncing
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.sync),
                onPressed: _syncGps,
                tooltip: 'Synchroniser GPS',
              ),
              if (_unsyncedCount > 0)
                Positioned(
                  right: 6,
                  top: 6,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      color: Colors.orange,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      _unsyncedCount > 99 ? '99+' : '$_unsyncedCount',
                      style: const TextStyle(color: Colors.white, fontSize: 10),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // ---- Bannière de progression ----
          _ProgressBanner(
            trip: widget.trip,
            kmTraveled: _kmTraveled,
            distanceSinceCheckin: widget.gpsService.distanceSinceLastCheckinKm,
          ),

          // ---- Carte ----
          Expanded(
            flex: 3,
            child: _buildMap(),
          ),

          // ---- Infos et actions ----
          Expanded(
            flex: 2,
            child: _buildBottomPanel(),
          ),
        ],
      ),

      // ---- FAB check-in manuel ----
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openManualCheckinDialog,
        icon: const Icon(Icons.location_on),
        label: const Text('CHECK-IN'),
        backgroundColor: Colors.green.shade700,
      ),
    );
  }

  Widget _buildMap() {
    final checkpointMarkers = widget.trip.roadbook.checkpoints.map((cp) {
      final isPassed = cp.kmFromOrigin <= _kmTraveled;
      return Marker(
        point: LatLng(cp.latitude, cp.longitude),
        width: 32,
        height: 32,
        child: Tooltip(
          message: '${cp.name} (${cp.kmFromOrigin} km)',
          child: Icon(
            cp.type == 'toll' ? Icons.toll : Icons.flag,
            color: isPassed ? Colors.grey : Colors.blue,
            size: 28,
          ),
        ),
      );
    }).toList();

    final borderMarkers = widget.trip.roadbook.borderCrossings.map((bc) =>
      Marker(
        point: LatLng(bc.latitude, bc.longitude),
        width: 40,
        height: 40,
        child: Tooltip(
          message: bc.name,
          child: const Icon(Icons.flag_circle, color: Colors.red, size: 36),
        ),
      ),
    ).toList();

    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: _currentPosition != null
            ? LatLng(_currentPosition!.latitude, _currentPosition!.longitude)
            : LatLng(
                widget.trip.roadbook.checkpoints.isNotEmpty
                    ? widget.trip.roadbook.checkpoints.first.latitude
                    : 4.05,
                widget.trip.roadbook.checkpoints.isNotEmpty
                    ? widget.trip.roadbook.checkpoints.first.longitude
                    : 9.71,
              ),
        initialZoom: 8,
      ),
      children: [
        // Tuiles OpenStreetMap (fonctionne offline si téléchargées)
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'cm.llui.transport',
          fallbackUrl: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ),

        // Checkpoints
        MarkerLayer(markers: [...checkpointMarkers, ...borderMarkers]),

        // Position courante
        if (_currentPosition != null)
          MarkerLayer(
            markers: [
              Marker(
                point: LatLng(
                  _currentPosition!.latitude,
                  _currentPosition!.longitude,
                ),
                width: 48,
                height: 48,
                child: const Icon(Icons.local_shipping, color: Colors.orange, size: 40),
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildBottomPanel() {
    final formatter = DateFormat('dd/MM HH:mm');
    final nextCp = widget.trip.nextCheckpoint;

    return Container(
      color: Colors.grey.shade50,
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          // Cargo
          _InfoRow(
            icon: Icons.inventory,
            label: 'Cargaison',
            value: '${widget.trip.cargoDescription} — ${widget.trip.cargoWeightTons} t',
          ),

          // ETA
          if (widget.trip.estimatedArrival != null)
            _InfoRow(
              icon: Icons.schedule,
              label: 'Arrivée estimée',
              value: formatter.format(widget.trip.estimatedArrival!.toLocal()),
            ),

          // Prochain checkpoint
          if (nextCp != null)
            _InfoRow(
              icon: Icons.flag,
              label: 'Prochain point',
              value: '${nextCp.name} dans ${widget.trip.kmToNextCheckpoint} km',
              valueColor: widget.trip.kmToNextCheckin < 20 ? Colors.orange : null,
            ),

          // Non-synced GPS
          if (_unsyncedCount > 0)
            Container(
              padding: const EdgeInsets.all(8),
              margin: const EdgeInsets.only(top: 8),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: Row(
                children: [
                  const Icon(Icons.wifi_off, color: Colors.orange),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '$_unsyncedCount position(s) en attente de synchronisation',
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
                  TextButton(
                    onPressed: _syncGps,
                    child: const Text('Sync'),
                  ),
                ],
              ),
            ),

          // Bouton signalement incident
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () => _openManualCheckinDialog(isIncident: true),
            icon: const Icon(Icons.warning_amber, color: Colors.red),
            label: const Text(
              'SIGNALER UN INCIDENT',
              style: TextStyle(color: Colors.red),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  Color _getTripStatusColor(TripStatus status) => switch (status) {
    TripStatus.inTransit  => Colors.blue.shade700,
    TripStatus.atBorder   => Colors.orange.shade700,
    TripStatus.incident   => Colors.red.shade700,
    TripStatus.delivered  => Colors.green.shade700,
    _                     => Colors.grey.shade700,
  };

  void _showSnackBar(String message, {bool isSuccess = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isSuccess ? Colors.green.shade700 : Colors.red.shade700,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  void dispose() {
    _syncTimer?.cancel();
    _positionRefreshTimer?.cancel();
    widget.gpsService.stopRecording();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}

// ---------------------------------------------------------------------------
// Widgets auxiliaires
// ---------------------------------------------------------------------------

class _ProgressBanner extends StatelessWidget {
  final ActiveTrip trip;
  final int kmTraveled;
  final double distanceSinceCheckin;

  const _ProgressBanner({
    required this.trip,
    required this.kmTraveled,
    required this.distanceSinceCheckin,
  });

  @override
  Widget build(BuildContext context) {
    final progress = trip.progressPct;
    final kmRemaining = trip.roadbook.totalDistanceKm - kmTraveled;

    return Container(
      color: Colors.blue.shade800,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$kmTraveled km parcourus',
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
              Text(
                '$kmRemaining km restants',
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 4),
          LinearProgressIndicator(
            value: progress,
            backgroundColor: Colors.white24,
            valueColor: AlwaysStoppedAnimation<Color>(
              progress > 0.8 ? Colors.green : Colors.lightBlueAccent,
            ),
            minHeight: 8,
            borderRadius: BorderRadius.circular(4),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.location_on, color: Colors.white54, size: 14),
              const SizedBox(width: 4),
              Text(
                'Prochain check-in dans ${(190 - distanceSinceCheckin).clamp(0, 190).round()} km',
                style: const TextStyle(color: Colors.white54, fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Colors.grey.shade600),
          const SizedBox(width: 8),
          Text(
            '$label : ',
            style: const TextStyle(fontSize: 13, color: Colors.grey),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: valueColor,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

// Extension utilitaire
extension on ActiveTrip {
  int get kmToNextCheckin {
    const autoCheckin = 190;
    final distanceSinceCheckin = 0; // À récupérer du GpsService en vrai
    return (autoCheckin - distanceSinceCheckin).clamp(0, autoCheckin);
  }
}
