-- =============================================================================
-- L&Lui Logistique — Migration 002 : Données de référence
-- Corridors CEMAC réalistes : Douala→N'Djamena, Douala→Bangui, Kribi→Brazzaville
-- =============================================================================

-- =============================================================================
-- PAYS
-- =============================================================================

INSERT INTO countries (id, code_iso, code_iso2, name, currency_code, timezone) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'CMR', 'CM', 'Cameroun',                   'XAF', 'Africa/Douala'),
  ('a0000001-0000-0000-0000-000000000002', 'TCD', 'TD', 'Tchad',                       'XAF', 'Africa/Ndjamena'),
  ('a0000001-0000-0000-0000-000000000003', 'CAF', 'CF', 'République Centrafricaine',   'XAF', 'Africa/Bangui'),
  ('a0000001-0000-0000-0000-000000000004', 'COG', 'CG', 'République du Congo',         'XAF', 'Africa/Brazzaville'),
  ('a0000001-0000-0000-0000-000000000005', 'GAB', 'GA', 'Gabon',                       'XAF', 'Africa/Libreville'),
  ('a0000001-0000-0000-0000-000000000006', 'NGA', 'NG', 'Nigeria',                     'NGN', 'Africa/Lagos')
ON CONFLICT (code_iso) DO NOTHING;

-- =============================================================================
-- CORRIDORS
-- =============================================================================

INSERT INTO corridors (id, code, origin_country_id, destination_country_id, name, distance_km, estimated_hours, risk_level) VALUES
  (
    'b0000001-0000-0000-0000-000000000001',
    'DLA-NDJ',
    'a0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000002',
    'Douala → N''Djamena (via Ngaoundéré)',
    1820,
    72,
    'high'
  ),
  (
    'b0000001-0000-0000-0000-000000000002',
    'DLA-BGI',
    'a0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000003',
    'Douala → Bangui (via Garoua-Boulaï)',
    1480,
    56,
    'high'
  ),
  (
    'b0000001-0000-0000-0000-000000000003',
    'KBI-BZV',
    'a0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000004',
    'Kribi → Brazzaville (via Sangmélima)',
    1650,
    64,
    'medium'
  )
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- POSTES FRONTIÈRES
-- =============================================================================

-- Corridor Douala → N'Djamena
INSERT INTO border_crossings (id, corridor_id, name, location, opening_hours, avg_waiting_time_hours, required_documents) VALUES
  (
    'c0000001-0000-0000-0000-000000000001',
    'b0000001-0000-0000-0000-000000000001',
    'Ngaoundéré (Cameroun sortie)',
    ST_SetSRID(ST_MakePoint(13.5838, 7.3266), 4326),
    '06:00-22:00',
    2.5,
    ARRAY['lettre_voiture', 'manifeste', 'assurance_cemac', 'carte_rose', 'agrement_transporteur']
  ),
  (
    'c0000001-0000-0000-0000-000000000002',
    'b0000001-0000-0000-0000-000000000001',
    'Kousseri / N''Djamena (Tchad entrée)',
    ST_SetSRID(ST_MakePoint(15.0297, 12.0773), 4326),
    '07:00-19:00',
    6.0,
    ARRAY['declaration_douane', 't1', 'lettre_voiture', 'manifeste', 'assurance_cemac', 'carte_rose', 'agrement_transporteur', 'visa_tchad']
  ),

-- Corridor Douala → Bangui
  (
    'c0000001-0000-0000-0000-000000000003',
    'b0000001-0000-0000-0000-000000000002',
    'Garoua-Boulaï (Cameroun sortie)',
    ST_SetSRID(ST_MakePoint(14.5667, 5.8833), 4326),
    '06:00-20:00',
    3.0,
    ARRAY['lettre_voiture', 'manifeste', 'assurance_cemac', 'carte_rose']
  ),
  (
    'c0000001-0000-0000-0000-000000000004',
    'b0000001-0000-0000-0000-000000000002',
    'Beloko (RCA entrée)',
    ST_SetSRID(ST_MakePoint(14.7667, 5.7833), 4326),
    '07:00-18:00',
    8.0,
    ARRAY['declaration_douane', 't1', 'lettre_voiture', 'manifeste', 'assurance_cemac', 'carte_rose', 'agrement_transporteur', 'visa_rca']
  ),

