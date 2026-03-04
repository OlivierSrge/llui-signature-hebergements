/**
 * Script de nettoyage Firestore
 * Supprime tous les documents des collections : hebergements, partenaires
 *
 * Usage :
 *   FIREBASE_PROJECT_ID=xxx FIREBASE_CLIENT_EMAIL=xxx FIREBASE_PRIVATE_KEY="xxx" node scripts/cleanup-firestore.js
 */

const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

const COLLECTIONS_TO_DELETE = ['hebergements', 'partenaires']

async function deleteCollection(db, collectionName) {
  const snap = await db.collection(collectionName).get()
  if (snap.empty) {
    console.log(`  [${collectionName}] Vide, rien à supprimer.`)
    return 0
  }

  const batch = db.batch()
  snap.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()
  console.log(`  [${collectionName}] ${snap.size} document(s) supprimé(s).`)
  return snap.size
}

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

  console.log('Début du nettoyage...')
  let total = 0
  for (const col of COLLECTIONS_TO_DELETE) {
    total += await deleteCollection(db, col)
  }
  console.log(`\nTerminé. ${total} document(s) supprimé(s) au total.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Erreur :', err.message)
  process.exit(1)
})
