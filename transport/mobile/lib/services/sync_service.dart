import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';
import '../models/gps_entry.dart';
import 'local_db_service.dart';

// =============================================================================
// Service de synchronisation — Upload batch GPS vers le serveur
// Gère la reprise automatique dès retour réseau
// =============================================================================

class SyncService {
  static const int _batchSize   = 200; // Positions par batch
  static const int _maxRetries  = 3;

  final Dio _dio;
  bool _isSyncing = false;
  DateTime? _lastSuccessfulSync;

  SyncService({required String baseUrl, required String accessToken})
      : _dio = Dio(BaseOptions(
          baseUrl: baseUrl,
          headers: {'Authorization': 'Bearer $accessToken'},
          connectTimeout: const Duration(seconds: 30),
          receiveTimeout: const Duration(seconds: 30),
        ));

  // ---------------------------------------------------------------------------
  // Synchronisation principale
  // ---------------------------------------------------------------------------

  /// Synchronise toutes les positions non envoyées pour un voyage.
  /// Retourne le nombre de positions envoyées avec succès.
  Future<SyncResult> syncGpsQueue(String tripId) async {
    if (_isSyncing) return SyncResult.skipped();

    // Vérifier la connectivité
    final connectivity = await Connectivity().checkConnectivity();
    if (connectivity.contains(ConnectivityResult.none)) {
      return SyncResult.noNetwork();
    }

    _isSyncing = true;

    try {
      final unsynced = await LocalDbService.getUnsyncedEntries(tripId);

      if (unsynced.isEmpty) {
        return SyncResult.success(sent: 0);
      }

      int totalSent = 0;
      int totalFailed = 0;

      // Envoyer par batches pour éviter les timeouts
      for (int i = 0; i < unsynced.length; i += _batchSize) {
        final chunk = unsynced.skip(i).take(_batchSize).toList();
        final batchId = const Uuid().v4();

        final success = await _sendBatch(tripId, batchId, chunk);

        if (success) {
          final ids = chunk.map((e) => e.id!).toList();
          await LocalDbService.markAsSynced(tripId, ids);
          totalSent += chunk.length;
        } else {
          totalFailed += chunk.length;
          break; // Arrêter si un batch échoue (sera repris au prochain sync)
        }
      }

      if (totalSent > 0) {
        _lastSuccessfulSync = DateTime.now();
      }

      // Purger les vieilles entrées synchronisées
      await LocalDbService.purgeOldSyncedEntries();

      return SyncResult.success(sent: totalSent, failed: totalFailed);
    } finally {
      _isSyncing = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Envoi d'un batch avec retry
  // ---------------------------------------------------------------------------

  Future<bool> _sendBatch(
    String tripId,
    String batchId,
    List<GpsEntry> entries,
  ) async {
    final payload = {
      'tripId':    tripId,
      'batchId':   batchId,
      'positions': entries.map((e) => e.toApiPayload()).toList(),
    };

    for (int attempt = 1; attempt <= _maxRetries; attempt++) {
      try {
        final response = await _dio.post(
          '/api/sync/gps-batch',
          data: payload,
        );

        if (response.statusCode == 200 || response.statusCode == 201) {
          print('[Sync] Batch $batchId : ${entries.length} positions envoyées');
          return true;
        }
      } on DioException catch (e) {
        if (e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout) {
          // Retry avec backoff exponentiel
          if (attempt < _maxRetries) {
            await Future.delayed(Duration(seconds: attempt * 2));
            continue;
          }
        }
        print('[Sync] Erreur batch $batchId (tentative $attempt): ${e.message}');
        return false;
      } catch (e) {
        print('[Sync] Erreur inattendue: $e');
        return false;
      }
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Écoute des changements de connectivité
  // ---------------------------------------------------------------------------

  /// Lance la synchronisation automatique dès retour du réseau
  void watchConnectivity(String tripId) {
    Connectivity().onConnectivityChanged.listen((results) {
      final hasNetwork = !results.contains(ConnectivityResult.none);
      if (hasNetwork && !_isSyncing) {
        print('[Sync] Réseau détecté — synchronisation automatique...');
        syncGpsQueue(tripId);
      }
    });
  }

  bool get isSyncing => _isSyncing;
  DateTime? get lastSuccessfulSync => _lastSuccessfulSync;
}

// ---------------------------------------------------------------------------
// Résultat de synchronisation
// ---------------------------------------------------------------------------

class SyncResult {
  final bool success;
  final int sent;
  final int failed;
  final String? reason;

  const SyncResult({
    required this.success,
    this.sent = 0,
    this.failed = 0,
    this.reason,
  });

  factory SyncResult.success({required int sent, int failed = 0}) =>
      SyncResult(success: true, sent: sent, failed: failed);

  factory SyncResult.noNetwork() =>
      SyncResult(success: false, reason: 'Pas de réseau');

  factory SyncResult.skipped() =>
      SyncResult(success: false, reason: 'Synchronisation déjà en cours');

  @override
  String toString() => success
      ? 'SyncResult(sent: $sent, failed: $failed)'
      : 'SyncResult(échec: $reason)';
}
