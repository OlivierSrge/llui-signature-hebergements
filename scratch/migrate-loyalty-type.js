/**
 * Migration : ajouter partenaire_type aux programmes existants
 * Détecte le type en cherchant l'ID dans chaque collection.
 * Usage : node scratch/migrate-loyalty-type.js
 */
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();

async function resolvePartnerType(partenaire_id) {
  // Essayer prescripteurs_partenaires en premier
  const prescDoc = await db.collection('prescripteurs_partenaires').doc(partenaire_id).get();
  if (prescDoc.exists) {
    const d = prescDoc.data();
    return {
      type: 'prescripteur',
      name: d.nom_etablissement ?? d.nom ?? d.name ?? 'Partenaire',
    };
  }
  // Puis partenaires (hébergements)
  const hebergDoc = await db.collection('partenaires').doc(partenaire_id).get();
  if (hebergDoc.exists) {
    const d = hebergDoc.data();
    return {
      type: 'hebergement',
      name: d.name ?? d.nom ?? d.nom_etablissement ?? 'Partenaire',
    };
  }
  return { type: 'prescripteur', name: 'Partenaire inconnu' }; // fallback
}

async function migrate() {
  const snap = await db.collection('loyalty_programs').get();
  const toMigrate = snap.docs.filter(d => !d.data().partenaire_type);

  if (toMigrate.length === 0) {
    console.log('✅ Tous les programmes ont déjà un partenaire_type — rien à faire.');
    process.exit(0);
  }

  console.log(`Migration de ${toMigrate.length} programme(s) sans partenaire_type...\n`);

  for (const doc of toMigrate) {
    const data = doc.data();
    const { type, name } = await resolvePartnerType(data.partenaire_id);
    await doc.ref.update({ partenaire_type: type, partenaire_name: name });
    console.log(`  ✅ ${doc.id} "${data.nom}" → type=${type}, name="${name}"`);
  }

  console.log(`\n🎉 Migration terminée — ${toMigrate.length} programme(s) mis à jour.`);
  process.exit(0);
}

migrate().catch(e => {
  console.error('Erreur:', e);
  process.exit(1);
});
