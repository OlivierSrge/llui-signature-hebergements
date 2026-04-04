-- =============================================================================
-- L&Lui Logistique — Migration 001 : Schéma complet
-- PostgreSQL 15 + PostGIS 3.4
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ÉNUMÉRATIONS
-- =============================================================================

CREATE TYPE risk_level_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE checkpoint_type_enum AS ENUM ('checkpoint', 'toll', 'rest_area');
CREATE TYPE fee_type_enum AS ENUM ('toll', 'tax', 'handling', 'escort');
CREATE TYPE vehicle_category_enum AS ENUM ('light', 'medium', 'heavy', 'extra_heavy');
CREATE TYPE vehicle_type_enum AS ENUM ('truck_rigid', 'truck_articulated', 'tanker', 'refrigerated', 'flatbed', 'container');
CREATE TYPE vehicle_status_enum AS ENUM ('available', 'in_transit', 'maintenance', 'incident', 'retired');
CREATE TYPE vehicle_doc_type_enum AS ENUM ('carte_rose', 'assurance_cemac', 'visite_technique', 'agrement_pays');
CREATE TYPE driver_status_enum AS ENUM ('available', 'on_trip', 'on_leave', 'suspended');
CREATE TYPE trip_status_enum AS ENUM ('draft', 'assigned', 'in_transit', 'at_border', 'delivered', 'incident', 'cancelled');
CREATE TYPE checkin_method_enum AS ENUM ('auto_gps', 'manual', 'sms');
CREATE TYPE checkin_status_enum AS ENUM ('ok', 'incident');
CREATE TYPE trip_doc_type_enum AS ENUM ('lettre_voiture', 'manifeste', 'declaration_douane', 't1', 'bon_livraison');
CREATE TYPE incident_type_enum AS ENUM ('panne', 'accident', 'extorsion', 'vol', 'blocage_frontiere', 'other');
CREATE TYPE severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE invoice_status_enum AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE user_role_enum AS ENUM ('super_admin', 'dispatcher', 'driver', 'client', 'doc_agent');

-- =============================================================================
-- UTILISATEURS & AUTH
-- =============================================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            user_role_enum NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  phone           VARCHAR(50),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- =============================================================================
-- GÉOGRAPHIE
-- =============================================================================

CREATE TABLE countries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_iso        CHAR(3) UNIQUE NOT NULL,   -- ISO 3166-1 alpha-3
  code_iso2       CHAR(2) UNIQUE NOT NULL,   -- ISO 3166-1 alpha-2
  name            VARCHAR(100) NOT NULL,
  currency_code   CHAR(3) NOT NULL,          -- ISO 4217
  timezone        VARCHAR(50) NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE corridors (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                  VARCHAR(20) UNIQUE NOT NULL,
  origin_country_id     UUID NOT NULL REFERENCES countries(id),
  destination_country_id UUID NOT NULL REFERENCES countries(id),
  name                  VARCHAR(255) NOT NULL,
  distance_km           INTEGER NOT NULL CHECK (distance_km > 0),
  estimated_hours       INTEGER NOT NULL CHECK (estimated_hours > 0),
  risk_level            risk_level_enum NOT NULL DEFAULT 'medium',
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT corridors_different_countries CHECK (origin_country_id <> destination_country_id)
);

CREATE INDEX idx_corridors_origin ON corridors(origin_country_id);
CREATE INDEX idx_corridors_destination ON corridors(destination_country_id);

