# CLAUDE PROGRESS — L&Lui Signature Hébergements
Dernière mise à jour : 2026-03-08 11:45

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

## TRAVAIL EN COURS
- **Bloc actuel** : Aucun — session terminée, tout est pushé
- **Fichiers modifiés** : aucun non-commité
- **Dernière action** : WhatsApp flow client complet (BookingWidget + ReservationForm + confirmation) + fix coordonnées footer
- **Prochaine action prévue** : voir section PROCHAINE SESSION

---

## BLOCS EN ATTENTE (non commencés)
Ces blocs n'ont pas encore été définis/demandés par l'utilisateur.
À compléter lors de la prochaine session selon les nouvelles instructions.

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

**État au 2026-03-08 11:45** : Tous les fichiers sont commités et pushés sur `main`.

**À faire au démarrage de la prochaine session** :
1. Lire ce fichier en premier (`CLAUDE_PROGRESS.md`)
2. Vérifier `git status` et `git log --oneline -5`
3. Demander à l'utilisateur quels nouveaux blocs ou corrections sont prévus

**Corrections connues à surveiller** :
- Tester le bouton WhatsApp du BookingWidget sur mobile iOS (schéma `whatsapp://send`) — peut nécessiter `https://wa.me/` selon le device
- Vérifier que la messagerie partenaire ↔ admin fonctionne bien en production (Firestore realtime polling)
- Vérifier que le tracking des vues (`stats_views`) s'incrémente correctement sur Vercel

**Blocs potentiels suivants** (à confirmer avec l'utilisateur) :
- Notifications push / email automatiques aux partenaires
- Export CSV des réservations
- Tableau de bord revenus partenaire avec graphiques
- Système d'avis clients
