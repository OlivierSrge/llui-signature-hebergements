# CLAUDE.md — L&Lui Signature Hébergements

Instructions permanentes pour Claude Code sur ce projet.

---

## RÈGLE GIT ABSOLUE — PRIORITÉ MAXIMALE

- **TOUJOURS travailler sur `main` directement**
- **JAMAIS créer de branches** (`git checkout -b`, `git branch` → interdit)
- **JAMAIS créer de PR ou merge request**
- Chaque commit va directement sur main :
  ```
  git add -A && git commit -m "message" && git push origin main
  ```
- Si tu constates que tu es sur une autre branche → `git checkout main` immédiatement
- Si `git pull` échoue par divergence → `git reset --hard origin/main`

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
  carouselImages?: string[],     // max premium_nb_images URLs Firebase Storage (plan Premium)
  carousel_interval_sec?: number, // durée affichage par image (défaut 6s, configurable par le partenaire)
  premium_expire_at?: string,    // ISO — expiration abonnement Premium
  premium_activated_at?: string, // ISO — date d'activation Premium
}
```

**IMPORTANT** : tout doc créé via sync-affiliates ou Stratégie C DOIT avoir `statut: 'actif'` — sinon invisible dans `getStatsCanalDeux`.

**IMPORTANT** : `carouselImages.length` est contrôlé par `params.premium_nb_images` au moment du save. Ne jamais hardcoder 5 dans le code.

**IMPORTANT** : `getCodeSession` enrichit TOUJOURS la session avec les données live du partenaire (photoUrl, defaultImage, carouselImages, subscriptionLevel, carousel_interval_sec, nom_partenaire) pour éviter la staleness des données gelées dans `codes_sessions`.

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

### WhatsApp / Twilio — RÈGLE ABSOLUE
- **JAMAIS** importer `twilio` ou `lib/whatsappNotif` dans `actions/` ou `components/`
- **TOUJOURS** utiliser un helper local `fetch` vers `/api/whatsapp/send` :
  ```typescript
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
  async function sendWhatsApp(to: string, message: string): Promise<void> {
    await fetch(`${APP_URL}/api/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.ADMIN_API_KEY}` },
      body: JSON.stringify({ to, message }),
    }).catch((e) => console.warn('[sendWhatsApp]', e))
  }
  ```
- **Seul fichier autorisé** à importer `twilio` : `app/api/whatsapp/send/route.ts`
- **Raison** : `twilio` contient des native modules non bundlables par webpack SSR Next.js 14. Un import transitif dans le graphe SSR (action → whatsappNotif → twilio) provoque l'erreur digest SSR (`1347802925`).

### Architecture WhatsApp (twilio isolé)
```
Client / Server Action / Server Component
  ↓ fetch POST
/api/whatsapp/send  ← SEUL fichier important twilio
  ↓ Twilio SDK
WhatsApp destinataire
```

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

## ROUTES API ADMIN

| Route | Méthode | Auth | Usage |
|---|---|---|---|
| `/api/admin/upload-photo-partenaire` | POST | cookie admin | Photo enseigne — resize 400×400 JPEG |
| `/api/admin/upload-carousel-image` | POST | cookie admin | Image carrousel — resize 1200×675 JPEG |
| `/api/admin/sync-affiliates` | POST | Bearer `ADMIN_API_KEY` | Sync Google Sheets → Firestore (UPSERT) |
| `/api/admin/merge-duplicates` | POST | Bearer `ADMIN_API_KEY` | Fusionne doublons prescripteurs |
| `/api/admin/debug-session` | GET | `?key=ADMIN_API_KEY` | Inspecte session + partenaire + diagnostic affichage |
| `/api/admin/fix-subscription-levels` | GET | `?key=ADMIN_API_KEY` | Migration : pose `subscriptionLevel: 'premium'` si images présentes |
| `/api/admin/fix-code-session-links` | POST | Bearer `ADMIN_API_KEY` | Répare `prescripteur_partenaire_id` + complète docs incomplets |
| `/api/sheets-webhook` | POST | `SHEETS_WEBHOOK_SECRET` | Reçoit statut Sheets → commission Firestore |
| `/api/confirm-transaction` | GET | `?token=nanoid32` | Confirme transaction Stars — atomique, token usage unique |

---

## MOTEUR DE FIDÉLITÉ L&LUI STARS (ajouté 2026-04-17)

### Collections Firestore
```
clients_fidelite/{id}
  telephone: string           // clé de liaison (E.164)
  points_stars: number        // solde courant (dépensable)
  total_stars_historique: number // cumulatif pour palier
  membership_status: MembershipStatus
  otp_code?: string           // 6 chiffres, expire dans 10 min
  otp_expires_at?: string     // ISO
  created_at: Timestamp
  updated_at: Timestamp

transactions_fidelite/{id}
  client_id: string
  partenaire_id: string
  code_session: string
  montant_brut: number
  remise_appliquee: number
  montant_net: number
  stars_gagnees: number
  remise_pct: number          // snapshot
  multiplier: number          // snapshot
  valeur_star_fcfa: number    // snapshot
  status: 'pending'|'confirmed'|'cancelled'
  confirmation_token?: string // nanoid(32), usage unique, deleted après confirmation
  expires_at: string          // +1h après création
  confirmed_at?: Timestamp
  created_at: Timestamp
