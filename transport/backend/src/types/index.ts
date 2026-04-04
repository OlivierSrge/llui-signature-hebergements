// =============================================================================
// L&Lui Logistique — Types TypeScript centraux
// =============================================================================

// ---------------------------------------------------------------------------
// Enums (miroir des types PostgreSQL)
// ---------------------------------------------------------------------------

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum CheckpointType {
  CHECKPOINT = 'checkpoint',
  TOLL = 'toll',
  REST_AREA = 'rest_area',
}

export enum FeeType {
  TOLL = 'toll',
  TAX = 'tax',
  HANDLING = 'handling',
  ESCORT = 'escort',
}

export enum VehicleCategory {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
  EXTRA_HEAVY = 'extra_heavy',
}

export enum VehicleType {
  TRUCK_RIGID = 'truck_rigid',
  TRUCK_ARTICULATED = 'truck_articulated',
  TANKER = 'tanker',
  REFRIGERATED = 'refrigerated',
  FLATBED = 'flatbed',
  CONTAINER = 'container',
}

export enum VehicleStatus {
  AVAILABLE = 'available',
  IN_TRANSIT = 'in_transit',
  MAINTENANCE = 'maintenance',
  INCIDENT = 'incident',
  RETIRED = 'retired',
}

export enum VehicleDocType {
  CARTE_ROSE = 'carte_rose',
  ASSURANCE_CEMAC = 'assurance_cemac',
  VISITE_TECHNIQUE = 'visite_technique',
  AGREMENT_PAYS = 'agrement_pays',
}

export enum DriverStatus {
  AVAILABLE = 'available',
  ON_TRIP = 'on_trip',
  ON_LEAVE = 'on_leave',
  SUSPENDED = 'suspended',
}

export enum TripStatus {
  DRAFT = 'draft',
  ASSIGNED = 'assigned',
  IN_TRANSIT = 'in_transit',
  AT_BORDER = 'at_border',
  DELIVERED = 'delivered',
  INCIDENT = 'incident',
  CANCELLED = 'cancelled',
}

export enum CheckinMethod {
  AUTO_GPS = 'auto_gps',
  MANUAL = 'manual',
  SMS = 'sms',
}

export enum CheckinStatus {
  OK = 'ok',
  INCIDENT = 'incident',
}

export enum TripDocType {
  LETTRE_VOITURE = 'lettre_voiture',
  MANIFESTE = 'manifeste',
  DECLARATION_DOUANE = 'declaration_douane',
  T1 = 't1',
  BON_LIVRAISON = 'bon_livraison',
}

export enum IncidentType {
  PANNE = 'panne',
  ACCIDENT = 'accident',
  EXTORSION = 'extorsion',
  VOL = 'vol',
  BLOCAGE_FRONTIERE = 'blocage_frontiere',
  OTHER = 'other',
}

export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  DISPATCHER = 'dispatcher',
  DRIVER = 'driver',
  CLIENT = 'client',
  DOC_AGENT = 'doc_agent',
}

// ---------------------------------------------------------------------------
// Entités de base de données
// ---------------------------------------------------------------------------

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface Country {
  id: string;
  codeIso: string;
  codeIso2: string;
  name: string;
  currencyCode: string;
  timezone: string;
  isActive: boolean;
}

export interface Corridor {
  id: string;
  code: string;
  originCountryId: string;
  destinationCountryId: string;
  name: string;
  distanceKm: number;
  estimatedHours: number;
  riskLevel: RiskLevel;
  isActive: boolean;
}

export interface BorderCrossing {
  id: string;
  corridorId: string;
  name: string;
  location: GeoPoint;
  openingHours: string | null;
  avgWaitingTimeHours: number | null;
  requiredDocuments: string[];
  isActive: boolean;
}

export interface Checkpoint {
  id: string;
  corridorId: string;
  name: string;
  location: GeoPoint;
  kmFromOrigin: number;
  type: CheckpointType;
  isActive: boolean;
}

