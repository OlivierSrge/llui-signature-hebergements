#!/usr/bin/env node
// scripts/migrate-portail-users.js
// Harmonise les champs des documents portail_users vers la nouvelle structure
//
// Mappings appliqués (sans supprimer les anciens champs) :
//   date_evenement         → date_mariage        (champ racine ou projet.date_evenement)
//   nombre_invites_prevu   → nb_invites_prevus   (champ racine ou projet.nombre_invites_prevu)
//   nom                    → noms_maries         (si role === 'MARIÉ' et noms_maries absent)
//   projet.lieu            → lieu                (si lieu absent à la racine)
//   projet.budget_previsionnel → budget_total    (si budget_total absent)
//
// Usage : node scripts/migrate-portail-users.js [--dry-run]

const admin = require('firebase-admin')
const path = require('path')

// Charger les variables d'environnement depuis .env.local si disponible
try {
  require('dotenv').config({ path: path.resolve('.env.local') })
} catch { /* dotenv optionnel */ }

const isDryRun = process.argv.includes('--dry-run')

// Initialiser Firebase Admin
if (!admin.apps.length) {
  // Option 1 : JSON complet dans FIREBASE_SERVICE_ACCOUNT_JSON
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    admin.initializeApp({ credential: admin.credential.cert(sa) })
    console.log('✅ Firebase initialisé via FIREBASE_SERVICE_ACCOUNT_JSON')

  // Option 2 : Variables séparées (même format que l'app Next.js)
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    })
    console.log(`✅ Firebase initialisé — projet: ${process.env.FIREBASE_PROJECT_ID}`)

  // Option 3 : Fichier service account local
  } else {
    const candidates = ['./service-account.json', './firebase-service-account.json', '../service-account.json']
    let found = false
    for (const candidate of candidates) {
      try {
        const sa = require(path.resolve(candidate))
        admin.initializeApp({ credential: admin.credential.cert(sa) })
        console.log(`✅ Firebase initialisé depuis : ${candidate}`)
        found = true
        break
      } catch { /* continue */ }
    }
    if (!found) {
      console.error('❌ Impossible de trouver les credentials Firebase.')
      console.error('Solutions :')
      console.error('  1. Définir FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY dans .env.local')
      console.error('  2. Définir FIREBASE_SERVICE_ACCOUNT_JSON (JSON entier)')
      console.error('  3. Placer service-account.json à la racine du projet')
      process.exit(1)
    }
  }
}

const db = admin.firestore()

async function main() {
  console.log(`\n🔄 Migration portail_users — ${isDryRun ? 'DRY RUN' : 'ÉCRITURE RÉELLE'}`)
  console.log('─'.repeat(60))

  const snap = await db.collection('portail_users').get()
  console.log(`📄 ${snap.size} documents trouvés dans portail_users\n`)

  let updated = 0
  let skipped = 0

  for (const doc of snap.docs) {
    const d = doc.data()
    const uid = doc.id
    const role = d.role ?? ''
    const updates = {}

    // 1. date_evenement → date_mariage
    if (!d.date_mariage) {
      const candidateDate = d.date_evenement ?? d.projet?.date_evenement ?? null
      if (candidateDate) {
        updates.date_mariage = candidateDate
        console.log(`  [${uid}] date_mariage ← ${typeof candidateDate === 'string' ? candidateDate : 'Timestamp'}`)
      }
    }

    // 2. nombre_invites_prevu → nb_invites_prevus
    if (d.nb_invites_prevus === undefined) {
      const candidateNb = d.nombre_invites_prevu ?? d.nombre_invites_prevus ?? d.projet?.nombre_invites_prevu ?? null
      if (candidateNb !== null && candidateNb !== undefined) {
        updates.nb_invites_prevus = candidateNb
        console.log(`  [${uid}] nb_invites_prevus ← ${candidateNb}`)
      }
    }

    // 3. nom → noms_maries (uniquement pour les mariés)
    if (!d.noms_maries && (role === 'MARIÉ' || role === 'MARIE')) {
      const candidateNom = d.nom ?? d.projet?.nom ?? d.displayName ?? null
      if (candidateNom) {
        updates.noms_maries = candidateNom
        console.log(`  [${uid}] noms_maries ← "${candidateNom}"`)
      }
    }

    // 4. projet.lieu → lieu (champ racine)
    if (!d.lieu && d.projet?.lieu) {
      updates.lieu = d.projet.lieu
      console.log(`  [${uid}] lieu ← "${d.projet.lieu}"`)
    }

    // 5. projet.budget_previsionnel → budget_total
    if (!d.budget_total && !d.budget_previsionnel) {
      const candidateBudget = d.projet?.budget_previsionnel ?? null
      if (candidateBudget) {
        updates.budget_total = candidateBudget
        console.log(`  [${uid}] budget_total ← ${candidateBudget}`)
      }
    }

    if (Object.keys(updates).length > 0) {
      if (!isDryRun) {
        await doc.ref.update(updates)
      }
      updated++
    } else {
      skipped++
    }
  }

  console.log('\n' + '─'.repeat(60))
  console.log(`✅ Migration terminée`)
  console.log(`   Documents mis à jour : ${updated}`)
  console.log(`   Documents inchangés  : ${skipped}`)
  if (isDryRun) {
    console.log('\n⚠️  Mode DRY RUN — aucune donnée n\'a été écrite.')
    console.log('   Relancez sans --dry-run pour appliquer les changements.')
  }
}

main().catch(err => {
  console.error('❌ Erreur :', err)
  process.exit(1)
})