CREATE TABLE border_crossings (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  corridor_id             UUID NOT NULL REFERENCES corridors(id),
  name                    VARCHAR(255) NOT NULL,
  location                GEOMETRY(POINT, 4326) NOT NULL,
  opening_hours           VARCHAR(100),              -- ex: "06:00-22:00"
  avg_waiting_time_hours  DECIMAL(4,1),
  required_documents      TEXT[] NOT NULL DEFAULT '{}',
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_border_crossings_corridor ON border_crossings(corridor_id);
CREATE INDEX idx_border_crossings_location ON border_crossings USING GIST(location);

CREATE TABLE checkpoints (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  corridor_id     UUID NOT NULL REFERENCES corridors(id),
  name            VARCHAR(255) NOT NULL,
  location        GEOMETRY(POINT, 4326) NOT NULL,
  km_from_origin  INTEGER NOT NULL CHECK (km_from_origin >= 0),
  type            checkpoint_type_enum NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkpoints_corridor ON checkpoints(corridor_id);
CREATE INDEX idx_checkpoints_location ON checkpoints USING GIST(location);

-- =============================================================================
-- RÉGLEMENTATION
-- =============================================================================

CREATE TABLE transit_rules (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  border_crossing_id  UUID NOT NULL REFERENCES border_crossings(id),
  rule_type           VARCHAR(100) NOT NULL,
  description         TEXT NOT NULL,
  effective_date      DATE NOT NULL,
  expiry_date         DATE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transit_rules_dates CHECK (expiry_date IS NULL OR expiry_date > effective_date)
);

CREATE INDEX idx_transit_rules_border ON transit_rules(border_crossing_id);

CREATE TABLE fee_structures (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  border_crossing_id  UUID NOT NULL REFERENCES border_crossings(id),
  fee_type            fee_type_enum NOT NULL,
  description         VARCHAR(255),
  amount              DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  currency            CHAR(3) NOT NULL,
  vehicle_category    vehicle_category_enum,          -- NULL = applies to all
  min_cargo_tons      DECIMAL(6, 2),                  -- NULL = no minimum
  max_cargo_tons      DECIMAL(6, 2),                  -- NULL = no maximum
  cargo_value_threshold_xaf BIGINT,                  -- pour escort auto
  valid_from          DATE NOT NULL,
  valid_until         DATE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fee_structures_dates CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE INDEX idx_fee_structures_border ON fee_structures(border_crossing_id);
CREATE INDEX idx_fee_structures_type ON fee_structures(fee_type);

-- =============================================================================
-- FLOTTE
-- =============================================================================

CREATE TABLE vehicles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate_number          VARCHAR(30) NOT NULL,
  country_registration  UUID NOT NULL REFERENCES countries(id),
  type                  vehicle_type_enum NOT NULL,
  category              vehicle_category_enum NOT NULL,
  payload_tons          DECIMAL(6, 2) NOT NULL CHECK (payload_tons > 0),
  volume_m3             DECIMAL(8, 2),
  year                  SMALLINT NOT NULL CHECK (year >= 1980 AND year <= 2050),
  status                vehicle_status_enum NOT NULL DEFAULT 'available',
  current_location      GEOMETRY(POINT, 4326),
  current_trip_id       UUID,                          -- FK ajoutée après création de trips
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plate_number, country_registration)
);

CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_location ON vehicles USING GIST(current_location);

CREATE TABLE vehicle_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  doc_type    vehicle_doc_type_enum NOT NULL,
  country_id  UUID REFERENCES countries(id),          -- NULL = international
  number      VARCHAR(100),
  issue_date  DATE,
  expiry_date DATE NOT NULL,
  file_url    TEXT,
  is_valid    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicle_documents_vehicle ON vehicle_documents(vehicle_id);
CREATE INDEX idx_vehicle_documents_expiry ON vehicle_documents(expiry_date);

CREATE TABLE vehicle_country_auth (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id    UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  country_id    UUID NOT NULL REFERENCES countries(id),
  auth_type     VARCHAR(100) NOT NULL,   -- ex: 'agrement_transporteur', 'badge_portuaire'
  granted_date  DATE NOT NULL,
  expiry_date   DATE NOT NULL,
  badge_number  VARCHAR(100),
  file_url      TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vehicle_country_auth_dates CHECK (expiry_date > granted_date),
  UNIQUE (vehicle_id, country_id, auth_type)
);

CREATE INDEX idx_vca_vehicle ON vehicle_country_auth(vehicle_id);
CREATE INDEX idx_vca_country ON vehicle_country_auth(country_id);
CREATE INDEX idx_vca_expiry ON vehicle_country_auth(expiry_date);

-- =============================================================================
-- CHAUFFEURS
-- =============================================================================

CREATE TABLE drivers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id),         -- si accès app
  full_name         VARCHAR(255) NOT NULL,
  passport_number   VARCHAR(50),
  passport_country  UUID REFERENCES countries(id),
  passport_expiry   DATE,
  phone             VARCHAR(50) NOT NULL,
  phone_secondary   VARCHAR(50),
  languages         TEXT[] NOT NULL DEFAULT '{"fr"}',
  status            driver_status_enum NOT NULL DEFAULT 'available',
  rating            DECIMAL(3, 2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5),
  total_trips       INTEGER NOT NULL DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_user ON drivers(user_id);

