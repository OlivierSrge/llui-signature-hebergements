/**
 * Seed Firestore — Partenaire Alliance Privée de démonstration
 *
 * Usage :
 *   FIREBASE_PROJECT_ID=xxx FIREBASE_CLIENT_EMAIL=xxx FIREBASE_PRIVATE_KEY="xxx" node scripts/seed-alliance-demo.js
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

async function main() {
  const projectId   = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌  Variables manquantes : FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY')
    process.exit(1)
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    })
  }

  const db = getFirestore()
  const col = db.collection('alliance_privee_partners')

  // Crée d'abord le doc pour obtenir l'ID auto-généré
  const ref = col.doc()
  const id  = ref.id

  const data = {
    id,
    nom_etablissement:    'Hôtel Ilomba Kribi',
    type:                 'HOTEL',
    ville:                'Kribi',
    alliance_active:      true,
    prix_prestige_fcfa:   50000,
    prix_excellence_fcfa: 100000,
    prix_elite_fcfa:      200000,
    revolut_link_prestige:   null,
    revolut_link_excellence: null,
    revolut_link_elite:      null,
    description_club:     null,
    qr_code_data:         `https://llui-signature-hebergements.vercel.app/alliance-privee/activate?pid=${id}`,
    cartes_vendues:       0,
    membres_recrutes:     0,
    created_at:           new Date().toISOString(),
    updated_at:           new Date().toISOString(),
  }

  await ref.set(data)

  console.log(`\n✅  Partenaire créé avec ID: ${id}`)
  console.log(`\n🔗  URL de test :`)
  console.log(`    https://llui-signature-hebergements.vercel.app/alliance-privee/activate?pid=${id}`)
  console.log()
}

main().catch((err) => {
  console.error('❌  Erreur :', err)
  process.exit(1)
})