-- Corridor Kribi → Brazzaville
  (
    'c0000001-0000-0000-0000-000000000005',
    'b0000001-0000-0000-0000-000000000003',
    'Kye-Ossi / Ambam (Cameroun-Gabon)',
    ST_SetSRID(ST_MakePoint(10.5847, 2.6333), 4326),
    '06:00-22:00',
    2.0,
    ARRAY['lettre_voiture', 'manifeste', 'assurance_cemac', 'carte_rose']
  ),
  (
    'c0000001-0000-0000-0000-000000000006',
    'b0000001-0000-0000-0000-000000000003',
    'Dolisie / Mossendjo (Congo entrée)',
    ST_SetSRID(ST_MakePoint(12.6704, -4.1977), 4326),
    '07:00-19:00',
    4.5,
    ARRAY['declaration_douane', 'lettre_voiture', 'manifeste', 'assurance_cemac', 'carte_rose', 'agrement_transporteur', 'visa_congo']
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- CHECKPOINTS (jalons kilométriques sur chaque corridor)
-- =============================================================================

-- Corridor DLA-NDJ (1820 km)
INSERT INTO checkpoints (corridor_id, name, location, km_from_origin, type) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'Port Autonome de Douala', ST_SetSRID(ST_MakePoint(9.7085, 4.0511), 4326), 0, 'checkpoint'),
  ('b0000001-0000-0000-0000-000000000001', 'Péage Edéa', ST_SetSRID(ST_MakePoint(10.1291, 3.8001), 4326), 60, 'toll'),
  ('b0000001-0000-0000-0000-000000000001', 'Bafoussam — Zone de repos', ST_SetSRID(ST_MakePoint(10.4200, 5.4767), 4326), 310, 'rest_area'),
  ('b0000001-0000-0000-0000-000000000001', 'Ngaoundéré — Checkpoint sortie Cameroun', ST_SetSRID(ST_MakePoint(13.5838, 7.3266), 4326), 620, 'checkpoint'),
  ('b0000001-0000-0000-0000-000000000001', 'Garoua — Checkpoint', ST_SetSRID(ST_MakePoint(13.3989, 9.2979), 4326), 820, 'checkpoint'),
  ('b0000001-0000-0000-0000-000000000001', 'Maroua — Zone de repos', ST_SetSRID(ST_MakePoint(14.3261, 10.5914), 4326), 1000, 'rest_area'),
  ('b0000001-0000-0000-0000-000000000001', 'Mora — Péage', ST_SetSRID(ST_MakePoint(14.1413, 11.0446), 4326), 1100, 'toll'),
  ('b0000001-0000-0000-0000-000000000001', 'Kousseri / Frontière Tchad', ST_SetSRID(ST_MakePoint(15.0297, 12.0773), 4326), 1200, 'checkpoint'),
  ('b0000001-0000-0000-0000-000000000001', 'N''Djamena — Checkpoint douanier', ST_SetSRID(ST_MakePoint(15.0557, 12.1048), 4326), 1820, 'checkpoint'),

