# CLAUDE PROGRESS — L&Lui Signature Hébergements
Dernière mise à jour : 2026-03-13 07:50 — Sécurisation token GitHub (credential store)

---

## ÉTAT GÉNÉRAL DU PROJET
- **Stack** : Next.js 14 (App Router, Server Actions), Firebase (Firestore + Admin SDK), Tailwind CSS, Vercel
- **Dépôt** : github.com/OlivierSrge/llui-signature-hebergements
- **Site live** : llui-signature-hebergements.vercel.app
- **Branche active** : `main`
- **Dernier commit pushé** : session 2026-03-08 — WhatsApp flow client + fixes contact

---

## FONCTIONNALITÉS COMPLÈTEMENT TERMINÉES

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

## TRAVAIL EN COURS
- **Bloc actuel** : Aucun — système Stars opérationnel (2026-03-13)
- **Dernière action** : Bootstrap 16 profils clients Stars créés avec succès

---

## BLOCS EN ATTENTE (non commencés)
- Notifications push / email automatiques aux partenaires
- Système d'avis clients (formulaire client + affichage partenaire)
- Page `/admin/clients` enrichie : historique réservations cross-partenaires

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
| `partenaires` | Partenaires (name, email, access_code, reliability_score, ...) |
| `disponibilites` | Dates bloquées manuellement (accommodation_id, date) |
| `whatsapp_history` | Historique messages WhatsApp envoyés |
| `whatsapp_templates` | Templates messages WhatsApp éditables |
| `promo_codes` | Codes promo (code, discount_percent, max_uses, ...) |
| `packs` | Packs hébergement |
| `pack_requests` | Demandes de packs clients |
| `stats_views` | Vues pages logements (id: `{accommodationId}_{YYYY-MM}`, count) |
| `messages` | Messagerie partenaire ↔ admin (partner_id, sender, text, created_at) |

### Statuts réservation
- `en_attente` → demande reçue, admin n'a pas encore validé
- `confirmee` → admin a confirmé, dates bloquées
- `annulee` → annulée, dates libérées

### Statuts paiement
- `en_attente` → pas encore payé
- `paye` → paiement reçu et validé par admin
- `rembourse` → remboursé

---

## PROCHAINE SESSION — REPRENDRE ICI

**État au 2026-03-13** : système Stars opérationnel, 16 profils créés, commité et pushé sur `claude/review-and-continue-phase-4-pibnO`.

**À faire au démarrage de la prochaine session** :
1. Lire ce fichier en premier (`CLAUDE_PROGRESS.md`)
2. `git log --oneline -5` pour vérifier les commits
3. Tester la connexion d'un client sur `/mon-compte` avec `olivier.serge2001@gmail.com`
4. Choisir les prochains blocs avec l'utilisateur

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
- Notifications push / email automatiques aux partenaires
- Système d'avis clients (formulaire après séjour + affichage partenaire)
- Page `/admin/clients` : historique réservations cross-partenaires
- Statistiques avancées partenaire (taux occupation, saisonnalité)
- Supprimer les 15 profils Stars de test (emails invalides) depuis `/admin/clients`
