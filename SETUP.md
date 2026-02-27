# L&Lui Signature – Guide d'installation

## Stack technique

- **Next.js 14** (App Router, Server Actions)
- **TypeScript**
- **Tailwind CSS** (design premium beige/or)
- **Supabase** (auth + PostgreSQL + RLS)
- **Vercel** (déploiement)

---

## 1. Installation locale

```bash
cd llui-signature
npm install
cp .env.local.example .env.local
# Remplir les variables d'environnement
npm run dev
```

---

## 2. Configuration Supabase

### Créer le projet Supabase
1. Aller sur [supabase.com](https://supabase.com) → Nouveau projet
2. Choisir la région la plus proche (Europe West)

### Exécuter le schéma SQL
1. Supabase Dashboard → **SQL Editor**
2. Coller et exécuter le contenu de `sql/schema.sql`
3. Vérifier que toutes les tables sont créées

### Récupérer les clés API
1. Supabase Dashboard → **Settings** → **API**
2. Copier `Project URL` et `anon public key`
3. Remplir dans `.env.local` :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

### Configurer l'authentification
1. **Authentication** → **URL Configuration**
2. Site URL : `http://localhost:3000` (dev) puis `https://votre-domaine.cm` (prod)
3. Redirect URLs : ajouter `http://localhost:3000/**`

### Créer le premier admin
1. **Authentication** → **Users** → **Invite user**
2. Créer un compte avec votre email admin
3. Dans **SQL Editor**, exécuter :
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = 'VOTRE-USER-ID';
   ```

---

## 3. Déploiement Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Configurer les variables d'environnement sur Vercel
# Settings → Environment Variables :
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# NEXT_PUBLIC_APP_URL (votre domaine Vercel)
```

### Après déploiement
1. Mettre à jour l'URL dans Supabase Authentication settings
2. Ajouter le domaine Vercel aux Redirect URLs

---

## 4. Structure des pages

| Route | Description |
|-------|-------------|
| `/` | Listing hébergements + filtres |
| `/hebergements/[slug]` | Détail + calendrier disponibilités |
| `/reservation/[slug]` | Formulaire de réservation |
| `/confirmation?id=...` | Confirmation après réservation |
| `/espace-client` | Mes réservations (connecté) |
| `/auth/connexion` | Connexion |
| `/auth/inscription` | Inscription |
| `/admin` | Dashboard admin (admin only) |
| `/admin/reservations` | Liste des réservations |
| `/admin/reservations/[id]` | Détail + actions (confirmer/annuler/payer) |
| `/admin/hebergements` | Liste des hébergements |
| `/admin/hebergements/nouveau` | Créer un hébergement |
| `/admin/hebergements/[id]` | Modifier un hébergement |
| `/admin/hebergements/[id]/disponibilites` | Gérer le calendrier |

---

## 5. Ajouter un partenaire hébergeur

Dans Supabase SQL Editor :

```sql
INSERT INTO partners (name, email, phone, description, address)
VALUES (
  'Nom du Partenaire',
  'contact@partenaire.cm',
  '+237 6XX XXX XXX',
  'Description du partenaire',
  'Adresse, Kribi'
);
```

Puis créer les hébergements via `/admin/hebergements/nouveau`.

---

## 6. Modèle de commission

- Chaque hébergement a un `commission_rate` (%) configurable
- La commission est calculée automatiquement à la réservation
- Visible dans le détail de chaque réservation admin
- Le tableau de bord affiche le total des commissions L&Lui

---

## 7. Workflow de réservation

```
Client soumet la demande
        ↓
Statut: EN_ATTENTE
        ↓
Admin valide dans /admin/reservations/[id]
        ↓
Statut: CONFIRMÉE + dates bloquées automatiquement
        ↓
Admin marque le paiement comme reçu
        ↓
Statut paiement: PAYÉ
```

En cas de refus : statut ANNULÉE + dates libérées automatiquement.

---

## 8. Notes de production

- **Images** : utiliser Supabase Storage ou Cloudinary pour les photos réelles
- **Emails** : intégrer Resend ou Mailgun avec `RESEND_API_KEY` pour les notifications automatiques
- **Domaine** : configurer un domaine camerounais (.cm) sur Vercel
- **HTTPS** : activé automatiquement par Vercel
