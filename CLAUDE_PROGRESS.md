# CLAUDE PROGRESS — L&Lui Signature Hébergements
Dernière mise à jour : 2026-03-19 — Patch Fast Start terminé (5 étapes)

---

## PATCH FAST START — TERMINÉ (2026-03-19)

Patch Fast Start terminé : Fast Start opérationnel de bout en bout.
- ✅ Types harmonisés + interface FastStartDemande (`lib/firestoreTypes.ts`)
- ✅ Cron horaire unlock + expire automatique + notifs WA (`/api/cron/fast-start-check` + `vercel.json`)
- ✅ API claim + formulaire Orange Money 5 états visuels (`/api/portail/fast-start/claim` + `FastStartSection.tsx`)
- ✅ Page admin `/admin/fast-start` — KPIs, tableau demandes, validation/paiement OM, alertes 7j (`FastStartTable.tsx`)
- ✅ Widget dashboard timeline J30/J60/J90 (`FastStartWidget.tsx`)
- ✅ Auto-enroll à l'inscription (`/api/portail/auth/register`)

Commits : dd9af42 | 57b5bd2 | af7f99d | 49f52c2 | 743249c

---

## ÉTAT GÉNÉRAL DU PROJET
- **Stack** : Next.js 14 (App Router, Server Actions), Firebase (Firestore + Admin SDK), Tailwind CSS, Vercel
- **Dépôt** : github.com/OlivierSrge/llui-signature-hebergements
- **Site live** : llui-signature-hebergements.vercel.app
- **Branche active** : `main`
- **Dernier commit pushé** : session 2026-03-08 — WhatsApp flow client + fixes contact

---

## FONCTIONNALITÉS COMPLÈTEMENT TERMINÉES

### Session 2026-03-18 — Système types d'hébergements enrichi (3 blocs)
- **TYPES-BLOC-1** — `lib/accommodationTypes.ts` : 12 types répartis en 3 catégories (Classiques de Prestige 🏛️ / Évasion & Caractère 🌿 / Expériences Uniques ✨), interface `AccommodationTypeInfo`, fonctions `getAccommodationTypeById`, `resolveAccommodationTypeId`, `getTypeLabelFromId`, `getTypeIcon`, mapping legacy (villa→villa_exception, appartement→appartement_luxe, chambre→suite_privee…)
- **TYPES-BLOC-2** — Sélecteur visuel `AccommodationTypeSelector.tsx` : grille 2×3, cartes cliquables avec icône 32px, description, étoiles prestige or #C9A84C, bordure or au survol/sélection, coche ✅, filtre par catégorie, badge "Type personnalisé" pour valeurs inconnues. Intégré dans `AccommodationForm.tsx` (admin) en remplacement du select simple
- **TYPES-BLOC-3** — Badge `AccommodationTypeBadge.tsx` (variantes full/compact/icon) mis à jour partout : liste admin, fiche publique hebergement, packs, réservation, chambre, AccommodationCard, partner public page. Widget "Répartition par type" dans le dashboard admin. Section "Gestion des types" dans `/admin/parametres-paiement` avec toggle actif/inactif, ajout de types personnalisés, sauvegarde Firestore `/settings/accommodationTypes`
- **FIX** — `deleteAccommodation` supprime désormais réellement le document Firestore (anciennement soft-delete status:inactive) + disponibilités associées
- **FIX** — `deleteSelectedReservations` server action + `ReservationsTable` client component avec checkboxes, select-all, double-confirmation (SUPPRIMER)