export interface FeeStructure {
  id: string;
  borderCrossingId: string;
  feeType: FeeType;
  description: string | null;
  amount: number;
  currency: string;
  vehicleCategory: VehicleCategory | null;
  minCargoTons: number | null;
  maxCargoTons: number | null;
  cargoValueThresholdXaf: number | null;
  validFrom: Date;
  validUntil: Date | null;
  isActive: boolean;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  countryRegistration: string;
  type: VehicleType;
  category: VehicleCategory;
  payloadTons: number;
  volumeM3: number | null;
  year: number;
  status: VehicleStatus;
  currentLocation: GeoPoint | null;
  currentTripId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  docType: VehicleDocType;
  countryId: string | null;
  number: string | null;
  issueDate: Date | null;
  expiryDate: Date;
  fileUrl: string | null;
  isValid: boolean;
}

export interface VehicleCountryAuth {
  id: string;
  vehicleId: string;
  countryId: string;
  authType: string;
  grantedDate: Date;
  expiryDate: Date;
  badgeNumber: string | null;
  isActive: boolean;
}

export interface Driver {
  id: string;
  userId: string | null;
  fullName: string;
  passportNumber: string | null;
  passportCountry: string | null;
  passportExpiry: Date | null;
  phone: string;
  phoneSecondary: string | null;
  languages: string[];
  status: DriverStatus;
  rating: number;
  totalTrips: number;
}

