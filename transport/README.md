# L&Lui Logistique — Plateforme Transport CEMAC

Plateforme SaaS de gestion de transport lourd transfrontalier.
Corridor : **Douala/Kribi → N'Djamena (TCD) | Bangui (CAF) | Brazzaville (COG)**

---

## Architecture

```
transport/
  backend/    Node.js + Express + TypeScript + PostgreSQL/PostGIS + BullMQ
  mobile/     Flutter (offline-first, chauffeur)
```

---

## Setup en < 10 commandes

### Prérequis
- Node.js ≥ 20, PostgreSQL 15 + PostGIS 3.4, Redis 7, Flutter 3.x

### Backend

```bash
# 1. Installer les dépendances
cd transport/backend && npm install

# 2. Copier et remplir les variables d'environnement
cp .env.example .env

# 3. Créer la base de données
psql -U postgres -c "CREATE DATABASE llui_transport; CREATE USER llui WITH PASSWORD 'CHANGE_ME'; GRANT ALL ON DATABASE llui_transport TO llui;"

# 4. Appliquer les migrations (schéma + données de seed)
npm run migrate

# 5. Démarrer le serveur de développement
npm run dev
# → http://localhost:4000
# → Docs API : http://localhost:4000/api/docs

# 6. Lancer les tests
npm test
```

### Mobile (Flutter)

```bash
# 7. Aller dans le dossier mobile
cd ../mobile

# 8. Récupérer les dépendances
flutter pub get

# 9. Lancer l'app (émulateur ou device)
flutter run
```

---

## Endpoints API (Sprint 1)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/trips/estimate` | Calculateur de coût de transit |
| `POST` | `/api/trips` | Créer une mission |
| `GET`  | `/api/trips/:id/tracking` | Suivi temps réel + ETA |
| `GET`  | `/api/trips/:id/roadbook` | Roadbook offline chauffeur |
| `PATCH`| `/api/trips/:id/status` | Mise à jour du statut |
| `POST` | `/api/sync/gps-batch` | Synchronisation batch GPS |
| `POST` | `/api/sync/sms-webhook` | Webhook Twilio SMS fallback |
| `POST` | `/api/checkins` | Check-in chauffeur |
| `GET`  | `/api/checkins/trip/:id` | Historique check-ins |
| `POST` | `/api/documents/upload` | Upload + OCR asynchrone |
| `GET`  | `/api/documents/queue/pending` | File d'attente validation |
| `PATCH`| `/api/documents/:id/validate` | Validation manuelle |
| `GET`  | `/api/vehicles/available` | Véhicules scorés disponibles |

Documentation interactive : **`GET /api/docs`**

---

## Logique métier clé

### Algorithme d'allocation véhicule (max 200 pts)

| Critère | Points |
|---------|--------|
| Agrément transporteur pays destination | +60 |
| Carte Rose CEMAC valide > 30 jours | +40 |
| Chauffeur passeport +6 mois | +30 |
| Historique 0 incident critique (12 mois) | +30 |
| Badge portuaire PAD/Kribi actif | +20 |
| Véhicule déjà passé ce corridor (90 jours) | +20 |

**Exclusions dures** → score -999, véhicule non proposé :
- Assurance CEMAC expirée
- Visite technique expirée
- Incident critique non résolu (chauffeur ou véhicule)
- Capacité insuffisante (poids/volume)
- Statut maintenance ou incident

### Calculateur de coût

Formule : `(péages + taxes + manutention + escorte + assurance) × (1 + marge%)`

- Assurance cargo : 0,8% de la valeur déclarée (configurable)
- Marge opérateur : 12% (configurable via `OPERATOR_MARGIN_PCT`)
- Garantie tarifaire : 48h
- Multi-devise : XAF / USD / EUR

### Tracking haute résilience

- Flutter : SQLite local, enregistrement GPS toutes les 30 secondes
- Sync automatique dès retour réseau (batches de 200 positions)
- Check-in automatique déclenché à 190 km
- Fallback SMS : `CHECKIN [CODE_MISSION] OK|INCIDENT`
- Alerte si aucun signal > 4h sur trajet actif

### OCR documentaire (BullMQ + Mindee)

- Seuil auto-validation : confiance ≥ 85%
- < 85% → file agent de validation
- Documents : T1, Déclaration douane CEMAC, Lettre de voiture, Manifeste

---

## Corridors de référence (données seed)

| Code | Itinéraire | Distance | Durée estimée |
|------|-----------|----------|---------------|
| DLA-NDJ | Douala → N'Djamena (via Ngaoundéré) | 1 820 km | 72h + 8.5h attente |
| DLA-BGI | Douala → Bangui (via Garoua-Boulaï) | 1 480 km | 56h + 11h attente |
| KBI-BZV | Kribi → Brazzaville (via Sangmélima) | 1 650 km | 64h + 6.5h attente |

---

## Sécurité

- JWT (access 15 min / refresh 30 jours)
- RBAC par rôle : super_admin, dispatcher, driver, client, doc_agent
- Rate limiting : 200 req/min global, 10/min sur auth
- Horodatage GPS côté serveur (pas côté client)
- Chiffrement AES-256 données sensibles (prévu sprint 2)
- Audit log immuable (table `audit_logs` — pas de DELETE/UPDATE)
- Validation signature webhook Twilio

---

## Stack

| Composant | Technologie |
|-----------|-------------|
| API | Node.js 20 + Express + TypeScript strict |
| Base de données | PostgreSQL 15 + PostGIS 3.4 |
| Queue | BullMQ + Redis |
| OCR | Mindee API (fallback mock en dev) |
| SMS | Twilio |
| Mobile | Flutter 3.x |
| Localisation mobile | SQLite (sqflite) + Geolocator |
| Tests | Vitest |
| Docs API | OpenAPI 3.0 (swagger-jsdoc) |