CREATE TABLE driver_licenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id       UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  license_number  VARCHAR(100) NOT NULL,
  country_id      UUID NOT NULL REFERENCES countries(id),
  category        VARCHAR(20) NOT NULL,  -- ex: 'C', 'CE', 'D'
  expiry_date     DATE NOT NULL,
  file_url        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_driver_licenses_driver ON driver_licenses(driver_id);

CREATE TABLE driver_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  doc_type    VARCHAR(100) NOT NULL,   -- ex: 'visa_tchad', 'carte_consulaire'
  country_id  UUID REFERENCES countries(id),
  number      VARCHAR(100),
  expiry_date DATE,
  file_url    TEXT,
  is_valid    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_driver_documents_driver ON driver_documents(driver_id);

-- =============================================================================
-- CLIENTS
-- =============================================================================

CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  company_name VARCHAR(255) NOT NULL,
  tax_id      VARCHAR(100),
  address     TEXT,
  country_id  UUID REFERENCES countries(id),
  contact_name VARCHAR(255),
  phone       VARCHAR(50),
  email       VARCHAR(255),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- MISSIONS / VOYAGES
-- =============================================================================

CREATE TABLE trips (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference               VARCHAR(30) UNIQUE NOT NULL,
  origin_country_id       UUID NOT NULL REFERENCES countries(id),
  destination_country_id  UUID NOT NULL REFERENCES countries(id),
  corridor_id             UUID NOT NULL REFERENCES corridors(id),
  vehicle_id              UUID REFERENCES vehicles(id),
  driver_id               UUID REFERENCES drivers(id),
  client_id               UUID REFERENCES clients(id),
  dispatcher_id           UUID REFERENCES users(id),
  cargo_description       TEXT NOT NULL,
  cargo_weight_tons       DECIMAL(8, 2) NOT NULL CHECK (cargo_weight_tons > 0),
  cargo_volume_m3         DECIMAL(8, 2),
  cargo_value_xaf         BIGINT NOT NULL CHECK (cargo_value_xaf >= 0),
  cargo_hazardous         BOOLEAN NOT NULL DEFAULT FALSE,
  status                  trip_status_enum NOT NULL DEFAULT 'draft',
  planned_departure       TIMESTAMPTZ NOT NULL,
  actual_departure        TIMESTAMPTZ,
  estimated_arrival       TIMESTAMPTZ,
  actual_arrival          TIMESTAMPTZ,
  route                   GEOMETRY(LINESTRING, 4326),
  roadbook_json           JSONB,                       -- données offline chauffeur
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trips_different_countries CHECK (origin_country_id <> destination_country_id)
);

CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_trips_client ON trips(client_id);
CREATE INDEX idx_trips_corridor ON trips(corridor_id);
CREATE INDEX idx_trips_planned_departure ON trips(planned_departure);
CREATE INDEX idx_trips_route ON trips USING GIST(route);

-- FK circulaire vehicle <-> trip
ALTER TABLE vehicles ADD CONSTRAINT fk_vehicles_current_trip
  FOREIGN KEY (current_trip_id) REFERENCES trips(id);

-- =============================================================================
-- TRACKING GPS
-- =============================================================================

CREATE TABLE gps_logs (
  id              BIGSERIAL PRIMARY KEY,
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  recorded_at     TIMESTAMPTZ NOT NULL,             -- horodatage CÔTÉ CLIENT
  server_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- horodatage CÔTÉ SERVEUR
  location        GEOMETRY(POINT, 4326) NOT NULL,
  speed_kmh       DECIMAL(5, 1),
  heading         SMALLINT CHECK (heading >= 0 AND heading < 360),
  accuracy_meters DECIMAL(7, 2),
  altitude_m      DECIMAL(8, 2),
  is_synced       BOOLEAN NOT NULL DEFAULT TRUE,    -- toujours TRUE en base (déjà synced)
  batch_id        UUID,                              -- pour retracer le batch d'envoi
  UNIQUE (trip_id, recorded_at)                     -- déduplication
);

CREATE INDEX idx_gps_logs_trip ON gps_logs(trip_id);
CREATE INDEX idx_gps_logs_recorded_at ON gps_logs(trip_id, recorded_at DESC);
CREATE INDEX idx_gps_logs_location ON gps_logs USING GIST(location);