-- Corridor DLA-BGI (1480 km)
  ('b0000001-0000-0000-0000-000000000002', 'Port Autonome de Douala', ST_SetSRID(ST_MakePoint(9.7085, 4.0511), 4326), 0, 'checkpoint'),
  ('b0000001-0000-0000-0000-000000000002', 'Yaoundé — Péage sortie est', ST_SetSRID(ST_MakePoint(11.5174, 3.8667), 4326), 250, 'toll'),
  ('b0000001-0000-0000-0000-000000000002', 'Bertoua — Zone de repos', ST_SetSRID(ST_MakePoint(13.6851, 4.5781), 4326), 570, 'rest_area'),
  ('b0000001-0000-0000-0000-000000000002', 'Garoua-Boulaï — Sortie Cameroun', ST_SetSRID(ST_MakePoint(14.5667, 5.8833), 4326), 750, 'checkpoint'),
  ('b0000001-0000-0000-0000-000000000002', 'Beloko — Entrée RCA', ST_SetSRID(ST_MakePoint(14.7667, 5.7833), 4326), 760, 'checkpoint'),
  ('b0000001-0000-0000-0000-000000000002', 'Bossangoa — Checkpoint', ST_SetSRID(ST_MakePoint(17.4473, 6.4894), 4326), 1000, 'checkpoint'),
  ('b0000001-0000-0000-0000-000000000002', 'Bangui — Dédouanement', ST_SetSRID(ST_MakePoint(18.5582, 4.3612), 4326), 1480, 'checkpoint'),

-- Corridor KBI-BZV (1650 km)
  ('b0000001-0000-0000-0000-000000000003', 'Port de Kribi', ST_SetSRID(ST_MakePoint(9.9129, 2.9391), 4326), 0, 'checkpoint'),
  ('b0000001-0000-0000-0000-000000000003', 'Sangmélima — Péage', ST_SetSRID(ST_MakePoint(11.9797, 2.9333), 4326), 200, 'toll'),
  ('b0000001-0000-0000-0000-000000000003', 'Ambam — Frontière Gabon', ST_SetSRID(ST_MakePoint(11.2828, 2.3894), 4326), 310, 'checkpoint'),
  ('b0000001-0000-0000-0000-000000000003', 'Libreville contournement — Repos', ST_SetSRID(ST_MakePoint(9.4559, 0.3901), 4326), 700, 'rest_area'),
  ('b0000001-0000-0000-0000-000000000003', 'Franceville — Péage', ST_SetSRID(ST_MakePoint(13.5883, -1.6334), 4326), 1000, 'toll'),
  ('b0000001-0000-0000-0000-000000000003', 'Dolisie — Frontière Congo', ST_SetSRID(ST_MakePoint(12.6704, -4.1977), 4326), 1300, 'checkpoint'),
  ('b0000001-0000-0000-0000-000000000003', 'Brazzaville — Terminal conteneurs', ST_SetSRID(ST_MakePoint(15.2662, -4.2634), 4326), 1650, 'checkpoint');

-- =============================================================================
-- STRUCTURES DE FRAIS (fee_structures)
-- Montants réalistes basés sur les barèmes CEMAC 2024
-- =============================================================================

-- ---- CORRIDOR DLA-NDJ : Frontière Kousseri / N'Djamena ----

-- Péages Cameroun (cumulés sur le corridor)
INSERT INTO fee_structures (border_crossing_id, fee_type, description, amount, currency, vehicle_category, valid_from) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'toll', 'Péages routiers Cameroun (Douala-Ngaoundéré)', 85000, 'XAF', 'heavy', '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000001', 'toll', 'Péages routiers Cameroun (Douala-Ngaoundéré)', 110000, 'XAF', 'extra_heavy', '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000001', 'handling', 'Frais de mainlevée / inspection CMR sortie', 25000, 'XAF', NULL, '2024-01-01'),