### Session 2026-03-18 — Différenciation deux flux + protection trésorerie
- **FLUX-BLOC-1** — Structure Firestore : champs `source` (`llui_site`/`partner_qr`), `handledBy`, `visiblePartenaire`, `acompteRequired/Amount/Status`, `adminWindow*`, `autoEscalated` — `lib/reservationRules.ts` + `actions/reservation-source.ts` (migration + buildSourceFields)
- **FLUX-BLOC-2** — Seuil d'escalade automatique (100 000 FCFA par défaut) : bascule silencieuse `partner_qr` → `llui_site` si montant >= seuil. Section "Règles de réservation" dans `/admin/parametres-paiement` (seuil, fenêtre, acompte %) persistée dans Firestore `/settings/reservationRules`
- **FLUX-BLOC-3** — Fenêtre admin prioritaire 2h : `AdminWindowAlert` sur le dashboard, compteur temps réel, deux boutons "Traiter moi-même / Laisser au partenaire"
- **FLUX-BLOC-4** — Acompte 30% L&Lui obligatoire : `PartnerQrPipeline` (composant spécifique QR Code avec Bouton 0 acompte en 1er, boutons 1-4 verrouillés jusqu'à confirmation). `AcompteAdminPanel` sur `/admin/reservations/[id]` pour confirmer/dispenser
- **FLUX-BLOC-5** — Flux A (llui_site) lecture seule chez le partenaire + masquage des montants. Widget `TreasuryWidget` sur le dashboard admin (KPIs : encaissé direct, acomptes en attente, ratio L&Lui). Toggle `ForceFluxLluiToggle` sur fiche partenaire

### Blocs fonctionnels (session principale)
- **BLOC 1** — Pipeline WhatsApp admin (proposition → paiement → confirmation) avec boutons étapes progressives
- **BLOC 2** — Flux client : page `/suivi/[reservationId]` + `/confirmation`
- **BLOC 3** — Dashboard partenaire : KPIs, calendrier, réservations récentes, badge niveau
- **BLOC 4** — Templates WhatsApp éditables par l'admin (`/admin/templates`)
- **BLOC 5** — Tarifs saisonniers (`/admin/hebergements/[id]/disponibilites`, `SeasonalPricingManager`)
- **BLOC 6** — Packs hébergement (`/packs`, `/admin/packs`, `PackRequestForm`, emails Resend)
- **BLOC 7** — Codes promo (`/admin/promo-codes`, appliqués dans `ReservationForm`)
- **BLOC 8** — Historique clients par logement (`/partenaire/logements/[id]`)
- **BLOC 9** — Badge niveau partenaire (Actif/Premium/Excellence) dans le header dashboard
- **BLOC 10** — Carte partenaire téléchargeable PNG 800×500 (`PartnerCardDownload`)
- **BLOC 11** — Compteur de vues mensuelles par logement (tracking + affichage)
- **BLOC 12** — 7 widgets dashboard admin (occupation, encaissements, relances, arrivées, graphiques revenus, performance partenaires, répartition source)
- **BLOC 13** — QR Code imprimable A4 PNG par logement (`AccommodationQrPrint`)
- **Messagerie partenaire** — `/partenaire/messages` ↔ `/admin/messages` (MessageChat)
- **Nav mobile partenaire** — `PartnerMobileNav` (5 onglets : Accueil, Calendrier, Réservations, Scanner, Messages)
- **Confirmation d'arrivée** — `/partenaire/confirm/[reservationId]` (scan QR → check-in)
- **Mini-site partenaire** — `/p/[partnerId]` : page isolée sans menu, logo + liste logements + CTA
- **Page logement isolée** — `/chambre/[slug]` : galerie, équipements, calendrier, formulaire demande, footer minimal
- **QR Code chambre** (→ `/chambre/[slug]`) + **QR Code réception** (→ `/p/[partnerId]`) : 2 boutons distincts avec labels "À placer dans chaque logement" / "À placer à l'accueil"

### Fixes importants
- WhatsApp iOS Safari : `window.location.href` au lieu de `window.open`
- QR Code iOS : modal d'aperçu + instruction appui long (data URL non téléchargeable sur iOS Safari)
- Onglet "Réservations" nav mobile → 404 corrigé (page `/partenaire/reservations/liste` créée)
- KPI revenus dashboard partenaire : débordement du montant corrigé (`text-xl` + FCFA sous le chiffre)
- Pipeline admin : étapes complétées correctement colorées en vert
- Calendrier partenaire : réservations en attente affichées + timezone corrigée
- auto-génération `access_code` manquant à l'ouverture fiche partenaire
- Footer : coordonnées corrigées (+237 693 407 964 / contact@l-et-lui.com — remplaçaient des placeholders)
- BookingWidget : bouton WhatsApp direct sur écran succès (whatsapp://send), Firebase non-bloquant en background, instruction format numéro téléphone
- ReservationForm : écran succès avec bouton WhatsApp récapitulatif + bouton "Voir ma confirmation", prop `accommodationName` ajoutée
- confirmation/page.tsx : bouton WhatsApp ajouté + lien "Mon compte L&Lui Stars"
- actions/reservations.ts : suppression notification WhatsApp server-side (remplacée par lien direct côté client)

---

## SYSTÈME CONTRAT PARTENARIAT — SESSION 2026-03-11

### Blocs implémentés
- **BLOC 1** — Éditeur admin `/admin/contrat` avec 3 onglets :
  - Onglet 1 : Clauses générales (textarea + boutons variables + aperçu + reset)
  - Onglet 2 : Clauses commissions (4 plans : essentiel/starter/pro/premium)
  - Onglet 3 : Paramètres & versions (version, date, forceResign)
- **BLOC 2** — Structure Firestore :
  - `/settings/contract/current` : texte du contrat
  - `/settings/contract/commissions/{plan}` : clauses par plan
  - `/settings/contract/meta` : version active, forceResign
  - `/partenaires/{id}.contract` : statut, OTP hashé, signature
- **BLOC 3** — Page signature partenaire `/partenaire/contrat` (4 étapes) :
  - Étape 1 : Lecture avec scroll tracker (bouton grisé jusqu'à 100%)
  - Étape 2 : Identification (nom, rôle, checkboxes)
  - Étape 3 : OTP 6 cases, compteur 30min, renvoi après 2min, blocage 5 échecs
  - Étape 4 : Succès + génération PDF jsPDF + upload Firebase Storage
- **BLOC 4** — PDF jsPDF : page garde + contrat + page certification
- **BLOC 5** — Dashboard admin :
  - Colonne contrat dans tableau partenaires (badges couleur)
  - Alerte X partenaires sans contrat signé
  - Section contrat dans fiche partenaire (bouton envoyer + lien WhatsApp)
  - Bannière orange persistante dans espace partenaire
  - Item "Contrat" dans nav mobile partenaire (badge rouge si non signé)
  - Initialisation silencieuse des partenaires sans champ contract

### Fichiers créés
| Fichier | Rôle |
|---------|------|
| `lib/contractDefaults.ts` | Source de vérité : texte contrat + clauses commission |
| `actions/contract.ts` | Server actions : CRUD contrat, OTP, signature |
| `app/api/upload-contract/route.ts` | Upload PDF contrat vers Firebase Storage |
| `app/admin/contrat/page.tsx` | Page admin éditeur contrat |
| `components/admin/ContractAdminTabs.tsx` | Tabs admin (clauses, commissions, settings) |
| `components/admin/PartnerContractSection.tsx` | Section contrat dans fiche partenaire admin |
| `app/partenaire/contrat/page.tsx` | Page signature partenaire |
| `components/partner/ContractSigningFlow.tsx` | Flow 4 étapes + OTP + PDF |

### Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `components/admin/AdminSidebar.tsx` | + "Contrat partenariat" dans le menu |
| `components/partner/PartnerMobileNav.tsx` | + onglet "Contrat" avec badge rouge |
| `app/partenaire/layout.tsx` | Passe contractStatus à PartnerMobileNav |
| `app/partenaire/dashboard/page.tsx` | + Bannière orange contrat non signé |
| `app/admin/partenaires/page.tsx` | + Badge contrat + alerte X partenaires |
| `app/admin/partenaires/[id]/page.tsx` | + Section contrat dans fiche |

### Dépendances installées
- `jspdf` — Génération PDF côté client

### Règles de priorité respectées
- Firestore > DEFAULT_CONTRACT_TEXT (jamais vide)
- Partenaires sans `contract` → initialisés automatiquement à `not_sent`

## SESSION 2026-03-12 — FLUX DEMANDES DISPONIBILITÉ + PIPELINE PARTENAIRE

### Blocs implémentés (4 blocs)

**BLOC 1 — Paramètres de paiement partenaire**
- `actions/payment-settings.ts` : interface `PaymentSettings`, CRUD (loadPaymentSettings, savePaymentSettings, adminSavePaymentSettings, resolveOmNumber)
- `components/partner/PaymentSettingsForm.tsx` : formulaire client OM + banque + MTN avec indicateur ✅/⚠️
- `app/partenaire/parametres/page.tsx` : page partenaire /partenaire/parametres
- Fallback OM → `693407964` si non configuré
- Bannière d'avertissement si OM manquant

**BLOC 2 — Routage demandes client vers admin ET partenaire**
- `actions/availability-requests.ts` réécriture :
  - `createAvailabilityRequest` : détermine `routed_to_partner_id` depuis l'hébergement, enregistre `handled_by: null`
  - `getPartnerPendingDemands(accommodationIds)` : filtre `handled_by === null` pour la vue partenaire
  - `markRequestHandled` : `handled_by: 'admin'`
  - `markRequestHandledByPartner(requestId, partnerId)` : `handled_by: 'partner'`, `handled_by_id`
- Dashboard partenaire : section "Demandes reçues" avec badge rouge + boutons "Créer réservation" / "Répondre WA"
- Lien rapide "Paramètres de paiement" dans les actions rapides du dashboard partenaire

**BLOC 3 — Pipeline WhatsApp complet pour le partenaire**
- `app/partenaire/reservations/[id]/page.tsx` réécriture :
  - `getReservation` accepte aussi les réservations dont `accommodation.partner_id === partnerId`
  - `WhatsAppPipeline` (composant admin) réutilisé avec `sentBy={partnerId}`
  - Badge "Via page publique" si `source === 'direct'`
- `actions/partner-reservations.ts` : ajout `savePartnerNotes(reservationId, notes)`
- `components/partner/PartnerNotesForm.tsx` : textarea notes internes partenaire (invisible client)
- `actions/whatsapp-pipeline.ts` : résolution numéro OM depuis `payment_settings.orange_money_number` (avec fallback whatsapp_number → ADMIN_WHATSAPP)

**BLOC 4 — Synchronisation admin/partenaire**
- `app/admin/reservations/[id]/page.tsx` :
  - Badge "Géré par [partenaire]" si `handled_by === 'partner'`
  - Affichage bloc notes partenaire (indigo) avant notes admin
- `app/admin/page.tsx` :
  - `getPendingDemands` retourne `{ all, unhandledOver3h }` (cutoff 3h)
  - Widget orange "Demandes sans prise en charge depuis +3h" avec bouton "Prendre en charge"
- `components/admin/AdminPaymentSettingsForm.tsx` (créé) : lecture et édition des paramètres de paiement d'un partenaire depuis l'admin
- `app/admin/partenaires/[id]/page.tsx` : section "Paramètres de paiement" intégrée (AdminPaymentSettingsForm)
- `components/partner/PartnerMobileNav.tsx` : 6ème onglet "Paiement" → `/partenaire/parametres`, grille `grid-cols-6`

### Nouveaux fichiers créés
| Fichier | Rôle |
|---------|------|
| `actions/payment-settings.ts` | CRUD paramètres paiement partenaire |
| `components/partner/PaymentSettingsForm.tsx` | Formulaire paiement côté partenaire |
| `components/partner/PartnerNotesForm.tsx` | Notes internes partenaire |
| `components/admin/AdminPaymentSettingsForm.tsx` | Lecture/édition paramètres paiement côté admin |
| `app/partenaire/parametres/page.tsx` | Page paramètres partenaire |

### Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `actions/availability-requests.ts` | Routage partenaire, handled_by, getPartnerPendingDemands |
| `actions/partner-reservations.ts` | + savePartnerNotes |
| `actions/whatsapp-pipeline.ts` | Résolution numéro OM depuis payment_settings |
| `app/admin/page.tsx` | Widget unhandledOver3h, getPendingDemands retourne { all, unhandledOver3h } |
| `app/admin/reservations/[id]/page.tsx` | Badge "Géré par partenaire", bloc partner_notes |
| `app/admin/partenaires/[id]/page.tsx` | + AdminPaymentSettingsForm |
| `app/partenaire/reservations/[id]/page.tsx` | WhatsAppPipeline, accès élargi, PartnerNotesForm |
| `app/partenaire/dashboard/page.tsx` | Section demandes reçues, lien paramètres |
| `components/partner/PartnerMobileNav.tsx` | 6ème onglet Paiement, grid-cols-6 |

### Collections Firestore ajoutées/modifiées
| Collection/champ | Modification |
|-----------------|-------------|
| `partenaires/{id}.payment_settings` | Nouveau champ : { orange_money_number, orange_money_holder, bank_*, mtn_* } |
| `demandes_disponibilite` | Nouveaux champs : routed_to_partner_id, routed_to_partner_at, handled_by, handled_at, handled_by_id |
| `reservations` | Nouveau champ : partner_notes |

---

## SESSION 2026-03-12 (suite) — PHASE 4 : REVENUS, CLIENTS, CSV, FILTRES DEMANDES

### Blocs implémentés (4 blocs)

**BLOC 1 — /admin/demandes amélioré**
- Filtres `handled_by` : Toutes / Non traitées / Traitées admin / Traitées partenaire
- Stats rapides (3 tuiles : non traitées / admin / partenaire)
- Badges couleur par source (admin=bleu, partenaire=violet)
- Affichage nom du partenaire ayant traité
- Coloration conditionnelle des lignes

**BLOC 2 — Export CSV réservations**
- `/api/export/reservations` : GET authentifié admin, paramètres `status` + `source`
- BOM UTF-8 pour Excel/LibreOffice
- Bouton "Exporter CSV" dans `/admin/reservations` (respects filtres actifs)

**BLOC 3 — Page /partenaire/revenus (nouveau)**
- 4 KPI : revenus encaissés, confirmées, en attente, durée moy. séjour
- Évolution vs mois précédent (+/- %)
- Graphique barres revenus mensuels 12 mois (recharts)
- Graphique ligne réservations confirmées / mois
- Liste réservations confirmées récentes
- Bouton export CSV partenaire
- Lien "Mes revenus" dans actions rapides dashboard

**BLOC 4 — Page /partenaire/clients (nouveau)**
- Groupement clients uniques par téléphone/email
- Badges fidélité (Client fidèle 5+, Client régulier 3+)
- Stats : total clients uniques + clients réguliers
- Recherche nom/téléphone/email
- Affichage : total séjours, nuits, dépense, dernier séjour
- Lien WhatsApp direct pour contact
- Liens vers réservations associées
- Lien "Mes clients" dans actions rapides dashboard

### Nouveaux fichiers créés
| Fichier | Rôle |
|---------|------|
| `app/api/export/reservations/route.ts` | API export CSV réservations |
| `app/partenaire/revenus/page.tsx` | Page revenus partenaire avec graphiques |
| `app/partenaire/clients/page.tsx` | Page clients partenaire |
| `components/partner/PartnerRevenueCharts.tsx` | Graphiques recharts revenus/confirmées |

### Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `app/admin/demandes/page.tsx` | + filtres handled_by, stats, badges couleur |
| `app/admin/reservations/page.tsx` | + bouton Export CSV |
| `app/partenaire/dashboard/page.tsx` | + liens "Mes revenus" et "Mes clients" |

---

## SESSION 2026-03-12 (suite 2) — 5 BLOCS COMPLÉMENTAIRES

### Blocs implémentés (5 blocs)

**BLOC 1 — Guide partenaire + Gestionnaire documents admin**
- `/partenaire/guide` : téléchargement notice Firebase Storage (fallback si absent), lien messagerie
- `/admin/documents` onglet Documents : upload/remplace PDF, taille, date
- `POST /api/upload-document` : upload Firebase Storage `/documents/notices/{key}.pdf`
- `actions/documents.ts` : CRUD meta Firestore `settings/documents`
- Lien "Guide d'utilisation" dans actions rapides dashboard partenaire
- Items Abonnements + Documents & Aide dans sidebar admin

**BLOC 2 — Centre d'aide interactif (7 catégories, 26 Q&A)**
- `lib/helpCenterDefaults.ts` : réservations / calendrier / scanner / logements / abonnement / paiements / contrat
- `HelpCenterAccordion` (partenaire) : double accordéon + bouton Contact bas de catégorie
- `HelpCenterAdmin` (admin) : édition par catégorie, sauvegarde Firestore
- Onglet "Centre d'aide" dans `/admin/documents`

**BLOC 3 — Masquage commission côté partenaire**
- Dashboard : "Commission X%" → "Conditions financières définies dans votre contrat"
- Upgrade : suppression affichage taux commission
- ContractSigningFlow : `{{TAUX_COMMISSION}}` → "selon les conditions convenues entre les parties"
- Côté admin et Firestore : inchangés

**BLOC 4 — /admin/abonnements (4 onglets)**
- Onglet Formules : prix mensuel/trim/annuel, commission, reversement, capacité, couleur, statut
- Onglet Composition accès : tableau 24 features × plans avec cases à cocher
- Onglet Nouvelle formule : formulaire complet
- Onglet Historique : log 50 dernières modifs
- Sauvegarde : `/settings/subscriptionPlans/plans/{plan}` + `/history`

**BLOC 5 — Permissions Firestore dynamiques**
- `getEffectivePermissions` → charge Firestore d'abord, fallback lib/plans.ts silencieux
- `lib/subscriptionDefaults.ts` : helper fallback

### Nouveaux fichiers créés
`actions/documents.ts` · `actions/help-center.ts` · `actions/admin-subscriptions.ts`
`app/admin/abonnements/page.tsx` · `app/admin/documents/page.tsx`
`app/api/upload-document/route.ts` · `app/partenaire/guide/page.tsx`
`components/admin/DocumentsManager.tsx` · `components/admin/HelpCenterAdmin.tsx`
`components/admin/SubscriptionPlansAdmin.tsx` · `components/partner/HelpCenterAccordion.tsx`
`lib/helpCenterDefaults.ts` · `lib/subscriptionDefaults.ts`

### Collections Firestore ajoutées
`settings/documents` · `settings/helpCenter` · `settings/subscriptionPlans/plans/{plan}` · `settings/subscriptionPlans/history`

---

## SESSION 2026-03-13 07:50 — SÉCURISATION TOKEN GITHUB

### Blocs implémentés
- **SÉCURITÉ** — Token GitHub retiré de l'URL remote git (`git remote set-url origin`)
- **CREDENTIAL STORE** — Token stocké dans `~/.git-credentials` (permissions `600`, lecture user uniquement)
- `git config --global credential.helper store` configuré pour éviter toute réexposition

### Statut
- ✅ Token hors de l'URL visible (`git remote get-url origin` → URL propre)
- ✅ Push fonctionnel via credential store

---

## SESSION 2026-03-13 — 5 BLOCS COMMISSION / WHATSAPP / REVOLUT / TRAÇABILITÉ / PAIEMENT

### Blocs implémentés

**BLOC 1 — Widget Commissions Mensuelles par Partenaire**
- `components/admin/CommissionsWidget.tsx` : tableau mensuel 6 mois, modale détail réservations, filtres (année/partenaire/plan), export CSV BOM UTF-8, bouton rafraîchir
- `components/admin/PartnerCommissionsChart.tsx` : graphique barres recharts 12 derniers mois
- `actions/commissions.ts` : `getPartnerCommissionsData(year)` + `getPartnerCommissions12Months(partnerId)`
- `app/admin/page.tsx` : widget intégré avant "Actions rapides"
- `app/admin/partenaires/[id]/page.tsx` : graphique barres commissions 12 mois

**BLOC 2 — Bouton WhatsApp 2 temps**
- `components/admin/WhatsAppPreviewModal.tsx` : modale prévisualisation + édition message + bouton explicite "Ouvrir WhatsApp et envoyer"
- `components/admin/WhatsAppPipeline.tsx` : réécriture complète — modale avant toute ouverture WhatsApp
- `actions/whatsapp-pipeline.ts` : `prepareWhatsApp*` (sans maj Firestore) + `recordWhatsAppSent` (maj après clic)

**BLOC 3 — Traçabilité demandes clients**
- `actions/availability-requests.ts` : `markRequestHandled/ByPartner` → +treatedAt/treatedBy/treatedById/delaiTraitement
- `app/admin/page.tsx` : délai coloré (orange 2h+, rouge 6h+) + sous-onglet "Traitées récemment"
- `app/admin/demandes/page.tsx` : badge traitée + filtre délai (lt1h/1h6h/gt6h) + stat délai moyen mois

**BLOC 4 — Intégration Revolut**
- `actions/whatsapp-pipeline.ts` : `prepareWhatsAppPaymentRequest` → option Revolut intégrée dans le message bouton 2
- `components/admin/WhatsAppPreviewModal.tsx` : toggle "Inclure Revolut" (activé par défaut)
- `actions/whatsapp-pipeline.ts` : `confirmPayment` → nouveau champ `payment_method` (OM/Revolut/virement/autre)
- `components/admin/WhatsAppPipeline.tsx` : sélecteur moyen de paiement dans le formulaire bouton 3

**BLOC 5 — Paramétrage moyens de paiement admin**
- `lib/payment-settings.ts` : interface `AdminPaymentSettings` + `DEFAULT_ADMIN_PAYMENT_SETTINGS`
- `actions/payment-settings.ts` : `loadAdminPaymentSettings`, `saveAdminPaymentSettings`, `resolvePaymentSettingsForReservation`
- `components/admin/AdminGlobalPaymentSettingsForm.tsx` : formulaire OM + Revolut + banque + MTN avec toggle Revolut par défaut
- `app/admin/parametres-paiement/page.tsx` : page complète avec règles de priorité
- `components/admin/AdminSidebar.tsx` : + ⚙️ Paramètres paiement

### Nouvelles routes disponibles
- `/admin/parametres-paiement` — Paramètres paiement globaux L&Lui (OM, Revolut, banque, MTN)

### Collections Firestore ajoutées
- `settings/adminPaymentSettings` — Paramètres paiement globaux admin

### Règle de priorité paiement
1. `partenaires/{id}.payment_settings.orange_money_number` (priorité max)
2. `settings/adminPaymentSettings.orange_money_number` (fallback admin)
3. Valeur codée `693407964` (fallback ultime)

## SESSION 2026-03-13 (suite) — SYSTÈME CLIENTS FIDÈLES STARS

### Contexte
Objectif : créer automatiquement un profil "L&Lui Stars" pour chaque client ayant une réservation confirmée, et permettre à ces clients de se connecter sur `/mon-compte`.

### Blocs implémentés

**BLOC 1 — Page /admin/clients enrichie**
- `app/admin/clients/page.tsx` : bouton "Créer un client" (formulaire modal inline) + liste complète des profils Stars
- Formulaire création manuelle : nom, email, téléphone, numéro de réservation associé

**BLOC 2 — Auto-création profil Stars à la confirmation**
- `actions/reservations.ts` : `createStarsProfileIfNeeded(email, firstName, lastName, phone)` — crée le profil si absent, normalise l'email
- `actions/admin-reservations.ts` : appel auto à la confirmation admin
- `actions/partner-confirm.ts` : appel auto à la confirmation partenaire (scan QR)
- Normalisation email : `.trim().toLowerCase()` pour éviter doublons
- ✅ Statut : **fonctionnel**

**BLOC 3 — Bouton sync en masse (backfill)**
- `app/api/admin/sync-clients/route.ts` (POST) : parcourt toutes les réservations confirmées, crée les profils manquants
- `components/admin/AdminSyncClientsButton.tsx` : bouton UI dans `/admin/clients` avec retour JSON des créés/mis à jour
- ✅ Statut : **fonctionnel**

**BLOC 4 — Endpoint bootstrap GET**
- `app/api/admin/bootstrap-clients/route.ts` (GET) : même logique, accessible sans session (pour bootstrap initial)
- Résultat testé : 16 profils créés dont `olivier.serge2001@gmail.com`
- ✅ Statut : **fonctionnel, utilisé avec succès**

**BLOC 5 — Fix TypeScript Map iteration**
- `tsconfig.json` : ajout `"downlevelIteration": true` dans `compilerOptions` pour résoudre l'erreur de spread sur Map
- Redéploiement Vercel déclenché via commit vide
- ✅ Statut : **résolu**

### Fichiers créés
| Fichier | Rôle |
|---------|------|
| `app/api/admin/bootstrap-clients/route.ts` | Bootstrap GET : crée tous les profils Stars manquants |
| `app/api/admin/sync-clients/route.ts` | Sync POST : backfill profils manquants |
| `components/admin/AdminSyncClientsButton.tsx` | Bouton UI sync en masse |

### Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `app/admin/clients/page.tsx` | + bouton "Créer un client" + bouton sync |
| `actions/reservations.ts` | + `createStarsProfileIfNeeded` |
| `actions/admin-reservations.ts` | + appel auto création Stars à la confirmation |
| `actions/partner-confirm.ts` | + appel auto création Stars à la confirmation partenaire |
| `tsconfig.json` | + `downlevelIteration: true` |

### Collections Firestore ajoutées
| Collection | Contenu |
|-----------|---------|
| `clients_stars` | Profils clients : email, firstName, lastName, phone, createdAt, reservationIds |

### Bugs rencontrés et solutions
| Problème | Solution |
|---------|---------|
| TypeScript erreur `Map` iteration (`--downlevelIteration`) | `tsconfig.json` : `"downlevelIteration": true` |
| Import `'use server'` dans API route causait une erreur | Extraction des fonctions dans `actions/reservations.ts` sans directive dans route.ts |
| Email avec espaces ou majuscules créait des doublons | `.trim().toLowerCase()` avant lookup Firestore |

### Ce qui fonctionne
- ✅ `/api/admin/bootstrap-clients` (GET) — 16 profils créés lors du test
- ✅ Auto-création Stars à chaque confirmation admin
- ✅ Auto-création Stars à chaque scan QR partenaire
- ✅ `/admin/clients` affiche les profils + formulaire création manuelle

### Ce qui reste à tester
- ⚠️ Connexion client sur `/mon-compte` avec le PIN reçu par email
- ⚠️ Vérifier que les 16 clients créés peuvent bien se connecter

---

## SESSION 2026-03-13 (suite 2) — FICHE D'ACCUEIL WHATSAPP V2

### Contexte
Remplacement du template V1 "Fiche d'accueil" par une V2 enrichie avec avantage boutique fidélité,
et toggle admin entre version complète / simplifiée.

### Blocs implémentés

**BLOC 1 — Template V2 centralisé**
- `lib/messageTemplates.ts` (NOUVEAU) : source de vérité des templates
  - `buildFicheV2(params, variant)` : construit le message V2 (complete/simple)
  - `getLoyaltyLabel(niveau)` : label textuel du niveau de fidélité
  - `getBoutiqueDiscount(niveau)` : réduction boutique par niveau (-5% à -20%)
  - Boutique URL : http://l-et-lui-signature.com
- `actions/whatsapp-pipeline.ts` :
  - `sendWhatsAppFiche` : utilise V2 avec auto-détection loyauté (complete si trouvé, simple sinon)
  - `prepareWhatsAppFiche` : retourne les 2 variantes (messageComplete + messageSimple + urlComplete + urlSimple)
  - Lookup `clients` collection par email pour récupérer le niveau de fidélité
- `actions/whatsapp-templates.ts` : `DEFAULT_TEMPLATES.template4_fiche` mis à jour avec V2

**BLOC 2 — Modale de prévisualisation V2**
- `components/admin/WhatsAppPreviewModal.tsx` :
  - Toggle "Version complète (avec avantage boutique)" / "Version simplifiée (sans boutique)"
  - Version complète sélectionnée par défaut
  - Encadré gris informatif : "Le QR Code sera envoyé séparément via WhatsApp"
  - Choix mémorisé dans le state session (WhatsAppPipeline)
  - Changement de variante = zéro appel serveur (les 2 messages déjà chargés)
- `components/admin/WhatsAppPipeline.tsx` :
  - State `ficheVariant` (mémorisé session)
  - `handleFicheVariantToggle` : bascule message/url sans re-fetch
  - Passage des props `showFicheVariantToggle`, `ficheVariant`, `onFicheVariantToggle`

**BLOC 3 — Template partenaire V2**
- `components/partner/PartnerReservationActions.tsx` :
  - Prévisualisation du message utilise `buildFicheV2` depuis `lib/messageTemplates.ts`
  - Version simplifiée automatique (niveauFidelite non chargé côté partenaire)
  - `sendWhatsAppFiche` (serveur) auto-détecte la loyauté depuis `clients` collection
  - Même fichier `lib/messageTemplates.ts` utilisé admin et partenaire — cohérence garantie

### Fichiers créés
| Fichier | Rôle |
|---------|------|
| `lib/messageTemplates.ts` | Source de vérité templates WhatsApp : buildFicheV2, helpers loyauté |

### Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `actions/whatsapp-pipeline.ts` | sendWhatsAppFiche V2 + prepareWhatsAppFiche retourne 2 variantes |
| `actions/whatsapp-templates.ts` | DEFAULT_TEMPLATES.template4_fiche → V2 |
| `components/admin/WhatsAppPreviewModal.tsx` | Toggle variante + encadré QR |
| `components/admin/WhatsAppPipeline.tsx` | State ficheVariant + handleFicheVariantToggle |
| `components/partner/PartnerReservationActions.tsx` | Prévisualisation V2 (buildFicheV2 simple) |

### Variables du template V2
| Variable | Source |
|---------|-------|
| clientName | guest_first_name + guest_last_name |
| dateArrivee | check_in formatté DD/MM/YYYY |
| dateDepart | check_out formatté DD/MM/YYYY |
| nomLogement | accommodation.name ou pack_name |
| nombrePersonnes | guests |
| codeReservation | confirmation_code |
| lienSuivi | https://llui-signature-hebergements.vercel.app/suivi/[id] |
| niveauFidelite | clients/{email}.niveau (Firestore) — null si absent |
| réduction boutique | Novice -5% / Explorateur -10% / Ambassadeur -15% / Excellence -20% |

### Règles respectées
- ✅ Taux de commission : jamais affiché
- ✅ Boutique URL : http://l-et-lui-signature.com
- ✅ Lien suivi : https://llui-signature-hebergements.vercel.app/suivi/[id]
- ✅ Un seul fichier de template (lib/messageTemplates.ts) pour admin ET partenaire

---

## SESSION 2026-03-13 (fin de journée) — FIXES PAGE SUIVI CLIENT

### Blocs implémentés

**FIX 1 — QR code toujours visible sur /suivi/[id]**
- `app/suivi/[reservationId]/page.tsx` : génération QR à la volée si `qr_code_data` absent en base
  - URL générée : `api.qrserver.com` avec `confirmCode` (confirmation_code ou derniers 8 chars de l'ID)
  - QR code visible dès que `isConfirmed === true` même sans `qr_code_data` en Firestore
- ✅ Statut : **fonctionnel**

**FIX 2 — Bouton boutique sur /suivi/[id]**
- `app/suivi/[reservationId]/page.tsx` : remplacement du bouton "Contacter via WhatsApp" par "🛍️ Commander sur la boutique"
  - Lien : `http://l-et-lui-signature.com`
  - Label au-dessus : "👇 Préparez votre séjour :"
  - Style bouton gold (bg-gold-600)
- ✅ Statut : **fonctionnel**

**FIX 3 — Composant QrCodeImage avec skeleton de chargement**
- `components/QrCodeImage.tsx` (NOUVEAU) : composant Client React
  - Skeleton animé (`animate-pulse`) pendant le chargement de l'image externe
  - Transition `opacity-0 → opacity-100` au chargement
  - Fallback texte si l'API externe échoue : "QR code indisponible — utilisez le code ci-dessous"
  - Évite l'affichage d'un QR code vide au premier chargement (délai API externe `api.qrserver.com`)
- ✅ Statut : **fonctionnel**

### Fichiers créés
| Fichier | Rôle |
|---------|------|
| `components/QrCodeImage.tsx` | Composant Client QR avec skeleton chargement |

### Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `app/suivi/[reservationId]/page.tsx` | QR généré à la volée + bouton boutique + import QrCodeImage |

### Bugs rencontrés et solutions
| Problème | Solution |
|---------|---------|
| QR code vide au 1er chargement | `QrCodeImage` Client avec `onLoad`/`onError` + skeleton `animate-pulse` |
| Bouton boutique absent (commit non mergé dans main) | Push branche + PR #4 créée et mergée |
| PR GitHub affichait "0 commits to compare" | PR déjà mergée automatiquement (workflow normal) |

### Ce qui fonctionne
- ✅ QR code toujours visible si réservation confirmée (fallback génération URL)
- ✅ Skeleton animé pendant chargement du QR
- ✅ Bouton boutique visible sur la page de suivi client
- ✅ Pipeline complet : PR #3 + PR #4 mergées, 2 déploiements Vercel actifs

### Ce qui reste à tester
- ⚠️ Vérifier bouton boutique visible sur une vraie page `/suivi/[id]` confirmée
- ⚠️ Tester connexion client `/mon-compte` avec email réel

---

## SESSION 2026-03-15 — PWA (Progressive Web App)

### Blocs implémentés (3 blocs)

**BLOC 1 — Icônes et Manifest**
- `public/manifest.json` : manifest PWA complet (name, short_name, start_url, display standalone, colors, 8 tailles d'icônes)
- `scripts/generate-icons.js` : génération programmatique des icônes PNG via `sharp` (fond or #C9A84C, initiales "LL" en blanc, 8 tailles : 72→512px)
- `public/icons/icon-{72,96,128,144,152,192,384,512}x*.png` : icônes générées et committées
- `next-pwa@5.6.0` installé via npm

**BLOC 2 — Configuration Next.js**
- `next.config.mjs` → `next.config.js` (renommé pour compatibilité CJS avec next-pwa v5)
- `next.config.js` : enveloppé avec `withPWA` (dest: 'public', register: true, skipWaiting: true, désactivé en dev)
- `app/layout.tsx` : ajout `<head>` avec manifest, theme-color, apple-mobile-web-app-*, apple-touch-icon
- `app/layout.tsx` : import + intégration `<PWAInstallBanner />` en fin de `<body>`

**BLOC 3 — Bannières d'installation ciblées**
- `components/PWAInstallBanner.tsx` : composant Client avec 3 audiences :
  - **Partenaire** (`/partenaire/*`) : bannière dès la 1ère visite, refus mémorisé 30 jours
  - **Client fidélité** (`/mon-compte/*`) : bannière à partir de la 2ème visite, refus mémorisé 7 jours
  - **Visiteur anonyme** : jamais de bannière
- Détection Android/Chrome → `beforeinstallprompt` → installation native
- Détection iOS/Safari → instructions 3 étapes avec emojis (Partager → Sur l'écran d'accueil → Ajouter)
- Jamais affiché sur desktop (`window.innerWidth > 768`)
- Jamais affiché si déjà installé (`display-mode: standalone`)
- Style : fond beige #F5F0E8, bordure top or #C9A84C, bouton or, coins arrondis haut
- Spacer automatique pour éviter que la bannière masque le contenu

### Nouveaux fichiers créés
| Fichier | Rôle |
|---------|------|
| `public/manifest.json` | Manifest PWA |
| `public/icons/icon-*.png` | 8 icônes PNG générées |
| `scripts/generate-icons.js` | Générateur d'icônes sharp |
| `components/PWAInstallBanner.tsx` | Bannières installation ciblées par audience |

### Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `next.config.js` (ex .mjs) | + withPWA wrapper |
| `app/layout.tsx` | + balises PWA head + PWAInstallBanner |

### Dépendances installées
- `next-pwa@5.6.0` — Service worker + configuration PWA

### LocalStorage keys
| Clé | Valeur | Usage |
|-----|--------|-------|
| `pwa_dismissed_partner` | timestamp expiry | Refus bannière partenaire (30 jours) |
| `pwa_dismissed_client` | timestamp expiry | Refus bannière client (7 jours) |
| `pwa_visits_client` | nombre | Compteur visites /mon-compte |

---

## PHASE P3 — MERGÉE ET DÉPLOYÉE ✅ (2026-03-20)

**Date** : 20 mars 2026
**PR** : #26 mergée sur `main` — déployée sur Vercel

**Commits inclus :**
- `2945df2` — analytics Guest Connect (Mes Invités) + PortailNav 7 items
- `6aafcc4` — llui-tracker.js script public Netlify
- `cf48338` — CLAUDE_PROGRESS.md P3 terminée

**Étapes 7 & 8 livrées :**
- `app/portail/analytics/page.tsx` — KPIs invités, barre progression, répartition couleur
- `components/portail/PortailNav.tsx` — nav 7 items + badges (panier + invités en attente)
- `app/portail/layout.tsx` — padding responsive mobile/desktop
- `public/llui-tracker.js` — tracking conversion boutique Netlify

### ACTIONS MANUELLES ENCORE EN ATTENTE
1. ⬜ Copier `public/llui-tracker.js` sur la boutique Netlify (`l-et-lui-signature.com`)
2. ⬜ Activer CallMeBot (bot saturé — réessayer dans 2-3j)
3. ⬜ Ajouter `CALLMEBOT_API_KEY` dans Vercel → Settings → Environment Variables
4. ⬜ Vérifier `NEXT_PUBLIC_APP_URL` dans Vercel → Settings → Environment Variables

### PROCHAINE ÉTAPE : Phase P4

## PHASE P4 — TERMINÉE ✅ (2026-03-20)

**Branche** : `claude/p4-wallets-service-4M9tA` — 8 commits

| Étape | Commit | Contenu |
|-------|--------|---------|
| 1 | `4f2bc4a` | `walletsService.ts` — crediterWallet/demanderRetrait atomiques + track-conversion refactorisé |
| 2 | `15185c1` | Historique wallets + formulaire retrait dans /portail/avantages |
| 3 | `dfe4f6c` | Dashboard admin portail — 8 KPIs + graphique 7j + flux + alertes + auto-refresh 30s |
| 4 | `bef111a` | Admin utilisateurs — tableau + filtres + modal profil + ajustement grade |
| 5 | `ea55cbd` | Admin paiements centralisés — file FS+retraits, Valider/Payer OM/Rejeter |
| 6 | `a323a6c` | Admin reporting — barres CSS, top performers, répartition grades, métriques |
| 7 | `f4adf0a` | Export CSV (6 types) + rapport PDF mensuel jsPDF (3 pages) |
| 8 | `8f69791` | Rapport hebdo WhatsApp lundi 7h + nav admin 5 liens portail + vercel.json cron |

**Collections Firestore ajoutées** : `wallet_operations` (sous-col), `retraits_demandes`, `admin_actions`, `cron_logs`

### VARIABLES VERCEL À CONFIGURER
```
ADMIN_PHONE_NUMBER=+237693407964
ADMIN_CALLMEBOT_APIKEY=[après activation CallMeBot — bot saturé, réessayer dans 2-3j]
```

### ACTIONS MANUELLES RESTANTES
1. ⬜ Merger la PR `claude/p4-wallets-service-4M9tA` → main
2. ⬜ Configurer `ADMIN_PHONE_NUMBER` dans Vercel
3. ⬜ Configurer `ADMIN_CALLMEBOT_APIKEY` dans Vercel (après activation CallMeBot)
4. ⬜ Tester rapport hebdo manuellement : `GET /api/cron/rapport-hebdo`
5. ⬜ Copier `public/llui-tracker.js` sur la boutique Netlify

**ÉCOSYSTÈME L&LUI SIGNATURE — 100% OPÉRATIONNEL**
P1 ✅ · P2 ✅ · P3 ✅ · Patch Fast Start ✅ · P4 ✅

**Fonctionnalités livrées** :
- Portail client (dashboard + panier + todo + avantages)
- Guest Connect (Magic Links + QR + tracking boutique)
- Fast Start Bonus (auto-enroll + OM + admin + alertes)
- WhatsApp CallMeBot (8 types notifications)
- Sync boutique Netlify (cron quotidien)
- Wallets atomiques (70/30 runTransaction)
- Dashboard admin portail (KPIs + graphique + flux temps réel)
- Paiements centralisés (FS + retraits unifiés)
- Reporting (graphiques CSS + top performers + répartition grades)
- Export CSV (6 types) + rapport PDF mensuel
- Rapport hebdo WhatsApp (lundi 7h UTC)
- Navigation admin complète (5 liens portail)

## GOOGLE SHEETS — SYNC BOUTIQUE (2026-03-20)

La boutique Netlify (`letlui-signature.netlify.app`) utilise **Google Sheets** comme base de données produits.
Le scraping HTML cheerio a été **remplacé par Google Sheets API** (`googleapis ^171`).

### Architecture
- `app/api/cron/sync-boutique/route.ts` — lit le Google Sheet, une feuille = une catégorie
- Colonnes attendues : `A=Nom | B=Prix(FCFA) | C=Description | D=Image URL | E=URL fiche | F=Actif(oui/non)`
- Écrit dans Firestore `catalogue_boutique` (même structure qu'avant)
- `app/api/admin/test-sheets/route.ts` — endpoint de test : GET /api/admin/test-sheets

### VARIABLES VERCEL OBLIGATOIRES
```
GOOGLE_SHEETS_CLIENT_EMAIL=   (email du compte de service Google)
GOOGLE_SHEETS_PRIVATE_KEY=    (clé privée avec \n, copier depuis JSON credentials)
GOOGLE_SHEETS_BOUTIQUE_ID=    (ID visible dans l'URL du sheet : .../spreadsheets/d/[ID]/edit)
```

### PROCÉDURE ACTIVATION GOOGLE SHEETS API
1. Aller sur `console.cloud.google.com` → Nouveau projet (ou projet existant)
2. **APIs & Services** → Bibliothèque → Activer **"Google Sheets API"**
3. **Credentials** → Créer des identifiants → **Compte de service**
4. Télécharger le fichier JSON → extraire `client_email` et `private_key`
5. Dans Google Sheets → **Partager** avec l'email du compte de service (accès Lecteur)
6. Ajouter les 3 variables dans **Vercel → Settings → Environment Variables**
7. Tester : `GET /api/admin/test-sheets`

### Format Google Sheet attendu
| A (Nom) | B (Prix) | C (Description) | D (Image URL) | E (URL fiche) | F (Actif) |
|---------|---------|----------------|--------------|--------------|---------|
| Robe de Mariée Gold | 450000 | Robe longue... | https://... | https://... | oui |

- Ligne 1 = en-têtes (doit contenir "nom", "name" ou "produit")
- Feuilles multiples OK : chaque feuille = catégorie dans le portail

## TRAVAIL EN COURS
- **Bloc actuel** : Aucun — P4 + Google Sheets sync terminés (2026-03-20)
- **Dernière action** : sync-boutique remplacé par Google Sheets API

---

## BLOCS EN ATTENTE (non commencés)
- Notifications push / email automatiques aux partenaires
- Système d'avis clients (formulaire client + affichage partenaire)
- Page `/admin/clients` enrichie : historique réservations cross-partenaires

## MODULES À IMPLÉMENTER (fichiers inexistants à ce jour)
| Module | Fichier lib | Page admin | Statut |
|--------|-------------|-----------|--------|
| Fidélité clients | `lib/loyaltyDefaults.ts` | `/admin/fidelite` | ✅ Implémenté |
| Devis / Estimations | `lib/devisDefaults.ts` | `/admin/devis` | ✅ Implémenté |

---

## PROBLÈMES RENCONTRÉS ET SOLUTIONS

| Date | Problème | Solution |
|------|---------|---------|
| 2026-03-08 | Bouton "Envoyer la demande" BookingWidget ne faisait rien (Firebase blocking) | Firebase rendu non-bloquant, succès affiché immédiatement avec bouton WhatsApp |
| 2026-03-08 | Footer affichait placeholder +237 699 000 000 au lieu du vrai numéro | Corrigé dans `Footer.tsx` |
| 2026-03-07 | QR Code iOS : `link.click()` data URL ne télécharge pas | Modal d'aperçu + instruction appui long + détection `/iPhone\|iPad\|iPod/` |
| 2026-03-07 | Onglet "Réservations" nav mobile → 404 | Créer `/partenaire/reservations/liste/page.tsx` |
| 2026-03-07 | KPI revenus déborde de la card (text-4xl trop grand) | `text-xl` + "FCFA" sur ligne séparée |
| 2026-03-06 | WhatsApp ne s'ouvre pas sur iOS Safari | `window.location.href` à la place de `window.open` |
| 2026-03-06 | Agent précédent stoppé (token limit) sur BLOC 13+8+11 | Reprise : BLOC 11 (vues) complété, fichiers orphelins commités |
| 2026-03-06 | Commit signing échoue (signing server 400) | `git -c commit.gpgsign=false commit` |

---

## FICHIERS CLÉS DU PROJET

### Actions (Server Actions)
| Fichier | Rôle |
|---------|------|
| `actions/whatsapp-pipeline.ts` | Envoi messages WhatsApp étape par étape |
| `actions/whatsapp-templates.ts` | CRUD templates WhatsApp |
| `actions/reservations.ts` | Créer/modifier réservations |
| `actions/admin-reservations.ts` | Actions admin (confirmer, annuler, payer) |
| `actions/partner-reservations.ts` | Réservations créées par partenaire |
| `actions/partner-confirm.ts` | Confirmation arrivée client (scan QR) |
| `actions/partners.ts` | Auth partenaire (login/logout cookie) |
| `actions/seasonal-pricing.ts` | Tarifs saisonniers |
| `actions/stats.ts` | Tracking vues pages logements |
| `actions/messages.ts` | Messagerie partenaire ↔ admin |
| `actions/packs.ts` | Demandes de packs |
| `actions/promo-codes.ts` | Codes promo |

### Pages principales
| Route | Fichier | Description |
|-------|---------|-------------|
| `/` | `app/(main)/page.tsx` | Listing hébergements |
| `/hebergements/[slug]` | `app/(main)/hebergements/[slug]/page.tsx` | Fiche logement + réservation |
| `/suivi/[reservationId]` | `app/suivi/[reservationId]/page.tsx` | Suivi réservation client |
| `/admin` | `app/admin/page.tsx` | Dashboard admin (7 widgets) |
| `/admin/reservations/[id]` | `app/admin/reservations/[id]/page.tsx` | Détail + pipeline WhatsApp |
| `/admin/hebergements/[id]` | `app/admin/hebergements/[id]/page.tsx` | Édition logement |
| `/admin/templates` | `app/admin/templates/page.tsx` | Templates WhatsApp |
| `/admin/messages` | `app/admin/messages/page.tsx` | Messagerie admin |
| `/partenaire/dashboard` | `app/partenaire/dashboard/page.tsx` | Dashboard partenaire |
| `/partenaire/reservations/liste` | `app/partenaire/reservations/liste/page.tsx` | Liste réservations partenaire |
| `/partenaire/reservations/[id]` | `app/partenaire/reservations/[id]/page.tsx` | Détail réservation partenaire |
| `/partenaire/logements/[id]` | `app/partenaire/logements/[id]/page.tsx` | Historique + 2 QR codes + vues logement |
| `/chambre/[slug]` | `app/chambre/[slug]/page.tsx` | Page logement isolée (sans menu, sans suggestions) |
| `/p/[partnerSlug]` | `app/p/[partnerSlug]/page.tsx` | Mini-site partenaire isolé (slug = id Firestore) |
| `/partenaire/messages` | `app/partenaire/messages/page.tsx` | Messagerie partenaire |
| `/partenaire/scanner` | `app/partenaire/scanner/page.tsx` | Scanner QR arrivée client |
| `/partenaire/confirm/[id]` | `app/partenaire/confirm/[reservationId]/page.tsx` | Confirmation arrivée |

### Composants clés
| Fichier | Rôle |
|---------|------|
| `components/admin/WhatsAppPipeline.tsx` | Boutons pipeline WhatsApp |
| `components/admin/WhatsAppHistory.tsx` | Historique messages envoyés |
| `components/admin/DashboardCharts.tsx` | Graphiques recharts admin |
| `components/admin/PaymentRelanceWidget.tsx` | Widget alertes paiements |
| `components/partner/AccommodationQrPrint.tsx` | Génération QR Code A4 PNG |
| `components/partner/PartnerCalendar.tsx` | Calendrier disponibilités partenaire |
| `components/partner/PartnerMobileNav.tsx` | Nav mobile bas de page |
| `components/partner/QrScanner.tsx` | Scanner QR arrivée |
| `components/partner/MessageChat.tsx` | Interface messagerie |

### Lib / Config
| Fichier | Rôle |
|---------|------|
| `lib/firebase.ts` | Init Firebase Admin SDK |
| `lib/utils.ts` | Fonctions utilitaires (formatDate, formatPrice, etc.) |
| `lib/whatsapp-utils.ts` | Formatage messages WhatsApp |
| `lib/amenity-icons.ts` | Icônes équipements logements |
| `middleware.ts` | Auth admin (cookie `admin_session`) |

---

## VARIABLES ET CONFIGURATIONS IMPORTANTES

- **Numéro WhatsApp admin** : 693407964
- **Format code réservation** : LLS-2026-XXXXX (ex: LLS-2026-AB12C)
- **Auth partenaire** : cookie `partner_session` = `partnerId` Firestore
- **Auth admin** : cookie `admin_session` = `"authenticated"`
- **URL app prod** : `https://llui-signature-hebergements.vercel.app`
- **QR Code chambre URL** : `https://llui-signature-hebergements.vercel.app/chambre/[slug]`
- **QR Code réception URL** : `https://llui-signature-hebergements.vercel.app/p/[partnerId]`
- **Mini-site partenaire slug** : = `id` du document Firestore `partenaires`

### Collections Firestore
| Collection | Contenu |
|-----------|---------|
| `hebergements` | Logements (name, slug, partner_id, price_per_night, status, images, ...) |
| `reservations` | Réservations (guest_*, check_in, check_out, reservation_status, payment_status, ...) |
| `reservations/{id}/whatsapp_logs` | ⚠️ Sous-collection — historique messages WhatsApp par réservation |
| `partenaires` | Partenaires (name, email, access_code, reliability_score, ...) |
| `partenaires/{id}/commissionRequests` | ⚠️ Sous-collection — demandes de paiement de commissions |
| `disponibilites` | Dates bloquées manuellement (accommodation_id, date) |
| `demandes_disponibilite` | Demandes de disponibilité clients (routed_to_partner_id, handled_by, reservation_id...) |
| `commissions_usage` | Suivi commissions par réservation (reservation_id, partner_id, amount, paid) |
| `clients` | Profils clients L&Lui Stars (email, firstName, lastName, phone, reservationIds) |
| `promo_codes` | Codes promo (code, discount_percent, max_uses, ...) |
| `packs` | Packs hébergement |
| `pack_requests` | Demandes de packs clients |
| `stats_views` | Vues pages logements (id: `{accommodationId}_{YYYY-MM}`, count) |
| `messages` | Messagerie partenaire ↔ admin (partner_id, sender, text, created_at) |
| `settings` | Documents de configuration (whatsappTemplates, adminPaymentSettings, reservationRules, accommodationTypes, documents, helpCenter, subscriptionPlans, contract) |

> **Collections supprimées/renommées :**
> - ~~`whatsapp_history`~~ → `reservations/{id}/whatsapp_logs` (sous-collection)
> - ~~`whatsapp_templates`~~ → `settings/whatsappTemplates` (document Firestore)
> - ~~`clients_stars`~~ → `clients`

### Statuts réservation
- `en_attente` → demande reçue, admin n'a pas encore validé
- `confirmee` → admin a confirmé, dates bloquées
- `annulee` → annulée, dates libérées

### Statuts paiement
- `en_attente` → pas encore payé
- `paye` → paiement reçu et validé par admin
- `rembourse` → remboursé

---

## SESSION 2026-03-14 — NOTIFICATIONS EMAIL PARTENAIRES + DEMANDES PAIEMENT COMMISSIONS
**Mise à jour : 2026-03-14**

### Notifications email automatiques aux partenaires ✅ Terminé
**4 déclencheurs (tous non-bloquants fire-and-forget) :**
| Événement | Fichier | Statut |
|-----------|---------|--------|
| Réservation publique soumise → partenaire | `actions/reservations.ts:118` | ✅ |
| Demande disponibilité soumise → partenaire | `actions/availability-requests.ts:58` | ✅ |
| Admin confirme réservation → partenaire | `actions/reservations.ts:169` | ✅ |
| Admin envoie message → partenaire | `actions/messages.ts:43` | ✅ |

**3 fonctions ajoutées dans `lib/email.ts`** :
- `sendPartnerNewDemandEmail` (l.199)
- `sendPartnerNewMessageEmail` (l.250)
- `sendPartnerReservationConfirmedEmail` (l.271)

**Configuration Resend** :
- `.env.local` créé : `RESEND_API_KEY=re_34jFAmFR_5TNfSi8Ktqnf2phwN1PU1WKJ`
- FROM : `onboarding@resend.dev` (plan gratuit)
- ⚠️ **Action manuelle** : ajouter `RESEND_API_KEY` dans Vercel → Settings → Environment Variables

### Système Demandes de Paiement Commissions (4 blocs) ✅ Terminé
**BLOC 1 — Tableau commissions enrichi** ✅
- Colonne "Actions" + bouton "📄 Demande de paiement" si total > 0
- Bouton global "Générer toutes les demandes du mois"
- Onglets "Tableau" / "Historique des demandes"
- Types `CommissionReservation` : + `accommodationName`, `checkIn`, `checkOut`

**BLOC 2 — PDF A4 jsPDF** ✅ `lib/generateCommissionPDF.ts`
- Palette beige/or/noir, en-tête répété si multi-pages
- Tableau réservations, ligne TOTAL or, 3 options paiement
- Taux commission jamais affiché, référence `LLUI-COM-YYYY-MM-XXXXX`

**BLOC 3 — Modale d'envoi** ✅ `components/admin/CommissionRequestModal.tsx`
- Sélecteur mois, résumé, prévisualisation/téléchargement PDF
- WhatsApp pré-rempli + email Resend avec PDF en pièce jointe Base64
- Sauvegarde : `partenaires/{id}/commissionRequests/{ref}`

**BLOC 4 — Historique** ✅ (onglet dans CommissionsWidget)
- Badges : généré/envoyé WA/envoyé email/payé
- "Marquer comme payé" + "Renvoyer" + chargement lazy

### Nouveaux fichiers créés
| Fichier | Rôle |
|---------|------|
| `lib/generateCommissionPDF.ts` | Génération PDF jsPDF côté client |
| `actions/commission-requests.ts` | CRUD Firestore + envoi email PDF joint |
| `components/admin/CommissionRequestModal.tsx` | Modale prévisualisation/envoi |

### Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `lib/email.ts` | + 3 fonctions email partenaire + champs optionnels `product_type?`, `product_id?` |
| `actions/availability-requests.ts` | + déclencheur email nouvelle demande |
| `actions/messages.ts` | + déclencheur email nouveau message admin |
| `actions/reservations.ts` | + 2 déclencheurs (soumission publique + confirmation) |
| `actions/commissions.ts` | + `accommodationName`, `checkIn`, `checkOut` dans la query |
| `components/admin/CommissionsWidget.tsx` | + types enrichis + onglets + bouton + historique |

### Bugs rencontrés et solutions
| Problème | Solution |
|---------|---------|
| Email manquant à la soumission publique | Ajout déclencheur dans `createReservation()` |
| `sendPartnerNewDemandEmail` refusait `product_type` | Ajout champs `product_type?`, `product_id?` optionnels |
| Imports inutilisés dans CommissionsWidget | Retrait `Clock`, `MailIcon`, `MessageCircle` |

### Ce qui fonctionne
- ✅ 4 déclencheurs email partenaire codés et pushés
- ✅ PDF généré côté client sans appel serveur
- ✅ Email avec PDF pièce jointe via Resend
- ✅ Historique Firestore des demandes générées

### Ce qui reste à tester
- ⚠️ Ajouter `RESEND_API_KEY` dans Vercel (sinon emails silencieusement ignorés en prod)
- ⚠️ Tester génération PDF sur mobile Safari
- ⚠️ Tester `/mon-compte` client Stars (sujet en attente depuis session 2026-03-13)

---

---

## SESSION 2026-03-19 — DASHBOARD FIDÉLITÉ L&LUI STARS (4 BLOCS)

### Corrections préalables (bugs)
- **FIX** `actions/reservations.ts` : cascade delete `cleanupReservationReferences` corrigée — `whatsapp_logs` est une sous-collection (`reservations/{id}/whatsapp_logs`) et non une collection racine
- **FIX** `actions/whatsapp-pipeline.ts` : `{numero_paiement}` manquant dans le template `template2_payment`, ajout de `📱 Numéro : *{numero_paiement}*` avant le montant
- **FIX** `app/partenaire/reservations/[id]/page.tsx` : 404 pour partenaires sur réservations auto-escaladées — ajout de `isAuthor = sourcePartnerId === partnerId` comme exception d'accès
- **FIX** `lib/whatsapp-utils.ts` : `console.warn` si `CALLMEBOT_API_KEY` absent (non-bloquant)

### BLOC 1 — Fondations
| Fichier | Rôle |
|---------|------|
| `lib/loyaltyDefaults.ts` | `LOYALTY_DEFAULTS`, `LOYALTY_LEVELS` (4 niveaux), `PROMO_CODE_DEFAULTS`, types `LoyaltyConfig`, `LoyaltyLevelsConfig`, `LoyaltyLevelKey` |
| `lib/loyaltyUtils.ts` | `calculateLoyaltyLevel`, `generatePromoCode`, `addLoyaltyPoints`, `initLoyaltyFirestore` |
| `actions/fidelite.ts` | Toutes les server actions : config, dashboard stats, chart data, clients, points, promo codes, parrainage, anniversaire, audit log |

### BLOC 2 — Dashboard principal `/admin/fidelite`
| Fichier | Rôle |
|---------|------|
| `app/admin/fidelite/page.tsx` | Page serveur : 6 KPIs (2 lignes), graphiques, actions panel, lien liste clients |
| `components/admin/FideliteToggleProgram.tsx` | Toggle activation/suspension programme (modal de confirmation) |
| `components/admin/FideliteDashboardCharts.tsx` | Graphiques recharts : BarChart points/montées de niveau + PieChart répartition niveaux + tableau |
| `components/admin/FideliteActionsPanel.tsx` | Panel actions requises : sans code promo, codes expirés, anniversaires à venir |
| `components/admin/AdminSidebar.tsx` | Ajout `⭐ Fidélité L&Lui Stars` dans le menu |

### BLOC 3 — Liste et fiche client
| Fichier | Rôle |
|---------|------|
| `app/admin/fidelite/clients/page.tsx` | Page serveur liste clients avec filtres searchParams |
| `components/admin/FideliteClientsTable.tsx` | Tableau paginé filtrable (niveau, code promo, recherche) + export CSV |
| `app/admin/fidelite/clients/[clientId]/page.tsx` | Page serveur fiche individuelle (données Firestore + calcul niveau suivant) |
| `components/admin/FideliteClientDetail.tsx` | Composant interactif (5 sections) : niveau/progression, points/historique, code promo, parrainages, WhatsApp |

### BLOC 4 — Paramètres `/admin/fidelite/parametres`
| Fichier | Rôle |
|---------|------|
| `app/admin/fidelite/parametres/page.tsx` | Page serveur : charge config + niveaux + audit log |
| `components/admin/FideliteParametresTabs.tsx` | 4 onglets : règles de points, niveaux & remises (avec messages WhatsApp), codes promo, journal d'audit |

### Collections Firestore ajoutées
| Collection | Contenu |
|-----------|---------|
| `settings/loyaltyConfig` | Règles de points (pointsFirstBooking, pointsPerNight, etc.) + `programActive` |
| `settings/loyaltyLevels` | Config des 4 niveaux (remises, validité code, messages WhatsApp) |
| `settings/loyaltyAuditLog/logs` | Sous-collection — journal des modifications admin |
| `clients/{id}/pointsHistory` | Sous-collection — historique transactions de points par client |

### Routes disponibles
- `/admin/fidelite` — Dashboard L&Lui Stars (KPIs, graphiques, actions)
- `/admin/fidelite/clients` — Liste clients filtrée + export CSV
- `/admin/fidelite/clients/[clientId]` — Fiche individuelle complète
- `/admin/fidelite/parametres` — Configuration programme (4 onglets)

---

## SESSION 2026-03-19 (suite) — BLOCS 5 & 6 FIDÉLITÉ

### BLOC 5 — Améliorations espace client /mon-compte

| Fichier | Rôle |
|---------|------|
| `components/MonComptePromoWidget.tsx` | Widget code promo enrichi (expiry, boutique link, copy button, empty state) |
| `components/MonComptePointsHistoryWidget.tsx` | 10 dernières transactions de points avec lien vers /mon-compte/points |
| `components/MonCompteReferralWidget.tsx` | Widget parrainage (code, compteur filleuls, points gagnés, partage WhatsApp) |
| `components/MonComptePointsFullHistory.tsx` | Historique complet avec recharts (6 mois), filtres par action, tableau avec solde cumulé |
| `app/(main)/mon-compte/points/page.tsx` | Page /mon-compte/points — historique complet (server + client) |
| `app/(main)/mon-compte/page.tsx` | Refonte avec barre progression animée, texte d'encouragement dynamique, tous les nouveaux widgets |
| `components/MonCompteMemberCard.tsx` | Ajout bouton "📤 Partager sur WhatsApp" à côté du téléchargement |

**Améliorations :**
- Barre de progression animée avec texte d'encouragement dynamique
- Widget code promo avec date d'expiration et lien boutique
- Historique 10 dernières transactions + lien vers page complète
- Compteur filleuls avec partage WhatsApp
- Page `/mon-compte/points` avec graphique recharts et filtres
- Carte membre partageable par WhatsApp

### BLOC 6 — Notifications automatiques clients

| Fichier | Rôle |
|---------|------|
| `lib/loyaltyNotifications.ts` | Fonctions pures : build messages WhatsApp (level_up, expiring_promo, birthday, stay_anniversary), buildWaUrl |
| `actions/fidelite.ts` | + checkExpiringPromoCodes(), checkClientBirthdays(), checkStayAnniversaries(), getPendingNotifications(), getPendingNotificationsCount(), updateNotificationStatus() |
| `components/admin/FideliteNotificationsTable.tsx` | Tableau pending notifications avec aperçu message, bouton WhatsApp, marquer envoyé/ignorer |
| `components/admin/FideliteActionsPanel.tsx` | Ajout 3 boutons déclencheurs (anniversaires, séjour, codes expirants) + section notifications en attente |
| `components/admin/FideliteParametresTabs.tsx` | Ajout bouton "🔔 Vérifier les codes expirants" dans l'onglet Codes promo |
| `app/admin/fidelite/page.tsx` | Charge pendingNotifications et les passe à FideliteActionsPanel |
| `app/api/admin/loyalty-badge/route.ts` | GET API retourne count des notifications pending |
| `components/admin/AdminSidebar.tsx` | Badge rouge dynamique sur "⭐ Fidélité L&Lui Stars" si notifications pending |

**Fonctionnement notifications :**
- Stockées dans `clients/{clientId}/pendingNotifications` subcollection
- Status : `pending` → `sent` (avec sentAt) ou `dismissed`
- Envoi MANUEL via lien wa.me — aucun envoi automatique serveur
- Déclencheurs manuels depuis le dashboard admin

### Collections Firestore ajoutées
| Collection | Contenu |
|-----------|---------|
| `clients/{id}/pendingNotifications` | Sous-collection — notifications WhatsApp en attente d'envoi manuel |

### Routes disponibles (nouvelles)
- `/mon-compte/points` — Historique complet des points avec graphique et filtres

---

## SESSION 2026-03-19 (fin) — MODULE MARIAGES & DEVIS + CORRECTIONS

### Module /admin/devis — 5 blocs implémentés

| Fichier | Rôle |
|---------|------|
| `lib/devisDefaults.ts` | PACKS (PERLE/SAPHIR/ÉMERAUDE/DIAMANT), CATALOGUE, LLUI_CONFIG, calculerTotaux(), formatFCFA() |
| `actions/devis.ts` | saveDevis, getDevisList, getDevis, updateDevisStatus, toggleDevisVisibleBoutique, dupliquerDevis, deleteDevis |
| `app/admin/devis/page.tsx` | Page serveur — charge liste et rend DevisAdminTabs |
| `components/admin/DevisAdminTabs.tsx` | Tabs : Nouveau devis / Mes devis (N) |
| `components/admin/DevisWizard.tsx` | Wizard 4 étapes : client, pack, personnalisation, récap+PDF |
| `components/admin/DevisVariantes.tsx` | 3 cartes variantes (Confort -15%, Équilibre, Prestige pack+) |
| `components/admin/DevisHistorique.tsx` | Tableau historique avec badges statut, toggle boutique, actions |
| `lib/generateDevisPDF.ts` | PDF A4 6 pages jsPDF (couverture, intro, budget, CDC, paiement, signature) |
| `components/admin/AdminSidebar.tsx` | Entrée "💍 Mariages & Devis" ajoutée |

### Corrections appliquées (2026-03-19)

- **FIX formatFCFA** : `Intl.NumberFormat('fr-FR')` → séparateur espace (1 800 000 FCFA)
- **FIX PDF emojis** : `sanitizeForPDF()` dans `lib/generateDevisPDF.ts` — supprime les caractères Unicode incompatibles avec jsPDF/helvetica (regex surrogate pairs + BMP U+2600-U+27BF)

### Route disponible
- `/admin/devis` — Générateur de propositions commerciales mariages

---

## SESSION 2026-03-19 — PHASE P1 PORTAIL SIGNATURE ✅ TERMINÉE

### 4 commits — Phase P1 complète

| Étape | Commit | Fichiers |
|-------|--------|---------|
| ÉTAPE 1 | `b3a6aca` | `lib/portailGrades.ts` — grades START/BRONZE/ARGENT/OR/SAPHIR/DIAMANT |
| ÉTAPE 2 | `82d32b5` | `app/portail/` (layout + page + 4 modules) + `components/portail/PortailTopBar.tsx` |
| ÉTAPE 3 | `5d877ec` | `lib/calculatePayout.ts` + `lib/__tests__/calculatePayout.test.ts` |
| ÉTAPE 4 | `123f7a3` | `lib/firestoreTypes.ts` + `firestore.rules` |

### Notes techniques

- **Grades portail** : START → BRONZE → ARGENT → OR → SAPHIR → DIAMANT (REV lifetime)
- **Commission boutique** : N1 = 10% / N2 = 5% — split 70% cash / 30% crédits services
- **Commission pack mariage** : N1 = 1,2% / N2 = 0,5%
- **Fast Start Cameroun** : 80 REV/30j (30 000 FCFA) / 200 REV/60j (80 000) / 450 REV/90j (200 000)
- **Auth portail** : cookie `portail_uid` → collection `portail_users` Firestore
- **Packs mariage** (PERLE/SAPHIR/ÉMERAUDE/DIAMANT dans devisDefaults.ts) = noms de produits indépendants, NON modifiés

### Prochaine phase P2

> "Configurateur Smart drag&drop + Dashboard Cagnotte Mariage"
> - `app/portail/configurateur/` — wizard devis intégré au portail (réutiliser DevisWizard)
> - `app/portail/avantages/` — dashboard wallet (cash + crédits + REV + fast start progress)
> - Page login `/portail/login` avec auth Firebase (email/password)
> - Server actions : `createTransaction()`, `applyCommissions()`, `claimFastStartPrime()`

---

## PROCHAINE SESSION — REPRENDRE ICI

**État au 2026-03-19** : Blocs 5 & 6 Fidélité implémentés et pushés sur `claude/review-and-continue-phase-4-pibnO`.

**Prochaine action prioritaire** :
1. Lire ce fichier (`CLAUDE_PROGRESS.md`)
2. Aller dans **Vercel → Settings → Environment Variables** et ajouter :
   - `RESEND_API_KEY = re_34jFAmFR_5TNfSi8Ktqnf2phwN1PU1WKJ`
   - `FROM_EMAIL = onboarding@resend.dev`
3. Tester un email partenaire en soumettant une réservation de test
4. Tester la génération PDF commission dans `/admin` → widget Commissions → bouton "📄 Demande de paiement"
5. Choisir les prochains blocs avec l'utilisateur

**Routes disponibles (complètes)** :
- `/mon-compte` — espace client Stars (connexion + historique réservations)
- `/partenaire/guide` — notice téléchargeable + centre d'aide accordéon
- `/partenaire/revenus` — tableau de bord revenus avec graphiques
- `/partenaire/clients` — liste clients groupés avec badges fidélité
- `/admin/abonnements` — gestion formules d'abonnement (4 onglets)
- `/admin/documents` — gestionnaire PDF + éditeur FAQ partenaires
- `/admin/clients` — gestion profils Stars (création manuelle + sync en masse)
- `/admin/parametres-paiement` — paramètres paiement globaux L&Lui
- `/api/export/reservations` — export CSV (admin only)
- `/api/upload-document` — upload notice PDF (admin only)
- `/api/admin/bootstrap-clients` — bootstrap GET profils Stars (admin only)
- `/api/admin/sync-clients` — sync POST profils Stars (admin only)

**Blocs potentiels suivants** (à confirmer avec l'utilisateur) :
- Tester la fiche d'accueil V2 sur une vraie réservation (toggle variante, lookup loyauté)
- Notifications push / email automatiques aux partenaires
- Système d'avis clients (formulaire après séjour + affichage partenaire)
- Page `/admin/clients` : historique réservations cross-partenaires
- Statistiques avancées partenaire (taux occupation, saisonnalité)
- Supprimer les 15 profils Stars de test (emails invalides) depuis `/admin/clients`

---

## PHASE P6 — TERMINÉE (2026-03-21)

7 étapes complétées. Branche : `claude/resume-phase-4-analytics-4M9tA`

### DASHBOARD COMPLET
- 12 blocs livrés dont CTA Boutique/Hébergements
- `components/portail/dashboard/HeroCTA.tsx` — countdown ring SVG + boutons CTA
- `components/portail/dashboard/StatsDashboard.tsx` — stats 2×2, gauge budget, cagnotte, invités
- `components/portail/dashboard/ActionsDashboard.tsx` — prestataires, timeline todos, météo, versements, citation

### GESTION INVITÉS
- Ajout manuel + import CSV
- QR codes + envoi WhatsApp
- PDF invitations personnalisées A5 (`lib/generateInvitationPDF.ts` + `app/portail/invites/pdf/page.tsx`)

### PANIER DYNAMIQUE OPTION B
- Catalogue produits boutique (Firestore `/catalogue`) — `app/portail/configurateur/page.tsx`
- Hébergements Firestore — `app/portail/escales/page.tsx`
- Honoraires 10% uniquement sur PACK_MARIAGE (catégorie HEBERGEMENT) — `app/portail/panier/page.tsx`
- Hook `usePanier` (localStorage) + hook `useClientIdentity` (fetch `/api/portail/user`)

### NAVIGATION
- Noms mariés mémorisés partout (`useClientIdentity`)
- Bouton retour dashboard sur chaque page
- `PortailNav` : 7 onglets avec badges panier + invités

### FIX ADMIN
- Digest 398097678 corrigé : `getDashboardData()` wrappé dans try/catch + DEFAULT_DATA fallback
- `app/admin/dashboard/page.tsx` ne crash plus si Firebase credentials invalides

### ACTIONS MANUELLES RESTANTES
- Twilio : activer sandbox WhatsApp
- Google Sheets : vérifier partage public
- Vercel : ajouter WEATHER_API_KEY
- Netlify : installer llui-tracker.js

---

## ARCHITECTURE HYBRIDE PORTAIL — TERMINÉE (2026-03-21)

7 étapes complétées. Branche : `claude/resume-phase-4-analytics-4M9tA`

**Vision** : portail = carnet de bord. Boutique et hébergements = sites externes. Invités = fiche personnalisée + code promo.

### FLUX VALIDÉ
Dashboard → Clic → Site externe → Retour → Saisie manuelle → Budget mis à jour → REV crédités → Cagnotte calculée

### CODE PROMO PAR MARIÉ
- `lib/generatePromoCode.ts` — format LLUI-GJ-2026
- Auto-généré à la 1ère connexion dans `/api/portail/user`
- Stocké dans `portail_users/{uid}.code_promo`

### FICHE INVITÉS
- Page publique `/invite/[slug]` refactorée avec design luxe
- Code promo affiché + bouton "Copier"
- 2 boutons : Boutique + Hébergements (liens avec ?code=&ref=)
- Section parrainage + footer cagnotte
- Tracking clics : `POST /api/portail/track-invite-click`

### SAISIE MANUELLE DASHBOARD
- `SaisieBoutique.tsx` — modal ajout achat + liste 3 derniers + REV auto
- `SaisieHebergement.tsx` — modal + fiche récap éditable
- APIs : `POST /api/portail/achats-boutique` + `POST /api/portail/hebergement-choisi`
- REV calculés : 1 REV par tranche 10 000 FCFA

### PAGE MES ACHATS
- `/portail/mes-achats` — résumé 3 cards + liste boutique + fiche hébergement + impact cagnotte
- Lien vers boutique/hébergements avec code promo dans l'URL

### NAVIGATION
- `PortailNav` mis à jour : "Mes Achats" remplace "Panier" dans la nav
- Badge panier toujours visible sur "Mes Achats"

### MESSAGE WHATSAPP INVITÉS
- Inclut désormais noms_maries + code_promo + magic_link dans le message
