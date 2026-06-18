# GUIDE ADMINISTRATEUR — L&LUI SIGNATURE SYSTÈME COMPLET

**Version :** Juin 2026 | **Dernière mise à jour :** 2026-06-18

---

## ACCÈS RAPIDE

Dashboard : `https://llui-signature-hebergements.vercel.app/admin`

| Page | Lien |
|---|---|
| Confirmations cartes | `/admin/loyalty-confirmations` |
| Programmes fidélité | `/admin/loyalty-programs` |
| Créer programme | `/admin/loyalty-programs/create` |
| Paramètres | `/admin/parametres` |
| Documentation | `/help/admin` |

---

## 1. SETUP INITIAL & PARAMÈTRES

### Paramètres Plateforme (Firestore : `parametres_plateforme/taux_et_forfaits`)

**A. QUOTA QR FLASH**
- `fidelite_qr_flash_quota_jours` = `30` (défaut)
- Signification : Un client peut flasher UN CODE par 30 jours.
- Modification : Admin panel ou Firestore directement.

**B. VALEUR STAR**
- `fidelite_valeur_star_fcfa` = `1` (défaut)
- Signification : 1 star = 1 FCFA dépensé en boutique.
- Exemple : 50 000 FCFA → 50 000 stars.

**C. SEUILS PALIERS STARS**

| Palier | Seuil | Champ Firestore |
|---|---|---|
| novice | 0 | `fidelite_seuil_novice` |
| explorateur | 25 000 | `fidelite_seuil_explorateur` |
| ambassadeur | 75 000 | `fidelite_seuil_ambassadeur` |
| excellence | 150 000 | `fidelite_seuil_excellence` |

---

## 2. GESTION PARTENAIRES

**Ajouter prescripteur**
1. `/admin/partners` → [+ Ajouter prescripteur]
2. Nom, type, contact, localisation, photo
3. [CRÉER]

**QR Code partenaire**
- Généré automatiquement à la création
- À imprimer et afficher en boutique
- Pointe vers `/promo/[partenaireId]`

---

## 3. PROGRAMMES FIDÉLITÉ

**Créer un programme**
1. `/admin/loyalty-programs/create`
2. Choisir le partenaire
3. Remplir : Nom, prix, durée, commission, taux points
4. Ajouter 4 niveaux (BRONZE/ARGENT/OR/DIAMANT) avec prix par niveau
5. [CRÉER PROGRAMME]

**Niveaux types**

| Niveau | Prix | Réduction |
|---|---|---|
| BRONZE 🤍 | 25 000 FCFA | 5% |
| ARGENT 🩶 | 50 000 FCFA | 10% |
| OR 💛 | 100 000 FCFA | 15% |
| DIAMANT 💎 | 150 000 FCFA | 20% |

---

## 4. CONFIRMATIONS CARTES FIDÉLITÉ

**Flux** : Client achète → PENDING → Admin confirme → ACTIVE

**Accéder** : Sidebar → ✅ Cartes à confirmer (badge rouge) ou `/admin/loyalty-confirmations`

**Confirmer**
1. Voir liste PENDING
2. Cliquer sur la carte
3. Vérifier les détails (nom, email, montant)
4. [✅ CONFIRMER] → ACTIVE, carte liée aux Stars
5. Ou [❌ REJETER] → REJECTED

---

## 5. QR FLASH & QUOTA

**Flux client**
1. Scanne QR partenaire → `/promo/[id]`
2. Saisit numéro WhatsApp
3. Reçoit code OTP (6 chiffres) par WhatsApp
4. Valide OTP
5. Code session généré (48h, max 5 utilisations)
6. Redirigé vers `/sejour/[code]`

**Quota**
- 1 code par 30 jours par client (phone E.164)
- Configurable : `fidelite_qr_flash_quota_jours`
- Si quota atteint : message + date prochaine disponibilité

---

## 6. WEBHOOK GOOGLE SHEETS → STARS

**Flux automatique** (aucune action admin requise)

1. Partenaire remplit vente dans Google Sheets
2. Col L (Statut) = "Payé" ou "Confirmé"
3. Apps Script → `POST /api/sheets-webhook`
4. Stars calculées = montant ÷ `fidelite_valeur_star_fcfa`
5. Transaction créée dans `transactions_fidelite`
6. `clients_fidelite[phone].points_stars` incrémenté
7. Palier recalculé automatiquement

**Vérification** : Firestore → `transactions_fidelite` ou `clients_fidelite`

---

## 7. UNIFICATION IDENTITÉS

**Concept** : Une seule identité par client = numéro de téléphone E.164 (+237...)

**Comment**
1. Client scanne QR + OTP → `clients_fidelite[+237...]` créé
2. Client achète carte → `loyalty_card.client_phone = +237...`
3. Admin confirme carte → `loyalty_card.client_id` = phone E.164

**Vérification**
- `loyalty_cards[id].client_id` = `+237690123456` (pas `guest_${ts}`)
- `clients_fidelite[+237690123456].phone_verified` = `true` (OTP) ou `false` (inféré)

---

## 8. FAQ ADMIN

**Q : Badge PENDING ne baisse pas ?**  
A : Rafraîchissez la page (F5).

**Q : Client ne reçoit pas WhatsApp OTP ?**  
A : Vérifiez variables Twilio (`TWILIO_*`) dans Vercel env vars.

**Q : Webhook ne déclenche pas ?**  
A : Vérifiez Col L valeur exacte ("Payé" pas "paye"). Vérifiez trigger `onEdit` dans Apps Script.

**Q : Stars comptés deux fois ?**  
A : Vérifiez `transactions_fidelite` — webhook a déduplication. Si doublon, supprimer un doc manuellement.

---

## 9. TROUBLESHOOTING

### Webhook ne déclenche pas
- Cause 1 : Col L ≠ "Payé" exactement → Corriger la valeur dans Sheets
- Cause 2 : Apps Script pas actif → Extensions → Apps Script → Vérifier trigger onEdit
- Cause 3 : `SHEETS_WEBHOOK_SECRET` incorrect → Vérifier Vercel env vars

### Client n'a pas de Stars après achat
- Cause 1 : Pas identifié (pas de phone dans `codes_sessions`) → Client doit scanner QR d'abord
- Cause 2 : Webhook pas déclenché → Voir ci-dessus

---

## CONTACT & SUPPORT

| Canal | Coordonnées |
|---|---|
| Email | admin@l-et-lui.com |
| Téléphone | +237 693 407 964 |
| Horaires | Lun-Ven 9h-18h (Kribi) |
