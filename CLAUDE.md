# CLAUDE.md — L&Lui Signature Hébergements

Instructions permanentes pour Claude Code sur ce projet.

---

## CONTEXTE PROJET

Application Next.js 14 App Router de gestion de mariages, hébergements et partenaires prescripteurs à Kribi, Cameroun.

**Stack :**
- Next.js 14 App Router (Server Components, Server Actions)
- Firebase Admin SDK / Firestore
- Google Sheets API (googleapis, service account)
- Vercel (déploiement, env vars)
- Tailwind CSS

**Collections Firestore principales :**
- `prescripteurs_partenaires` — partenaires hôtels/restos/bars, champ `statut: 'actif'` obligatoire
- `codes_sessions` — codes 6 chiffres QR scan, doc ID = le code lui-même
- `commissions_canal2` — commissions boutique Netlify, statuts : `vente_en_cours` / `en_attente` / `versee`
- `parametres_plateforme` — taux commission, montants forfaits

---

## ARCHITECTURE CANAL 2 (BOUTIQUE → PARTENAIRE)

### Flux complet
1. Partenaire scanne QR → `/promo/[uid]` → `genererCodeSession` → code 6 chiffres
2. Client utilise code sur boutique Netlify (site externe)
3. Boutiquier change statut dans Google Sheets col L
4. Apps Script `onEditCommandes` → `POST /api/sheets-webhook`
5. Webhook crée/met à jour commission dans Firestore

### Mapping colonnes Google Sheets (onglet "Commandes")
```
A(0) Date          B(1) Client_Nom    C(2) Client_Tel
D(3) Client_Email  E(4) Produit       F(5) Prix_Original
G(6) Code_U_Affilié ← identifiant unique
H(7) NomAffilié    I(8) Réduction_%  J(9) Montant_Final
K(10) vide         L(11) Statut      M(12) Notes
N(13) Source       O(14) Sync_Firebase ← log webhook
```

### Statuts Sheets → Firestore
| Sheets (col L)  | Firestore `statut`  |
|-----------------|---------------------|
| En attente      | `vente_en_cours`    |
| Payé / Confirmé | `en_attente`        |
| (admin action)  | `versee`            |

### Résolution du prescripteur dans le webhook (3 stratégies)
- **A** : `codes_sessions[codeStr]` → `prescripteur_partenaire_id`
- **B** : `prescripteurs_partenaires.where('code_promo_affilie', '==', codeStr)`
- **C** : lecture Affiliés_Codes Sheets → création Firestore à la volée (source: `strategie_c_webhook`)

---

## SCHÉMA PRESCRIPTEUR PARTENAIRE (champs obligatoires)

```typescript
{
  uid: string,                    // = doc.id
  nom_etablissement: string,
  type: 'hotel'|'restaurant'|'agence'|'bar'|'plage'|'autre',
  telephone: string,
  adresse: string,
  email: string,
  statut: 'actif'|'suspendu'|'expire',  // ← REQUIS pour getStatsCanalDeux
  remise_type: 'reduction_pct'|'non_financier',
  remise_valeur_pct: number|null,
  remise_description: string|null,
  redirection_prioritaire: 'boutique'|'hebergements',
  forfait_type: 'mensuel'|'annuel',
  forfait_montant_fcfa: number,
  forfait_debut: string,          // ISO
  forfait_expire_at: string,      // ISO
  forfait_statut: 'actif'|'expire'|'grace',
  qr_code_url: string,
  qr_code_data: string,           // URL QR
  qr_genere_le: string,           // ISO
  code_promo_affilie: string,     // ex: "MAMINDOR-2026"
  total_scans: number,
  total_codes_generes: number,
  total_utilisations: number,
  total_clients_uniques: number,
  total_ca_hebergements_fcfa: number,
  total_ca_boutique_fcfa: number,
  total_commissions_fcfa: number,
  created_at: string,
  created_by: string,

  // Champs visuels / abonnement Premium (ajoutés 2026-04-16)
  photoUrl?: string,              // URL Firebase Storage photo enseigne
  defaultImage?: string,         // image par défaut (1 seule, plan Free)
  subscriptionLevel?: 'free'|'premium',
  carouselImages?: string[],     // max 5 URLs Firebase Storage (plan Premium)
  premium_expire_at?: string,    // ISO — expiration abonnement Premium
}
```

**IMPORTANT** : tout doc créé via sync-affiliates ou Stratégie C DOIT avoir `statut: 'actif'` — sinon invisible dans `getStatsCanalDeux`.

---

## VARIABLES D'ENVIRONNEMENT

