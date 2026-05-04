# Guide Administrateur Alliance Privée

> **L&Lui Signature Hébergements** — Usage interne uniquement
> Version 1.0 — Mai 2026

---

## Table des matières

1. [Introduction](#1-introduction)
2. [Accès Admin](#2-accès-admin)
3. [Vue d'ensemble (Dashboard)](#3-vue-densemble-dashboard)
4. [Gestion des Partenaires](#4-gestion-des-partenaires)
5. [Validation des Paiements](#5-validation-des-paiements)
6. [Approbation des Candidatures](#6-approbation-des-candidatures)
7. [Gestion des Matchs](#7-gestion-des-matchs)
8. [Modération du Chat](#8-modération-du-chat)
9. [Bannir un Membre](#9-bannir-un-membre)
10. [FAQ Admin](#10-faq-admin)

---

## 1. Introduction

Alliance Privée est le club de rencontre sélectif de L&Lui Signature Hébergements, destiné à la diaspora camerounaise et aux élites locales. Le système repose sur trois piliers : **sélection rigoureuse**, **discrétion absolue**, et **intermédiation humaine**.

En tant qu'administrateur, vous contrôlez l'intégralité du cycle de vie d'un membre : de la candidature à la mise en relation, en passant par la validation du paiement et la modération des échanges.

---

## 2. Accès Admin

**URL :** `https://llui-signature-hebergements.vercel.app/admin/alliance-privee`

L'accès est protégé par cookie de session admin. Connectez-vous via `/admin/login` si vous n'êtes pas encore authentifié.

### Onglets disponibles

| Onglet | Icône | Rôle |
|--------|-------|------|
| Stats | 📊 | Vue d'ensemble chiffrée |
| Profils | ◈ | Liste et gestion des 26+ portraits actifs |
| Partenaires | 🏨 | Gestion des lieux partenaires |
| Paiements | 💳 | Validation des justificatifs |
| Candidatures | 📋 | Approbation ou refus des profils |
| Matchs | 💎 | Suivi des conversations actives |

---

## 3. Vue d'ensemble (Dashboard)

L'onglet **Stats** affiche en temps réel :

| Carte | Signification |
|-------|--------------|
| Partenaires actifs | Lieux avec Alliance Privée activée |
| Candidatures en attente | Profils soumis, non encore traités |
| Portraits actifs | Membres validés visibles dans le matching |
| Matchs créés | Total des mises en relation |
| Matchs mutuels | Matchs avec intérêt réciproque confirmé |
| Candidatures approuvées | Profils acceptés (historique cumulé) |

> **Alerte orange** sur l'onglet Paiements quand des justificatifs sont en attente de vérification.
> **Alerte jaune** sur l'onglet Candidatures quand des dossiers sont en attente de traitement.

---

## 4. Gestion des Partenaires

### 4.1 Ajouter un nouveau partenaire

> Les partenaires sont actuellement créés via le script `scripts/seed-alliance-partners.js`. Pour un ajout manuel en production, utiliser la section admin.

1. Onglet **Partenaires**
2. Localiser le partenaire souhaité dans la liste
3. Toggle **"Alliance Active"** → ON
4. Le QR code est automatiquement associé à l'ID Firestore du partenaire

### 4.2 Configurer les liens Revolut

Pour chaque partenaire, vous pouvez renseigner des liens Revolut spécifiques par tier :

| Champ | Exemple |
|-------|---------|
| `revolut_link_prestige` | `https://revolut.me/XXXX` |
| `revolut_link_excellence` | `https://revolut.me/XXXX` |
| `revolut_link_elite` | `https://revolut.me/XXXX` |

Si ces liens sont vides, le lien Revolut global `https://revolut.me/olivieqf4i` est utilisé en fallback.

### 4.3 Télécharger le kit marketing

Pour chaque partenaire actif, trois formats sont disponibles dans `/public/kits/alliance/` :

| Format | Dimensions | Fichier |
|--------|-----------|---------|
| QR code simple | 300×300 px | `qr-codes/alliance/[slug].png` |
| Chevalet A5 | 559×794 px | `kits/alliance/chevalet-[slug].png` |
| Flyer A4 | 794×1123 px | `kits/alliance/flyer-[slug].png` |

Pour régénérer les kits après ajout d'un nouveau partenaire :

```bash
node -e "
  const fs=require('fs');
  fs.readFileSync('.env.local','utf8').split('\n').forEach(l=>{const m=l.match(/^([A-Z_]+)=\"(.*)\"$/);if(m)process.env[m[1]]=m[2]});
  require('./scripts/generate-alliance-kits.js')
"
```

### 4.4 Désactiver un partenaire

1. Trouver le partenaire dans la liste
2. Toggle **"Alliance Active"** → OFF
3. Les liens QR existants afficheront "Ce partenaire n'est plus actif"
4. Les membres recrutés via ce partenaire restent actifs

> **Important :** La désactivation n'est pas réversible côté QR codes imprimés déjà distribués — prévoir une communication aux clients du lieu.

---

## 5. Validation des Paiements

### 5.1 Workflow de validation

```
Client paye (Revolut ou Orange Money)
        ↓
Client upload screenshot dans /alliance-privee/paiement
        ↓
Paiement créé en Firestore (statut PENDING)
        ↓
Admin vérifie dans onglet "Paiements"
        ↓
    ✅ VERIFIED        ❌ REJECTED
        ↓                   ↓
Candidature débloquée   Candidature bloquée
```

### 5.2 Vérification Revolut (Diaspora)

Dans l'onglet **Paiements**, cliquer sur l'image du justificatif pour l'agrandir.

**Points à vérifier :**

- [ ] Destinataire : **olivieqf4i** (ou lien partenaire configuré)
- [ ] Montant exact selon le tier :
  - PRESTIGE → **150 €**
  - EXCELLENCE → **250 €**
  - ÉLITE → **500 €**
- [ ] Date récente (moins de 7 jours)
- [ ] Nom expéditeur cohérent avec la candidature

### 5.3 Vérification Orange Money (Local)

**Points à vérifier :**

- [ ] Destinataire : **693 407 964**
- [ ] Montant exact selon tier/genre :

| Tier | Homme Local | Femme Local |
|------|-------------|-------------|
| PRESTIGE | 50 000 FCFA | 10 000 FCFA |
| EXCELLENCE | 100 000 FCFA | 25 000 FCFA |
| ÉLITE | 200 000 FCFA | 50 000 FCFA |

- [ ] Date récente (moins de 7 jours)

### 5.4 Actions

| Bouton | Effet |
|--------|-------|
| ✅ Vérifier | Passe le paiement à `VERIFIED`, débloque la candidature |
| ❌ Rejeter | Passe le paiement à `REJECTED`, candidature bloquée |

> **Règle absolue :** Une candidature ne peut être approuvée que si `payment.statut === 'VERIFIED'`. Le système bloque automatiquement toute tentative d'approbation sans paiement vérifié.

---

## 6. Approbation des Candidatures

### 6.1 Workflow d'approbation

1. Onglet **Candidatures**
2. Les dossiers en attente apparaissent en premier (fond ambré)
3. Badge ⚠️ rouge = paiement non encore vérifié → traiter d'abord l'onglet Paiements
4. Cliquer **"Traiter cette candidature"** pour ouvrir le panneau de décision

### 6.2 Grille d'évaluation

**A. Informations de base**
- [ ] Prénom cohérent avec justificatif paiement
- [ ] Âge réaliste (18–65 ans)
- [ ] Email valide
- [ ] Téléphone valide (camerounais ou international)
- [ ] Paiement vérifié ✓

**B. 5 Piliers de Vie**
- [ ] Vision géographique cohérente avec localisation déclarée (Diaspora/Local)
- [ ] Niveau d'engagement réaliste
- [ ] Style de vie compatible avec tier choisi

**C. Portrait de Cœur**
- [ ] Entre 500 et 1 000 mots
- [ ] Personnalisé et authentique (pas de copier-coller générique)
- [ ] Pas de langage inapproprié
- [ ] Pas de coordonnées cachées (téléphone, réseaux sociaux)

### 6.3 Actions disponibles

#### ✅ Approuver
**Conditions :**
- Paiement `VERIFIED` ✓
- Profil authentique ✓

**Effets automatiques :**
- Carte membre créée (numéro `AP-2026-XXXXX`)
- Portrait publié dans `alliance_privee_portraits_verified`
- Email Brevo envoyé avec lien carte
- WhatsApp envoyé si téléphone présent

#### 🔄 Demander Révision
**Utiliser si :**
- Portrait trop court (< 300 mots)
- Informations manquantes
- Photos insuffisantes

**Effet :** Statut passe à `en_revision`, email envoyé au candidat.

#### ❌ Refuser
**Utiliser si :**
- Profil frauduleux confirmé
- Photos inappropriées
- Informations manifestement fausses

**Effet :** Statut passe à `refuse`, email de refus envoyé. Remboursement à effectuer manuellement.

---

## 7. Gestion des Matchs

### 7.1 Comment un match se crée

```
Membre A marque intérêt sur Membre B
                ↓
Firestore: alliance_privee_interests (status: PENDING)
                ↓
  Membre B marque intérêt sur Membre A ?
          ↙ OUI         ↘ NON
Match créé             En attente
Chat activé
Notifications envoyées
```

### 7.2 Onglet Matchs — colonnes

| Colonne | Description |
|---------|-------------|
| Membre A ↔ Membre B | IDs Firestore (8 premiers caractères) |
| Compatibilité | Score 0–100% basé sur les 5 Piliers |
| Messages | Nombre total d'échanges |
| Statut | `CHAT_ENABLED` / `ACTIVE` / `CLOSED` |
| Date | Date de création du match |

### 7.3 Organiser un rendez-vous

Pour un match prometteur (score ≥ 75%, activité régulière) :

1. Cliquer **"Voir chat"** pour lire les échanges
2. Contacter les deux membres séparément par WhatsApp
3. Proposer :
   - 2–3 dates disponibles
   - Lieu partenaire recommandé (hôtel ou restaurant de la liste)
4. Une fois les deux membres confirmés :
   - Envoyer l'adresse exacte, le nom complet et le téléphone de chacun
5. Mettre à jour le statut du match à `MEETING_SCHEDULED`

> **Lieux recommandés :** Priorité aux établissements partenaires Alliance Privée.

---

## 8. Modération du Chat

### 8.1 Accéder aux conversations

Onglet **Matchs** → Bouton **"Voir chat"** → s'ouvre dans un nouvel onglet en mode lecture admin.

### 8.2 Sentinelle IA — ce qu'elle bloque

La Sentinelle IA analyse chaque message en temps réel et bloque automatiquement :

| Type | Exemples |
|------|---------|
| Numéros de téléphone | `+237 6XX XX XX XX`, `six neuf trois...` |
| Réseaux sociaux | `instagram`, `whatsapp`, `snap`, `telegram` |
| Emails | `xxxx@gmail.com` |
| Tentatives de camouflage | `arobase`, `arrob`, `at` |
| Séquences numériques longues | `693407964` |

Les messages bloqués sont **enregistrés** avec `blocked: true` et `block_reason` pour audit admin.

### 8.3 Fermer une conversation

**Quand fermer :**
- Tentatives répétées de contournement Sentinelle (3+)
- Harcèlement caractérisé
- Comportement non conforme à la Charte

**Procédure :**
1. Onglet **Matchs** → ligne concernée
2. Bouton **"🔒 Fermer"**
3. Confirmation requise
4. Effets : `chat_enabled = false`, `status = CLOSED`
5. Les deux membres voient le message "Conversation fermée"

> **Note :** La fermeture est définitive. Elle ne peut être annulée que par intervention directe en base Firestore.

---

## 9. Bannir un Membre

> Fonctionnalité en cours de développement dans l'interface. En attendant, procédure manuelle :

### Procédure manuelle (Firestore Console)

1. Accéder à la **Firestore Console** Firebase
2. Collection : `alliance_privee_portraits_verified`
3. Trouver le document du membre
4. Mettre à jour :
   ```json
   {
     "actif": false,
     "banned": true,
     "banned_reason": "[raison]",
     "banned_at": "[timestamp ISO]"
   }
   ```
5. Collection : `alliance_privee_cards`
   - Trouver la carte du membre
   - Mettre `status: "suspended"`
6. Fermer tous les matchs actifs via l'onglet **Matchs**

### Quand bannir

| Motif | Niveau |
|-------|--------|
| Faux profil confirmé | Bannissement immédiat |
| Harcèlement avéré | Bannissement immédiat |
| Tentatives multiples de contournement (5+) | Bannissement après avertissement |
| Comportement inapproprié répété | Bannissement après 2 suspensions |

> **Note :** Le bannissement est irréversible. Documenter la raison dans le champ `banned_reason`.

---

## 10. FAQ Admin

**Q : Combien de temps pour valider une candidature ?**
Sous 48h maximum. Au-delà de 72h, le candidat reçoit un email de rappel automatique.

**Q : Un candidat peut-il repostuler après un refus ?**
Oui, après 3 mois. Le paiement est à refaire intégralement.

**Q : Comment gérer un justificatif douteux ?**
Demander une capture vidéo de l'historique de transaction en contactant le candidat directement par email (disponible dans la candidature).

**Q : Un membre peut-il avoir plusieurs cartes simultanément ?**
Non. Le système empêche techniquement la création d'une deuxième carte si une est déjà active.

**Q : Que faire si le script de génération QR échoue ?**
Vérifier que `scripts/.alliance-partners-ids.json` est à jour. Relancer `seed-alliance-partners.js` si les IDs ont changé, puis `generate-alliance-kits.js`.

**Q : Comment ajouter un partenaire hors Kribi/Douala/Yaoundé ?**
Modifier `PARTENAIRES` dans `scripts/seed-alliance-partners.js`, relancer, puis régénérer les kits.

**Q : Le score de compatibilité peut-il être modifié manuellement ?**
Non. Il est calculé algorithmiquement à partir des 5 Piliers renseignés lors de la candidature. Seul le candidat peut modifier ses piliers (via révision du profil).

---

*Guide maintenu par L&Lui Signature Hébergements — Kribi, Cameroun*
*Contact technique : voir `CLAUDE.md` à la racine du projet*
