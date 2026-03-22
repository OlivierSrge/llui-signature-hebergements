/**
 * Script de correction du document test marié
 * Met à jour portail_users/mariage_marie_test_2026 avec les champs enrichis
 *
 * Usage :
 *   FIREBASE_PROJECT_ID=xxx FIREBASE_CLIENT_EMAIL=xxx FIREBASE_PRIVATE_KEY="xxx" node scripts/fix-marie-test.js
 */

const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore')

const UID = 'mariage_marie_test_2026'
const BUDGET_TOTAL = 7000

const TACHES_TEMPLATE = [
  { id: 1, titre: 'Confirmer le lieu de réception', statut: 'todo', priorite: 'haute', categorie: 'logistique' },
  { id: 2, titre: 'Signer le contrat traiteur', statut: 'todo', priorite: 'haute', categorie: 'traiteur' },
  { id: 3, titre: 'Finaliser la liste des invités', statut: 'todo', priorite: 'haute', categorie: 'invites' },
  { id: 4, titre: 'Partager mon code avec les invités', statut: 'todo', priorite: 'haute', categorie: 'cagnotte' },
  { id: 5, titre: 'Choisir les hébergements', statut: 'todo', priorite: 'moyenne', categorie: 'hebergement' },
  { id: 6, titre: 'Confirmer le photographe', statut: 'todo', priorite: 'moyenne', categorie: 'photo' },
  { id: 7, titre: 'Envoyer les invitations', statut: 'todo', priorite: 'basse', categorie: 'invites' },
  { id: 8, titre: 'Préparer le plan de table', statut: 'todo', priorite: 'basse', categorie: 'logistique' },
]

const PRESTATAIRES = [
  { nom: 'Traiteur Royal', type: 'traiteur', statut: 'confirmé' },
  { nom: 'Studio Lumière', type: 'photographe', statut: 'en_discussion' },
  { nom: 'Fleurs & Décors', type: 'decoration', statut: 'à_confirmer' },
]

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Erreur : variables FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL et FIREBASE_PRIVATE_KEY requises.')
    process.exit(1)
  }

  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  const db = getFirestore()

  const docRef = db.collection('portail_users').doc(UID)
  const snap = await docRef.get()
  if (!snap.exists) {
    console.error(`Document ${UID} introuvable dans portail_users.`)
    process.exit(1)
  }

  const v1 = Math.round(BUDGET_TOTAL * 0.30)
  const v2 = Math.round(BUDGET_TOTAL * 0.40)
  const v3 = BUDGET_TOTAL - v1 - v2

  await docRef.update({
    date_mariage: Timestamp.fromDate(new Date('2026-04-25')),
    noms_maries: 'Marié Test',
    lieu: 'Kribi',
    nb_invites_prevus: 250,
    budget_total: BUDGET_TOTAL,
    budget_categories: {
      traiteur: 2500,
      decoration: 1000,
      hebergement: 1500,
      beaute: 500,
      photographie: 1000,
      autres: 500,
    },
    versements: {
      v1: { label: 'Acompte 30%', montant: v1, statut: 'payé' },
      v2: { label: 'Versement 40%', montant: v2, statut: 'en_attente' },
      v3: { label: 'Solde 30%', montant: v3, statut: 'à_venir' },
    },
    taches: TACHES_TEMPLATE,
    prestataires: PRESTATAIRES,
    grade: 'START',
    invites: [],
    marie_uid: UID,
  })
  console.log(`✅ Document principal ${UID} mis à jour.`)

  // Seeder la subcollection todos si elle est vide
  const todosSnap = await docRef.collection('todos').limit(1).get()
  if (todosSnap.empty) {
    const revMap = { haute: 50, moyenne: 30, basse: 20 }
    const batch = db.batch()
    for (const t of TACHES_TEMPLATE) {
      const ref = docRef.collection('todos').doc()
      batch.set(ref, {
        libelle: t.titre,
        done: false,
        priorite: t.priorite,
        categorie: t.categorie,
        rev: revMap[t.priorite] ?? 20,
        created_at: FieldValue.serverTimestamp(),
      })
    }
    await batch.commit()
    console.log(`✅ ${TACHES_TEMPLATE.length} todos seedés dans la subcollection.`)
  } else {
    console.log('ℹ️  Subcollection todos déjà peuplée, skip seeding.')
  }

  console.log('\n✅ Script terminé avec succès.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Erreur :', err.message)
  process.exit(1)
})
