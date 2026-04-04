import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/gps_entry.dart';
import '../models/trip.dart';

// =============================================================================
// Service SQLite local — persistence offline des données chauffeur
// =============================================================================

class LocalDbService {
  static Database? _db;

  static Future<Database> get db async {
    _db ??= await _openDatabase();
    return _db!;
  }

  static Future<Database> _openDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'llui_transport.db');

    return openDatabase(
      path,
      version: 1,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  static Future<void> _onCreate(Database db, int version) async {
    // Table queue GPS
    await db.execute('''
      CREATE TABLE gps_queue (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id         TEXT NOT NULL,
        recorded_at     TEXT NOT NULL,
        latitude        REAL NOT NULL,
        longitude       REAL NOT NULL,
        speed_kmh       REAL,
        heading         INTEGER,
        accuracy_meters REAL,
        altitude_m      REAL,
        is_synced       INTEGER NOT NULL DEFAULT 0,
        UNIQUE (trip_id, recorded_at)
      )
    ''');

    await db.execute('CREATE INDEX idx_gps_queue_unsynced ON gps_queue (trip_id, is_synced)');

    // Table voyages actifs (cache offline)
    await db.execute('''
      CREATE TABLE active_trips (
        id                  TEXT PRIMARY KEY,
        reference           TEXT NOT NULL UNIQUE,
        status              TEXT NOT NULL,
        cargo_description   TEXT NOT NULL,
        cargo_weight_tons   REAL NOT NULL,
        cargo_value_xaf     INTEGER NOT NULL,
        planned_departure   TEXT NOT NULL,
        estimated_arrival   TEXT,
        roadbook_json       TEXT NOT NULL,
        last_km_traveled    INTEGER NOT NULL DEFAULT 0,
        last_synced_at      TEXT,
        created_at          TEXT NOT NULL DEFAULT (datetime('now'))
      )
    ''');

    // Table check-ins en attente de sync
    await db.execute('''
      CREATE TABLE pending_checkins (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id     TEXT NOT NULL,
        checked_at  TEXT NOT NULL DEFAULT (datetime('now')),
        latitude    REAL,
        longitude   REAL,
        method      TEXT NOT NULL,
        km_traveled REAL,
        status      TEXT NOT NULL,
        note        TEXT,
        photo_url   TEXT,
        is_synced   INTEGER NOT NULL DEFAULT 0
      )
    ''');
  }

  static Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    // Migrations futures ici
  }

  // ---------------------------------------------------------------------------
  // GPS Queue
  // ---------------------------------------------------------------------------

  /// Insère une position GPS en local (ne duplique pas si déjà présente)
  static Future<int> insertGpsEntry(GpsEntry entry) async {
    final database = await db;
    return database.insert(
      'gps_queue',
      entry.toMap(),
      conflictAlgorithm: ConflictAlgorithm.ignore,
    );
  }

  /// Récupère toutes les positions non synchronisées pour un voyage
  static Future<List<GpsEntry>> getUnsyncedEntries(String tripId) async {
    final database = await db;
    final rows = await database.query(
      'gps_queue',
      where: 'trip_id = ? AND is_synced = 0',
      whereArgs: [tripId],
      orderBy: 'recorded_at ASC',
    );
    return rows.map(GpsEntry.fromMap).toList();
  }

  /// Marque un ensemble d'entrées comme synchronisées
  static Future<void> markAsSynced(String tripId, List<int> ids) async {
    if (ids.isEmpty) return;
    final database = await db;
    final placeholders = ids.map((_) => '?').join(', ');
    await database.rawUpdate(
      'UPDATE gps_queue SET is_synced = 1 WHERE trip_id = ? AND id IN ($placeholders)',
      [tripId, ...ids],
    );
  }

  /// Purge les entrées synchronisées de plus de 7 jours
  static Future<void> purgeOldSyncedEntries() async {
    final database = await db;
    await database.delete(
      'gps_queue',
      where: "is_synced = 1 AND recorded_at < datetime('now', '-7 days')",
    );
  }

  /// Nombre de positions en attente de sync
  static Future<int> countUnsyncedEntries(String tripId) async {
    final database = await db;
    final result = await database.rawQuery(
      'SELECT COUNT(*) as count FROM gps_queue WHERE trip_id = ? AND is_synced = 0',
      [tripId],
    );
    return (result.first['count'] as int?) ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Active Trips
  // ---------------------------------------------------------------------------

  static Future<void> saveActiveTrip(ActiveTrip trip) async {
    final database = await db;
    await database.insert(
      'active_trips',
      {
        'id':                trip.id,
        'reference':         trip.reference,
        'status':            trip.status.name,
        'cargo_description': trip.cargoDescription,
        'cargo_weight_tons': trip.cargoWeightTons,
        'cargo_value_xaf':   trip.cargoValueXaf,
        'planned_departure': trip.plannedDeparture.toIso8601String(),
        'estimated_arrival': trip.estimatedArrival?.toIso8601String(),
        'roadbook_json':     trip.roadbook.toJsonString(),
        'last_km_traveled':  trip.lastKmTraveled,
        'last_synced_at':    DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<ActiveTrip?> getActiveTrip(String tripId) async {
    final database = await db;
    final rows = await database.query(
      'active_trips',
      where: 'id = ?',
      whereArgs: [tripId],
      limit: 1,
    );

    if (rows.isEmpty) return null;
    final row = rows.first;
    final roadbook = RoadbookData.fromJsonString(row['roadbook_json'] as String);

    return ActiveTrip.fromJson(
      {
        'id':               row['id'],
        'reference':        row['reference'],
        'status':           row['status'],
        'cargo_description': row['cargo_description'],
        'cargo_weight_tons': row['cargo_weight_tons'],
        'cargo_value_xaf':  row['cargo_value_xaf'],
        'planned_departure': row['planned_departure'],
        'estimated_arrival': row['estimated_arrival'],
      },
      roadbook,
    );
  }

  static Future<void> updateTripKm(String tripId, int km) async {
    final database = await db;
    await database.update(
      'active_trips',
      {'last_km_traveled': km},
      where: 'id = ?',
      whereArgs: [tripId],
    );
  }

  static Future<void> updateTripStatus(String tripId, TripStatus status) async {
    final database = await db;
    await database.update(
      'active_trips',
      {'status': status.name},
      where: 'id = ?',
      whereArgs: [tripId],
    );
  }
}