CREATE TABLE checkins (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  checkpoint_id   UUID REFERENCES checkpoints(id),
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location        GEOMETRY(POINT, 4326),
  method          checkin_method_enum NOT NULL DEFAULT 'auto_gps',
  km_traveled     DECIMAL(8, 1),
  speed_kmh       DECIMAL(5, 1),
  status          checkin_status_enum NOT NULL DEFAULT 'ok',
  note            TEXT,
  photo_url       TEXT,
  raw_sms         TEXT,                             -- si méthode sms
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkins_trip ON checkins(trip_id);
CREATE INDEX idx_checkins_checked_at ON checkins(trip_id, checked_at DESC);

-- =============================================================================
-- FINANCES
-- =============================================================================

CREATE TABLE transit_cost_estimates (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id             UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  breakdown           JSONB NOT NULL,              -- détail par segment et catégorie
  total_xaf           BIGINT NOT NULL,
  total_usd           DECIMAL(12, 2),
  total_eur           DECIMAL(12, 2),
  exchange_rate_used  JSONB NOT NULL,              -- snapshot des taux utilisés
  operator_margin_pct DECIMAL(5, 2) NOT NULL DEFAULT 10,
  calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until         TIMESTAMPTZ NOT NULL,        -- garantie tarifaire 48h
  is_accepted         BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_estimates_trip ON transit_cost_estimates(trip_id);

CREATE TABLE actual_costs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id       UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  cost_type     fee_type_enum NOT NULL,
  amount_xaf    BIGINT NOT NULL,
  currency_paid CHAR(3) NOT NULL,
  amount_paid   DECIMAL(12, 2) NOT NULL,
  description   TEXT,
  proof_url     TEXT,
  recorded_by   UUID REFERENCES users(id),
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_actual_costs_trip ON actual_costs(trip_id);

CREATE TABLE invoices (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference   VARCHAR(30) UNIQUE NOT NULL,
  trip_id     UUID NOT NULL REFERENCES trips(id),
  client_id   UUID NOT NULL REFERENCES clients(id),
  amount_xaf  BIGINT NOT NULL,
  amount_eur  DECIMAL(12, 2),
  tax_pct     DECIMAL(5, 2) NOT NULL DEFAULT 19.25, -- TVA Cameroun
  status      invoice_status_enum NOT NULL DEFAULT 'draft',
  issued_at   TIMESTAMPTZ,
  due_at      TIMESTAMPTZ,
  paid_at     TIMESTAMPTZ,
  pdf_url     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_trip ON invoices(trip_id);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- =============================================================================
-- DOCUMENTS
-- =============================================================================

CREATE TABLE trip_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  doc_type        trip_doc_type_enum NOT NULL,
  file_url        TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type       VARCHAR(100),
  ocr_raw         JSONB,                          -- réponse brute Mindee/Google
  ocr_parsed      JSONB,                          -- données structurées extraites
  ocr_confidence  DECIMAL(5, 4),                 -- 0.0 à 1.0
  is_validated    BOOLEAN NOT NULL DEFAULT FALSE,
  validated_by    UUID REFERENCES users(id),
  validation_note TEXT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at    TIMESTAMPTZ,
  CONSTRAINT check_ocr_confidence CHECK (
    ocr_confidence IS NULL OR (ocr_confidence >= 0 AND ocr_confidence <= 1)
  )
);

CREATE INDEX idx_trip_documents_trip ON trip_documents(trip_id);
CREATE INDEX idx_trip_documents_validated ON trip_documents(is_validated, ocr_confidence);

-- =============================================================================
-- INCIDENTS
-- =============================================================================

CREATE TABLE incidents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  type            incident_type_enum NOT NULL,
  location        GEOMETRY(POINT, 4326),
  severity        severity_enum NOT NULL DEFAULT 'medium',
  description     TEXT NOT NULL,
  photo_urls      TEXT[] DEFAULT '{}',
  reported_by     UUID REFERENCES users(id),
  reported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  resolution_note TEXT,
  is_resolved     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_incidents_trip ON incidents(trip_id);
CREATE INDEX idx_incidents_severity ON incidents(severity, is_resolved);
CREATE INDEX idx_incidents_location ON incidents USING GIST(location);

-- =============================================================================
-- DEVISES
-- =============================================================================

CREATE TABLE exchange_rates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_currency   CHAR(3) NOT NULL,
  to_currency     CHAR(3) NOT NULL,
  rate            DECIMAL(18, 8) NOT NULL CHECK (rate > 0),
  source          VARCHAR(50) NOT NULL DEFAULT 'manual',
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_currency, to_currency, recorded_at)
);