```

### Fichiers clés
| Fichier | Rôle |
|---|---|
| `lib/loyaltyEngine.ts` | Fonctions pures (getMembershipStatus, getNiveauPass, getRemisePct, getMultiplier, calculateStars, calculateRemiseAmount, canUseTransaction) |
| `lib/loyaltyEngine.test.ts` | Tests Jest (nécessite `npm install --save-dev jest @types/jest ts-jest`) |
| `actions/stars.ts` | Server actions : requestOtp, verifyOtpAndLinkClient, getClientFidelite, getPendingTransaction, processPartnerTransaction |
| `app/api/confirm-transaction/route.ts` | GET ?token= — confirme transaction atomiquement (db.runTransaction) |
| `components/ElectronicPass.tsx` | UI pass électronique (framer-motion, AnimatedCounter, progression vers palier) |

### Paliers et remises (défauts)
| Palier | Stars historique | Remise boutique | Multiplicateur |
|---|---|---|---|
| Novice | 0–24999 | 0% | ×1.0 |
| Explorateur (Argent) | 25000–74999 | 5% | ×1.0 |
| Ambassadeur (Or) | 75000–149999 | 10% | ×1.5 |
| Excellence (Platine) | ≥ 150000 | 20% | ×2.0 |

### Paramètres plateforme ajoutés (prefix `fidelite_`)
`fidelite_seuil_novice`, `fidelite_seuil_explorateur`, `fidelite_seuil_ambassadeur`, `fidelite_seuil_excellence`, `fidelite_remise_argent_pct`, `fidelite_remise_or_pct`, `fidelite_remise_platine_pct`, `fidelite_multiplicateur_argent`, `fidelite_multiplicateur_or`, `fidelite_multiplicateur_platine`, `fidelite_valeur_star_fcfa`, `fidelite_duree_pass_jours`, `fidelite_otp_template`

### Flux utilisateur
1. Client sur `/sejour/[code]` → saisit téléphone → `requestOtp` (SMS WhatsApp, OTP 10 min)
2. Saisit OTP → `verifyOtpAndLinkClient` → retourne `ClientFidelite`
3. `ElectronicPass` s'affiche avec solde, statut, progression
4. Partenaire appelle `processPartnerTransaction` → crée pending tx → envoie lien WhatsApp
5. Client clique lien → `GET /api/confirm-transaction?token=…` → `db.runTransaction` atomique
6. Client rechargé : `getPendingTransaction` → affiche transaction en attente

**IMPORTANT** : `actions/fidelite.ts` existe déjà (programme fidélité mariage/réservation — ne pas modifier). Tout le code Stars est dans `actions/stars.ts`.

**IMPORTANT** : `processPartnerTransaction` vérifie `canUseTransaction(solde_provision, starsGagnees, valeurStar)` AVANT de créer la transaction — si provision insuffisante, retourne erreur.

**IMPORTANT** : `confirmation_token` est supprimé avec `FieldValue.delete()` après confirmation — token à usage unique non réutilisable.

---

## ROADMAP EN COURS (2026-04-17)

### Terminé ✅
- Dashboard partenaire : bouton Actualiser stats + onglet Mon Forfait + photo avatar
- Admin : upload photo + gestion carrousel Firebase Storage (slots dynamiques `premium_nb_images`)
- Admin : filtrage codes expirés (client-side `expire_at > Date.now()`)
- Admin : renommage partenaire inline + prolongation forfait
- Paramètres plateforme : section Premium Vitrine (prix, nb images, durée) — **câblés dans toute l'app**
- Paramètres plateforme : section Stars — 13 paramètres fidelite_ avec aperçu temps réel
- Page client `/sejour/[code]` : carrousel corrigé (hooks, subscriptionLevel, images live, nom live)
- Page client `/sejour/[code]` : intégration Stars (phone/OTP/ElectronicPass)
- Durée carrousel paramétrable par le partenaire (preset + slider, sauvegardé en Firestore)
- Moteur de fidélité L&Lui Stars complet (loyaltyEngine, actions, API confirm, ElectronicPass UI)
- `ElectronicPass.tsx` : prop `avantages` → section "Les petits plus de cet établissement"
- Page confirm-transaction (`/api/confirm-transaction`) : HTML premium dark/gold avec animation Stars
- `StarTerminal.tsx` : terminal d'encaissement mobile-first (lookup client, calcul temps réel, provision badge)
- Dashboard partenaire : onglet "⭐ Stars" avec stats + StarTerminal intégré
- Firestore index composite `(partenaire_id, status, created_at)` sur `transactions_fidelite`
- Correctif régex JSX `AdminCanalDeuxClient.tsx` : `{/\* ... \*/}` → `{/* ... */}`
- **Isolation complète twilio** — digest SSR 1347802925 résolu : tous les `actions/` utilisent `fetch /api/whatsapp/send` (commits `a157b58`, `c2cdf17`)
- `debug-session` enrichi avec diagnostics env (`hasTwilioSid`, `hasTwilioToken`, `hasTwilioNumber`, `nodeEnv`)
- **Module "Dépenser ses Stars"** complet (2026-04-18) : types SpendTransaction/StarsMode, 5 Server Actions atomiques, 3 API routes, cron expire-spend 15min, StarTerminal onglet spend + polling, SejourClient mode earn/spend, 2 index Firestore

### À faire [ ]
- Vérifier sur Vercel que l'erreur digest 1347802925 est résolue
- Configurer variables Twilio sur Vercel : `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`, `ADMIN_API_KEY`, `NEXT_PUBLIC_APP_URL`
- Configurer `CRON_SECRET` sur Vercel (utilisé par `/api/cron/expire-spend`)
- Code 6 chiffres maintenu simultanément dans Firestore ET col G Google Sheets
- Logs structurés systématiques : `[Sync Code Session]`, `[Webhook Success]`, `[Client Memory Found]`
- Nettoyer doublons existants : `POST /api/admin/merge-duplicates` (Bearer token)
- Admin : UI top-up `solde_provision` des partenaires (panel admin inline)
- Déployer index Firestore : `firebase deploy --only firestore:indexes`

Voir `CLAUDE_PROGRESS.md` pour le détail commit par commit.