| Variable                  | Usage                                      |
|---------------------------|--------------------------------------------|
| `SHEETS_WEBHOOK_SECRET`   | Auth Apps Script → webhook                 |
| `ADMIN_API_KEY`           | Auth route `/api/admin/sync-affiliates`    |
| `GOOGLE_SHEETS_CANAL2_ID` | ID Google Sheet boutique                   |
| `GOOGLE_CLIENT_EMAIL`     | Service account email (éditeur du Sheet)   |
| `GOOGLE_PRIVATE_KEY`      | Clé privée service account                 |
| `ADMIN_WHATSAPP_PHONE`    | Numéro admin pour notifications WhatsApp   |
| `NEXT_PUBLIC_APP_URL`     | URL production Vercel                      |
| `FIREBASE_*`              | Credentials Firebase Admin SDK             |

---

## RÈGLES DE DÉVELOPPEMENT

### Firestore
- Toujours `Promise.all` pour les requêtes indépendantes (objectif < 200ms)
- Ne jamais écraser un code session existant — utiliser `.set()` seulement si absent
- Stats partenaire (`total_ca_boutique_fcfa`, `total_commissions_fcfa`) → incrémentées uniquement sur statut "Payé"/"Confirmé"

### Apps Script
- Fichier source : `scripts/google-apps-script-commandes.gs`
- Variables colonnes : `COL_CODE=6, COL_MONTANT=9, COL_STATUT=11, COL_LOG=14`
- Garde contre 429 : `codeExisteDansAffilies()` avant tout appel webhook
- Déduplication : `oldVal === newVal` → ignorer

### Git
- Toujours mettre à jour `CLAUDE_PROGRESS.md` après chaque commit important
- Format commit : `type(scope): description` — ex: `fix(canal2): ...`, `feat(dashboard): ...`

---

## PARAMÈTRES PLATEFORME (collection `parametres_plateforme/taux_et_forfaits`)

| Champ | Défaut | Description |
|---|---|---|
| `commission_partenaire_pct` | 10 | Canal 1 — commission hébergeur |
| `forfait_prescripteur_mensuel_fcfa` | 25000 | Canal 2 — forfait mensuel |
| `forfait_prescripteur_annuel_fcfa` | 250000 | Canal 2 — forfait annuel |
| `premium_prix_mensuel_fcfa` | 10000 | Abonnement Premium mensuel |
| `premium_prix_annuel_fcfa` | 100000 | Abonnement Premium annuel |
| `premium_nb_images` | 5 | Nb images carrousel (Premium) |
| `premium_duree_jours` | 365 | Durée abonnement Premium |
| `forfait_hotel_reservation_fcfa` | 2000 | Commission hôtel si réservation L&Lui |
| `commission_mototaxi_fcfa` | 1500 | Canal 3 — commission moto-taxi |
| `commission_commerciaux_pct` | 10 | Canal 4 — commission commercial |
| `partage_llui_pct` | 50 | Part L&Lui sur commission canal 4 |
| `partage_commercial_pct` | 50 | Part commercial sur commission canal 4 |

---

## ROUTES API ADMIN (Firebase Storage)

| Route | Méthode | Auth | Usage |
|---|---|---|---|
| `/api/admin/upload-photo-partenaire` | POST | cookie admin | Photo enseigne — resize 400×400 JPEG |
| `/api/admin/upload-carousel-image` | POST | cookie admin | Image carrousel — resize 1200×675 JPEG |
| `/api/admin/sync-affiliates` | POST | Bearer `ADMIN_API_KEY` | Sync Google Sheets → Firestore (UPSERT) |
| `/api/admin/merge-duplicates` | POST | Bearer `ADMIN_API_KEY` | Fusionne doublons prescripteurs |
| `/api/sheets-webhook` | POST | `SHEETS_WEBHOOK_SECRET` | Reçoit statut Sheets → commission Firestore |

---

## ROADMAP EN COURS (2026-04-16)

### Terminé ✅
- Dashboard partenaire : bouton Actualiser stats + onglet Mon Forfait + photo avatar
- Admin : upload photo + gestion carrousel 5 images Firebase Storage
- Admin : filtrage codes expirés (client-side `expire_at > Date.now()`)
- Paramètres plateforme : section Premium Vitrine (prix, nb images, durée)
- Fix JSX brace bug AdminCanalDeuxClient + sync-affiliates UPSERT anti-doublons

### À faire [ ]
- Code 6 chiffres maintenu simultanément dans Firestore ET col G Google Sheets
- `Promise.all` sur requêtes Firestore indépendantes (objectif < 200ms)
- Nettoyer doublons existants : `POST /api/admin/merge-duplicates` (Bearer token)
- Logs structurés : `[Sync Code Session]`, `[Webhook Success]`, `[Client Memory Found]`

Voir `CLAUDE_PROGRESS.md` pour le détail commit par commit.