CREATE INDEX idx_exchange_rates_pair ON exchange_rates(from_currency, to_currency, recorded_at DESC);

-- =============================================================================
-- AUDIT LOG (immuable)
-- =============================================================================

CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Rendre la table immuable (pas d'UPDATE ni DELETE)
CREATE RULE no_update_audit AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- =============================================================================
-- FONCTIONS UTILITAIRES
-- =============================================================================

-- Trigger: updated_at automatique
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_vehicles
  BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_vehicle_documents
  BEFORE UPDATE ON vehicle_documents FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_drivers
  BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_trips
  BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_invoices
  BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Génération de la référence de voyage : LLUI-YYYYMM-XXXXX
CREATE OR REPLACE FUNCTION generate_trip_reference()
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_seq    INTEGER;
BEGIN
  v_prefix := 'LLUI-' || TO_CHAR(NOW(), 'YYYYMM') || '-';
  SELECT COALESCE(MAX(
    CASE WHEN reference LIKE v_prefix || '%'
    THEN CAST(SUBSTRING(reference FROM LENGTH(v_prefix) + 1) AS INTEGER)
    ELSE 0 END
  ), 0) + 1 INTO v_seq FROM trips;
  RETURN v_prefix || LPAD(v_seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Génération de la référence de facture
CREATE OR REPLACE FUNCTION generate_invoice_reference()
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_seq    INTEGER;
BEGIN
  v_prefix := 'FAC-' || TO_CHAR(NOW(), 'YYYYMM') || '-';
  SELECT COALESCE(MAX(
    CASE WHEN reference LIKE v_prefix || '%'
    THEN CAST(SUBSTRING(reference FROM LENGTH(v_prefix) + 1) AS INTEGER)
    ELSE 0 END
  ), 0) + 1 INTO v_seq FROM invoices;
  RETURN v_prefix || LPAD(v_seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Vue : véhicules avec statut documentaire
CREATE OR REPLACE VIEW vehicle_compliance_status AS
SELECT
  v.id,
  v.plate_number,
  v.status,
  v.category,
  v.payload_tons,
  -- Assurance CEMAC
  MAX(CASE WHEN vd.doc_type = 'assurance_cemac' AND vd.is_valid = TRUE
    THEN vd.expiry_date END) AS assurance_cemac_expiry,
  BOOL_OR(vd.doc_type = 'assurance_cemac' AND vd.is_valid = TRUE
    AND vd.expiry_date > NOW()) AS has_valid_assurance_cemac,
  -- Visite technique
  MAX(CASE WHEN vd.doc_type = 'visite_technique' AND vd.is_valid = TRUE
    THEN vd.expiry_date END) AS visite_technique_expiry,
  BOOL_OR(vd.doc_type = 'visite_technique' AND vd.is_valid = TRUE
    AND vd.expiry_date > NOW()) AS has_valid_visite_technique,
  -- Carte rose
  MAX(CASE WHEN vd.doc_type = 'carte_rose' AND vd.is_valid = TRUE
    THEN vd.expiry_date END) AS carte_rose_expiry,
  BOOL_OR(vd.doc_type = 'carte_rose' AND vd.is_valid = TRUE
    AND vd.expiry_date > NOW()) AS has_valid_carte_rose
FROM vehicles v
LEFT JOIN vehicle_documents vd ON vd.vehicle_id = v.id
GROUP BY v.id, v.plate_number, v.status, v.category, v.payload_tons;

-- Vue : position courante des convois actifs
CREATE OR REPLACE VIEW active_trip_positions AS
SELECT DISTINCT ON (t.id)
  t.id AS trip_id,
  t.reference,
  t.status,
  t.driver_id,
  t.vehicle_id,
  t.corridor_id,
  t.destination_country_id,
  t.estimated_arrival,
  g.location AS current_position,
  g.speed_kmh,
  g.recorded_at AS last_update,
  g.server_received_at,
  EXTRACT(EPOCH FROM (NOW() - g.recorded_at)) / 3600 AS hours_since_last_update
FROM trips t
LEFT JOIN gps_logs g ON g.trip_id = t.id
WHERE t.status IN ('in_transit', 'at_border')
ORDER BY t.id, g.recorded_at DESC;
