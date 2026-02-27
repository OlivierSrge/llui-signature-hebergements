-- ============================================================
-- L&Lui Signature – Schéma SQL Supabase
-- Moteur de réservation d'hébergements premium – Kribi, Cameroun
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: partners (hébergeurs partenaires)
-- ============================================================
CREATE TABLE partners (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  email       TEXT,
  phone       TEXT,
  description TEXT,
  address     TEXT,
  iban        TEXT,         -- pour virement bancaire
  logo_url    TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Données initiales : 4 partenaires
INSERT INTO partners (name, email, phone, description, address) VALUES
  ('Château M''Bekaa',   'contact@chateau-mbekaa.cm',    '+237 699 000 001', 'Château d''exception niché dans la forêt tropicale de Kribi, offrant une expérience unique alliant luxe et nature.', 'Route de Londji, Kribi'),
  ('Hôtel Adrien Beach', 'reservation@adrienbeach.cm',   '+237 699 000 002', 'Hôtel balnéaire de charme en bord de mer, vue panoramique sur l''océan Atlantique.', 'Boulevard de la Plage, Kribi'),
  ('Tara Plage',         'info@taraplage.cm',             '+237 699 000 003', 'Complexe de villas et bungalows pieds dans l''eau, idéal pour les séjours romantiques et familiaux.', 'Plage de Tara, Kribi'),
  ('Les Gîtes de Kribi', 'gites@kribi-sejours.cm',       '+237 699 000 004', 'Gîtes authentiques au cœur de Kribi, chaleureux et confortables, à proximité du centre-ville.', 'Centre-ville, Kribi');

-- ============================================================
-- TABLE: accommodations (hébergements)
-- ============================================================
CREATE TABLE accommodations (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id       UUID           NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name             TEXT           NOT NULL,
  slug             TEXT           UNIQUE NOT NULL,
  type             TEXT           NOT NULL CHECK (type IN ('villa', 'appartement', 'chambre')),
  description      TEXT,
  short_description TEXT,
  capacity         INTEGER        NOT NULL CHECK (capacity > 0),
  bedrooms         INTEGER        NOT NULL DEFAULT 1,
  bathrooms        INTEGER        NOT NULL DEFAULT 1,
  price_per_night  DECIMAL(10,2)  NOT NULL CHECK (price_per_night > 0),
  commission_rate  DECIMAL(5,2)   NOT NULL DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  location         TEXT,
  latitude         DECIMAL(9,6),
  longitude        DECIMAL(9,6),
  images           TEXT[]         NOT NULL DEFAULT '{}',
  amenities        TEXT[]         NOT NULL DEFAULT '{}',
  status           TEXT           NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  featured         BOOLEAN        NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_accommodations_partner ON accommodations(partner_id);
CREATE INDEX idx_accommodations_type    ON accommodations(type);
CREATE INDEX idx_accommodations_status  ON accommodations(status);

-- Données initiales : hébergements
INSERT INTO accommodations (partner_id, name, slug, type, description, short_description, capacity, bedrooms, bathrooms, price_per_night, commission_rate, location, images, amenities, featured) VALUES
  (
    (SELECT id FROM partners WHERE name = 'Château M''Bekaa'),
    'Villa Royale M''Bekaa',
    'villa-royale-mbekaa',
    'villa',
    'Nichée au cœur de la forêt tropicale camerounaise, la Villa Royale M''Bekaa est une demeure d''exception qui allie l''architecture coloniale au confort contemporain. Avec ses 4 chambres somptueusement décorées, sa piscine à débordement et sa terrasse panoramique surplombant la canopée, elle offre une retraite privée inoubliable. Idéale pour les séjours de noces et les célébrations en famille.',
    'Villa d''exception avec piscine et vue sur la forêt tropicale',
    8, 4, 3,
    350000.00, 12.00,
    'Route de Londji, Kribi',
    ARRAY[
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200',
      'https://images.unsplash.com/photo-1540541338537-1220059af7dc?w=1200',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200'
    ],
    ARRAY['Piscine privée', 'WiFi haut débit', 'Climatisation', 'Cuisine équipée', 'Terrasse panoramique', 'Barbecue', 'Parking', 'Sécurité 24h/24', 'Ménage quotidien', 'Jacuzzi'],
    TRUE
  ),
  (
    (SELECT id FROM partners WHERE name = 'Hôtel Adrien Beach'),
    'Suite Présidentielle Ocean View',
    'suite-presidentielle-ocean-view',
    'chambre',
    'La Suite Présidentielle de l''Hôtel Adrien Beach est le summum du luxe balnéaire à Kribi. Avec sa vue imprenable sur l''océan Atlantique depuis un balcon privé de 30m², son lit king-size habillé de soie, son bain à remous et ses équipements premium, cette suite transforme chaque nuit en souvenir impérissable. Service de majordome inclus, petit-déjeuner gastronomique servi en chambre.',
    'Suite de luxe avec vue panoramique sur l''Atlantique',
    2, 1, 2,
    180000.00, 10.00,
    'Boulevard de la Plage, Kribi',
    ARRAY[
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200'
    ],
    ARRAY['Vue mer', 'Balcon privé', 'Bain à remous', 'WiFi', 'Climatisation', 'Minibar', 'Télévision 4K', 'Service majordome', 'Petit-déjeuner inclus', 'Accès piscine', 'Coffre-fort'],
    TRUE
  ),
  (
    (SELECT id FROM partners WHERE name = 'Hôtel Adrien Beach'),
    'Chambre Deluxe Jardin Tropical',
    'chambre-deluxe-jardin-tropical',
    'chambre',
    'La Chambre Deluxe Jardin Tropical vous offre un havre de paix entouré d''une végétation luxuriante. Décorée avec raffinement dans des tons naturels, elle dispose d''une terrasse privative ouvrant sur les jardins fleuris de l''hôtel. Parfaite pour un séjour romantique ou une nuit de noces mémorable.',
    'Chambre élégante avec terrasse privée sur jardin tropical',
    2, 1, 1,
    95000.00, 10.00,
    'Boulevard de la Plage, Kribi',
    ARRAY[
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200',
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200',
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1200'
    ],
    ARRAY['Terrasse privée', 'Vue jardin', 'WiFi', 'Climatisation', 'Minibar', 'Petit-déjeuner inclus', 'Accès piscine'],
    FALSE
  ),
  (
    (SELECT id FROM partners WHERE name = 'Tara Plage'),
    'Villa Pieds dans l''Eau – Tara',
    'villa-pieds-eau-tara',
    'villa',
    'Imaginez vous réveiller avec les vagues de l''Atlantique qui viennent caresser la terrasse de votre villa. La Villa Pieds dans l''Eau de Tara Plage est unique en son genre : construite sur pilotis, elle offre un accès direct à la mer depuis votre espace privatif. 3 chambres climatisées, salon spacieux, cuisine ouverte entièrement équipée et ponton privé. L''adresse rêvée pour une lune de miel inoubliable.',
    'Villa sur pilotis avec accès direct à la mer',
    6, 3, 2,
    280000.00, 11.00,
    'Plage de Tara, Kribi',
    ARRAY[
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200',
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200',
      'https://images.unsplash.com/photo-1602002418082-a4443978a2d9?w=1200',
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200'
    ],
    ARRAY['Accès mer direct', 'Ponton privé', 'WiFi', 'Climatisation', 'Cuisine équipée', 'Kayak inclus', 'Terrasse', 'Barbecue', 'Ménage inclus'],
    TRUE
  ),
  (
    (SELECT id FROM partners WHERE name = 'Tara Plage'),
    'Bungalow Palmier – Tara',
    'bungalow-palmier-tara',
    'appartement',
    'Le Bungalow Palmier est un appartement indépendant de charme, idéalement situé à 50 mètres de la plage. Avec son architecture en bois naturel, sa terrasse ombragée par des cocotiers et sa décoration artisanale camerounaise, il incarne l''authenticité tropicale dans un cadre soigné. Parfait pour un couple ou une petite famille.',
    'Bungalow authentique à 50m de la plage, déco artisanale',
    4, 2, 1,
    120000.00, 11.00,
    'Plage de Tara, Kribi',
    ARRAY[
      'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=1200',
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1200',
      'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200'
    ],
    ARRAY['Proche plage', 'Terrasse', 'WiFi', 'Climatisation', 'Cuisine équipée', 'Hamac', 'Parking'],
    FALSE
  ),
  (
    (SELECT id FROM partners WHERE name = 'Les Gîtes de Kribi'),
    'Gîte Le Flamboyant',
    'gite-le-flamboyant',
    'appartement',
    'Le Gîte Le Flamboyant est un appartement confortable et chaleureux situé au cœur de Kribi. Idéal pour les familles ou groupes d''amis, il propose 3 chambres lumineuses, un grand salon-salle à manger et une cuisine entièrement équipée. La terrasse fleurie vous invite à profiter de la douceur du soir kribiéen. À 15 minutes à pied de la plage.',
    'Appartement familial confortable au cœur de Kribi',
    6, 3, 2,
    85000.00, 9.00,
    'Centre-ville, Kribi',
    ARRAY[
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200'
    ],
    ARRAY['WiFi', 'Climatisation', 'Cuisine équipée', 'Terrasse', 'Parking', 'Lave-linge', 'Télévision'],
    FALSE
  ),
  (
    (SELECT id FROM partners WHERE name = 'Les Gîtes de Kribi'),
    'Chambre Brise Marine',
    'chambre-brise-marine',
    'chambre',
    'La Chambre Brise Marine des Gîtes de Kribi est une chambre confortable et bien aménagée, idéale pour les voyageurs souhaitant découvrir Kribi sans se ruiner. Climatisée, avec salle de bain privative et accès à une belle terrasse commune avec vue sur la végétation tropicale.',
    'Chambre cosy avec salle de bain privée, idéale solo/couple',
    2, 1, 1,
    45000.00, 9.00,
    'Centre-ville, Kribi',
    ARRAY[
      'https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?w=1200',
      'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=1200'
    ],
    ARRAY['WiFi', 'Climatisation', 'Salle de bain privée', 'Petit-déjeuner optionnel', 'Accès terrasse commune'],
    FALSE
  );

-- ============================================================
-- TABLE: profiles (extension de auth.users)
-- ============================================================
CREATE TABLE profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name   TEXT,
  last_name    TEXT,
  phone        TEXT,
  role         TEXT        NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger : créer le profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TABLE: reservations
-- ============================================================
CREATE TABLE reservations (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id    UUID           NOT NULL REFERENCES accommodations(id),
  user_id             UUID           REFERENCES profiles(id),

  -- Informations client (même sans compte)
  guest_first_name    TEXT           NOT NULL,
  guest_last_name     TEXT           NOT NULL,
  guest_email         TEXT           NOT NULL,
  guest_phone         TEXT           NOT NULL,

  -- Séjour
  check_in            DATE           NOT NULL,
  check_out           DATE           NOT NULL,
  guests              INTEGER        NOT NULL CHECK (guests > 0),
  nights              INTEGER        GENERATED ALWAYS AS (check_out - check_in) STORED,

  -- Tarification
  price_per_night     DECIMAL(10,2)  NOT NULL,
  subtotal            DECIMAL(10,2)  NOT NULL,
  commission_rate     DECIMAL(5,2)   NOT NULL,
  commission_amount   DECIMAL(10,2)  NOT NULL,
  total_price         DECIMAL(10,2)  NOT NULL,

  -- Paiement
  payment_method      TEXT           NOT NULL CHECK (payment_method IN ('orange_money', 'virement', 'especes')),
  payment_status      TEXT           NOT NULL DEFAULT 'en_attente' CHECK (payment_status IN ('en_attente', 'paye', 'annule')),
  payment_reference   TEXT,
  payment_date        TIMESTAMPTZ,

  -- Statut réservation
  reservation_status  TEXT           NOT NULL DEFAULT 'en_attente' CHECK (reservation_status IN ('en_attente', 'confirmee', 'annulee')),
  confirmed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Notes
  notes               TEXT,
  admin_notes         TEXT,

  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- Contrainte : check_out doit être après check_in
  CONSTRAINT valid_dates CHECK (check_out > check_in)
);

CREATE INDEX idx_reservations_accommodation ON reservations(accommodation_id);
CREATE INDEX idx_reservations_user          ON reservations(user_id);
CREATE INDEX idx_reservations_status        ON reservations(reservation_status);
CREATE INDEX idx_reservations_checkin       ON reservations(check_in);
CREATE INDEX idx_reservations_email         ON reservations(guest_email);

-- ============================================================
-- TABLE: availability (disponibilités par logement)
-- ============================================================
CREATE TABLE availability (
  id                UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id  UUID     NOT NULL REFERENCES accommodations(id) ON DELETE CASCADE,
  date              DATE     NOT NULL,
  is_available      BOOLEAN  NOT NULL DEFAULT TRUE,
  UNIQUE(accommodation_id, date)
);

CREATE INDEX idx_availability_accommodation ON availability(accommodation_id);
CREATE INDEX idx_availability_date          ON availability(date);

-- ============================================================
-- FUNCTION: Bloquer les dates lors d'une réservation confirmée
-- ============================================================
CREATE OR REPLACE FUNCTION block_dates_on_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  d DATE;
BEGIN
  -- Si la réservation passe à "confirmée", bloquer les dates
  IF NEW.reservation_status = 'confirmee' AND OLD.reservation_status != 'confirmee' THEN
    d := NEW.check_in;
    WHILE d < NEW.check_out LOOP
      INSERT INTO availability (accommodation_id, date, is_available)
      VALUES (NEW.accommodation_id, d, FALSE)
      ON CONFLICT (accommodation_id, date)
      DO UPDATE SET is_available = FALSE;
      d := d + INTERVAL '1 day';
    END LOOP;
  END IF;

  -- Si la réservation est annulée, libérer les dates
  IF NEW.reservation_status = 'annulee' AND OLD.reservation_status = 'confirmee' THEN
    d := NEW.check_in;
    WHILE d < NEW.check_out LOOP
      INSERT INTO availability (accommodation_id, date, is_available)
      VALUES (NEW.accommodation_id, d, TRUE)
      ON CONFLICT (accommodation_id, date)
      DO UPDATE SET is_available = TRUE;
      d := d + INTERVAL '1 day';
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_dates
  AFTER UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION block_dates_on_confirmation();

-- ============================================================
-- FUNCTION: updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_accommodations_updated_at
  BEFORE UPDATE ON accommodations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE partners         ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations     ENABLE ROW LEVEL SECURITY;

-- Partners : lecture publique
CREATE POLICY "partners_select_all"   ON partners FOR SELECT USING (TRUE);
CREATE POLICY "partners_admin_all"    ON partners FOR ALL   USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Accommodations : lecture publique (actives uniquement pour les non-admins)
CREATE POLICY "accommodations_select_active" ON accommodations FOR SELECT USING (status = 'active');
CREATE POLICY "accommodations_admin_all"     ON accommodations FOR ALL   USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Availability : lecture publique
CREATE POLICY "availability_select_all"  ON availability FOR SELECT USING (TRUE);
CREATE POLICY "availability_admin_all"   ON availability FOR ALL   USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Profiles : chaque utilisateur voit son propre profil + admin voit tout
CREATE POLICY "profiles_select_own"   ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_update_own"   ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all"    ON profiles FOR ALL   USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "profiles_insert_own"   ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Reservations :
--   - INSERT public (anyone can book)
--   - SELECT own (by email or user_id)
--   - Admin voit tout
CREATE POLICY "reservations_insert_public" ON reservations FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "reservations_select_own"    ON reservations FOR SELECT USING (
  user_id = auth.uid()
  OR guest_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
CREATE POLICY "reservations_admin_all"     ON reservations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- VIEW: Stats admin (résumé des revenus et commissions)
-- ============================================================
CREATE OR REPLACE VIEW admin_stats AS
SELECT
  COUNT(*)                                                    AS total_reservations,
  COUNT(*) FILTER (WHERE reservation_status = 'en_attente')  AS pending_reservations,
  COUNT(*) FILTER (WHERE reservation_status = 'confirmee')   AS confirmed_reservations,
  COUNT(*) FILTER (WHERE reservation_status = 'annulee')     AS cancelled_reservations,
  COALESCE(SUM(total_price) FILTER (WHERE reservation_status = 'confirmee'), 0)       AS total_revenue,
  COALESCE(SUM(commission_amount) FILTER (WHERE reservation_status = 'confirmee'), 0) AS total_commission,
  COALESCE(SUM(total_price) FILTER (WHERE payment_status = 'en_attente' AND reservation_status = 'confirmee'), 0) AS pending_payment
FROM reservations;

-- ============================================================
-- Données de test : quelques réservations exemples
-- ============================================================
INSERT INTO reservations (
  accommodation_id, guest_first_name, guest_last_name, guest_email, guest_phone,
  check_in, check_out, guests, price_per_night, subtotal, commission_rate,
  commission_amount, total_price, payment_method, payment_status, reservation_status
) VALUES
  (
    (SELECT id FROM accommodations WHERE slug = 'villa-royale-mbekaa'),
    'Amina', 'Ngono', 'amina.ngono@email.com', '+237 677 123 456',
    '2026-03-15', '2026-03-20', 6,
    350000.00, 1750000.00, 12.00, 210000.00, 1750000.00,
    'virement', 'en_attente', 'confirmee'
  ),
  (
    (SELECT id FROM accommodations WHERE slug = 'suite-presidentielle-ocean-view'),
    'Paul', 'Biya Jr', 'paul.b@email.cm', '+237 699 987 654',
    '2026-04-01', '2026-04-04', 2,
    180000.00, 540000.00, 10.00, 54000.00, 540000.00,
    'orange_money', 'paye', 'confirmee'
  ),
  (
    (SELECT id FROM accommodations WHERE slug = 'villa-pieds-eau-tara'),
    'Sophie', 'Mbarga', 'sophie.mbarga@gmail.com', '+237 655 444 333',
    '2026-03-28', '2026-04-02', 4,
    280000.00, 1400000.00, 11.00, 154000.00, 1400000.00,
    'especes', 'en_attente', 'en_attente'
  );