export interface Trip {
  id: string;
  reference: string;
  originCountryId: string;
  destinationCountryId: string;
  corridorId: string;
  vehicleId: string | null;
  driverId: string | null;
  clientId: string | null;
  dispatcherId: string | null;
  cargoDescription: string;
  cargoWeightTons: number;
  cargoVolumeM3: number | null;
  cargoValueXaf: number;
  cargoHazardous: boolean;
  status: TripStatus;
  plannedDeparture: Date;
  actualDeparture: Date | null;
  estimatedArrival: Date | null;
  actualArrival: Date | null;
  roadbookJson: RoadbookData | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GpsLog {
  id: number;
  tripId: string;
  recordedAt: Date;
  serverReceivedAt: Date;
  location: GeoPoint;
  speedKmh: number | null;
  heading: number | null;
  accuracyMeters: number | null;
  altitudeM: number | null;
  batchId: string | null;
}

export interface Checkin {
  id: string;
  tripId: string;
  checkpointId: string | null;
  checkedAt: Date;
  location: GeoPoint | null;
  method: CheckinMethod;
  kmTraveled: number | null;
  speedKmh: number | null;
  status: CheckinStatus;
  note: string | null;
  photoUrl: string | null;
}

export interface TripDocument {
  id: string;
  tripId: string;
  docType: TripDocType;
  fileUrl: string;
  fileSizeBytes: number | null;
  mimeType: string | null;
  ocrRaw: Record<string, unknown> | null;
  ocrParsed: ParsedOcrData | null;
  ocrConfidence: number | null;
  isValidated: boolean;
  validatedBy: string | null;
  validationNote: string | null;
  uploadedAt: Date;
  validatedAt: Date | null;
}

export interface Incident {
  id: string;
  tripId: string;
  type: IncidentType;
  location: GeoPoint | null;
  severity: Severity;
  description: string;
  photoUrls: string[];
  reportedBy: string | null;
  reportedAt: Date;
  resolvedAt: Date | null;
  resolutionNote: string | null;
  isResolved: boolean;
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  recordedAt: Date;
}

// ---------------------------------------------------------------------------
// DTOs — Requêtes API
// ---------------------------------------------------------------------------

export interface CreateTripRequest {
  originCountryId: string;
  destinationCountryId: string;
  corridorId: string;
  vehicleId?: string;
  driverId?: string;
  clientId?: string;
  cargoDescription: string;
  cargoWeightTons: number;
  cargoVolumeM3?: number;
  cargoValueXaf: number;
  cargoHazardous?: boolean;
  plannedDeparture: string; // ISO 8601
  notes?: string;
}

export interface EstimateCostRequest {
  originCountryId: string;
  destinationCountryId: string;
  corridorId: string;
  cargoWeightTons: number;
  cargoValueXaf: number;
  vehicleCategory: VehicleCategory;
}

export interface GpsBatchRequest {
  tripId: string;
  batchId: string;
  positions: GpsPosition[];
}

export interface GpsPosition {
  recordedAt: string; // ISO 8601 — horodatage CLIENT
  latitude: number;
  longitude: number;
  speedKmh?: number;
  heading?: number;
  accuracyMeters?: number;
  altitudeM?: number;
}

export interface CreateCheckinRequest {
  tripId: string;
  checkpointId?: string;
  latitude?: number;
  longitude?: number;
  method: CheckinMethod;
  kmTraveled?: number;
  status: CheckinStatus;
  note?: string;
  photoUrl?: string;
}

export interface UploadDocumentRequest {
  tripId: string;
  docType: TripDocType;
  fileUrl: string;
  fileSizeBytes?: number;
  mimeType?: string;
}

export interface VehicleAvailabilityRequest {
  destinationCountryId: string;
  cargoWeightTons: number;
  cargoVolumeM3?: number;
  corridorId?: string;
}

// ---------------------------------------------------------------------------
// DTOs — Réponses API
// ---------------------------------------------------------------------------

export interface CostEstimateResponse {
  breakdown: CostBreakdown;
  totalXaf: number;
  totalUsd: number;
  totalEur: number;
  exchangeRatesUsed: Record<string, number>;
  estimatedDurationHours: number;
  validUntil: string; // ISO 8601
}

export interface CostBreakdown {
  bySegment: SegmentCost[];
  byCategory: {
    tolls: number;
    taxes: number;
    handling: number;
    escort: number;
    insurance: number;
    margin: number;
  };
}

export interface SegmentCost {
  borderCrossingId: string;
  borderCrossingName: string;
  fees: FeeLine[];
  subtotalXaf: number;
}

export interface FeeLine {
  feeType: FeeType;
  description: string;
  amountXaf: number;
}

export interface TrackingResponse {
  tripId: string;
  reference: string;
  status: TripStatus;
  currentPosition: GeoPoint | null;
  lastUpdateAt: string | null;
  hoursSinceLastUpdate: number | null;
  estimatedArrival: string | null;
  etaRecalculatedAt: string | null;
  checkins: CheckinSummary[];
  recentPositions: GpsPosition[];
  alertSilentVehicle: boolean;
}

export interface CheckinSummary {
  id: string;
  checkedAt: string;
  checkpointName: string | null;
  kmTraveled: number | null;
  status: CheckinStatus;
  method: CheckinMethod;
}

export interface VehicleScore {
  vehicleId: string;
  plateNumber: string;
  score: number;
  category: VehicleCategory;
  payloadTons: number;
  volumeM3: number | null;
  breakdown: ScoreBreakdown;
  exclusions: string[];
  isEligible: boolean;
}

export interface ScoreBreakdown {
  agrement: number;
  carteRose: number;
  driverPassport: number;
  incidentHistory: number;
  badgePortuaire: number;
  corridorExperience: number;
}

// ---------------------------------------------------------------------------
// Métier spécifique
// ---------------------------------------------------------------------------

export interface RoadbookData {
  corridorCode: string;
  corridorName: string;
  originCountry: string;
  destinationCountry: string;
  totalDistanceKm: number;
  estimatedDurationHours: number;
  checkpoints: CheckpointStop[];
  borderCrossings: BorderCrossingStop[];
  requiredDocuments: string[];
  emergencyContacts: EmergencyContact[];
  offlineMapsUrls?: string[];
}

export interface CheckpointStop {
  id: string;
  name: string;
  kmFromOrigin: number;
  type: CheckpointType;
  latitude: number;
  longitude: number;
  instructions?: string;
}

export interface BorderCrossingStop {
  id: string;
  name: string;
  openingHours: string | null;
  avgWaitingTimeHours: number | null;
  requiredDocuments: string[];
  feeEstimateXaf: number;
  latitude: number;
  longitude: number;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  role: string;
  country: string;
}

export interface ParsedOcrData {
  documentType: string;
  fields: Record<string, OcrField>;
  confidence: number;
  rawText?: string;
}

export interface OcrField {
  value: string | number | null;
  confidence: number;
  boundingBox?: number[];
}

// ---------------------------------------------------------------------------
// Auth JWT
// ---------------------------------------------------------------------------

export interface JwtPayload {
  sub: string;        // user id
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ---------------------------------------------------------------------------
// BullMQ Jobs
// ---------------------------------------------------------------------------

export interface OcrJobData {
  documentId: string;
  tripId: string;
  fileUrl: string;
  docType: TripDocType;
  mimeType: string | null;
}

export interface GpsSyncJobData {
  tripId: string;
  batchId: string;
  positionCount: number;
}

export interface NotificationJobData {
  userId: string;
  fcmToken?: string;
  phone?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  channel: 'push' | 'sms' | 'both';
}