-- Frontière Tchad (Kousseri/N'Djamena)
  ('c0000001-0000-0000-0000-000000000002', 'tax', 'Taxe de transit Tchad (ad valorem)', 350000, 'XAF', 'heavy', '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000002', 'tax', 'Taxe de transit Tchad (ad valorem)', 480000, 'XAF', 'extra_heavy', '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000002', 'handling', 'Frais de dédouanement N''Djamena', 95000, 'XAF', NULL, '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000002', 'handling', 'Frais de scanner/inspection', 45000, 'XAF', NULL, '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000002', 'escort', 'Escorte douanière obligatoire Tchad', 185000, 'XAF', NULL, '2024-01-01'),

-- ---- CORRIDOR DLA-BGI : Frontière Beloko / Bangui ----

  ('c0000001-0000-0000-0000-000000000003', 'toll', 'Péages routiers Cameroun (Douala-Garoua-Boulaï)', 75000, 'XAF', 'heavy', '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000003', 'toll', 'Péages routiers Cameroun (Douala-Garoua-Boulaï)', 95000, 'XAF', 'extra_heavy', '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000003', 'handling', 'Frais de sortie Cameroun (Garoua-Boulaï)', 20000, 'XAF', NULL, '2024-01-01'),

  ('c0000001-0000-0000-0000-000000000004', 'tax', 'Taxe de transit RCA', 420000, 'XAF', 'heavy', '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000004', 'tax', 'Taxe de transit RCA', 560000, 'XAF', 'extra_heavy', '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000004', 'handling', 'Frais de dédouanement Bangui', 110000, 'XAF', NULL, '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000004', 'escort', 'Escorte militaire RCA (obligatoire >500km)', 225000, 'XAF', NULL, '2024-01-01'),

-- ---- CORRIDOR KBI-BZV : Frontières Gabon + Congo ----

  ('c0000001-0000-0000-0000-000000000005', 'toll', 'Péages Cameroun sud (Kribi-Ambam)', 45000, 'XAF', 'heavy', '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000005', 'toll', 'Péages Gabon (transit)', 120000, 'XAF', 'heavy', '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000005', 'toll', 'Péages Gabon (transit)', 160000, 'XAF', 'extra_heavy', '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000005', 'tax', 'Taxe de transit Gabon', 280000, 'XAF', 'heavy', '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000005', 'handling', 'Frais sortie Cameroun / entrée Gabon', 35000, 'XAF', NULL, '2024-01-01'),

  ('c0000001-0000-0000-0000-000000000006', 'tax', 'Taxe de transit Congo-Brazzaville', 310000, 'XAF', 'heavy', '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000006', 'tax', 'Taxe de transit Congo-Brazzaville', 420000, 'XAF', 'extra_heavy', '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000006', 'handling', 'Frais de dédouanement Brazzaville', 85000, 'XAF', NULL, '2024-01-01'),
  ('c0000001-0000-0000-0000-000000000006', 'handling', 'Frais de scanner conteneur', 55000, 'XAF', NULL, '2024-01-01');

-- =============================================================================
-- TAUX DE CHANGE INITIAUX (snapshot 2024)
-- =============================================================================

INSERT INTO exchange_rates (from_currency, to_currency, rate, source) VALUES
  ('XAF', 'EUR', 0.001524, 'seed_2024'),  -- 1 EUR ≈ 655.957 XAF (taux fixe FCFA/EUR)
  ('EUR', 'XAF', 655.957,  'seed_2024'),
  ('XAF', 'USD', 0.001651, 'seed_2024'),  -- 1 USD ≈ 606 XAF (approximation)
  ('USD', 'XAF', 606.000,  'seed_2024'),
  ('USD', 'EUR', 0.922,    'seed_2024'),
  ('EUR', 'USD', 1.085,    'seed_2024');

-- =============================================================================
-- UTILISATEUR SUPER_ADMIN PAR DÉFAUT
-- Password: Admin@LLui2024! (hash bcrypt rounds=12 — à régénérer en prod)
-- =============================================================================

INSERT INTO users (id, email, password_hash, role, full_name) VALUES
  (
    'd0000001-0000-0000-0000-000000000001',
    'admin@llui-logistique.cm',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lewm6Q7l6.dXZv8RO',
    'super_admin',
    'Super Administrateur'
  )
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- FLOTTE DE DÉMONSTRATION (3 véhicules)
-- =============================================================================

INSERT INTO vehicles (id, plate_number, country_registration, type, category, payload_tons, volume_m3, year, status) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'LT-4821-CM', 'a0000001-0000-0000-0000-000000000001', 'truck_articulated', 'extra_heavy', 30.0, 90.0, 2020, 'available'),
  ('e0000001-0000-0000-0000-000000000002', 'LT-2934-CM', 'a0000001-0000-0000-0000-000000000001', 'truck_rigid',       'heavy',       15.0, 45.0, 2019, 'available'),
  ('e0000001-0000-0000-0000-000000000003', 'LT-7105-CM', 'a0000001-0000-0000-0000-000000000001', 'container',         'extra_heavy', 28.0, 85.0, 2022, 'available')
ON CONFLICT DO NOTHING;

-- Documents véhicule (valides)
INSERT INTO vehicle_documents (vehicle_id, doc_type, number, issue_date, expiry_date, is_valid) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'assurance_cemac',  'ASSC-2024-00123', '2024-01-15', '2025-01-14', TRUE),
  ('e0000001-0000-0000-0000-000000000001', 'visite_technique', 'VT-2024-CMR-456', '2024-03-01', '2025-02-28', TRUE),
  ('e0000001-0000-0000-0000-000000000001', 'carte_rose',       'CR-CMR-LT4821',  '2023-06-01', '2028-05-31', TRUE),
  ('e0000001-0000-0000-0000-000000000001', 'agrement_pays',    'AG-TCD-2024-001', '2024-01-01', '2024-12-31', TRUE),

  ('e0000001-0000-0000-0000-000000000002', 'assurance_cemac',  'ASSC-2024-00456', '2024-02-01', '2025-01-31', TRUE),
  ('e0000001-0000-0000-0000-000000000002', 'visite_technique', 'VT-2024-CMR-789', '2024-01-15', '2025-01-14', TRUE),
  ('e0000001-0000-0000-0000-000000000002', 'carte_rose',       'CR-CMR-LT2934',  '2022-11-01', '2027-10-31', TRUE),

  ('e0000001-0000-0000-0000-000000000003', 'assurance_cemac',  'ASSC-2024-00789', '2024-03-15', '2025-03-14', TRUE),
  ('e0000001-0000-0000-0000-000000000003', 'visite_technique', 'VT-2024-CMR-012', '2024-04-01', '2025-03-31', TRUE),
  ('e0000001-0000-0000-0000-000000000003', 'carte_rose',       'CR-CMR-LT7105',  '2022-05-01', '2027-04-30', TRUE);

-- Agréments pays
INSERT INTO vehicle_country_auth (vehicle_id, country_id, auth_type, granted_date, expiry_date, badge_number) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'agrement_transporteur', '2024-01-01', '2024-12-31', 'TCD-2024-LT4821'),
  ('e0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'badge_portuaire_pad',   '2024-01-01', '2024-12-31', 'PAD-2024-8821'),
  ('e0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000003', 'agrement_transporteur', '2024-01-01', '2024-12-31', 'CAF-2024-LT7105'),
  ('e0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000004', 'agrement_transporteur', '2024-01-01', '2024-12-31', 'COG-2024-LT7105');

-- =============================================================================
-- CHAUFFEURS DE DÉMONSTRATION (2 chauffeurs)
-- =============================================================================

INSERT INTO drivers (id, full_name, passport_number, passport_country, passport_expiry, phone, languages, status) VALUES
  (
    'f0000001-0000-0000-0000-000000000001',
    'Mamadou Diallo',
    'CM1234567',
    'a0000001-0000-0000-0000-000000000001',
    '2027-06-15',
    '+237655123456',
    ARRAY['fr', 'ar', 'ful'],
    'available'
  ),
  (
    'f0000001-0000-0000-0000-000000000002',
    'Jean-Pierre Mbarga',
    'CM7654321',
    'a0000001-0000-0000-0000-000000000001',
    '2026-11-30',
    '+237677654321',
    ARRAY['fr', 'beti'],
    'available'
  )
ON CONFLICT DO NOTHING;

INSERT INTO driver_licenses (driver_id, license_number, country_id, category, expiry_date) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'CMR-DL-2019-44521', 'a0000001-0000-0000-0000-000000000001', 'CE', '2027-08-15'),
  ('f0000001-0000-0000-0000-000000000002', 'CMR-DL-2021-88731', 'a0000001-0000-0000-0000-000000000001', 'C',  '2026-03-22');
