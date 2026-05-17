require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

(async () => {
  const snap = await db.collection('hebergements').orderBy('synced_from').limit(1).get();
  if (snap.empty) {
    console.log('No accommodations found.');
    process.exit(0);
  }
  const doc = snap.docs[0];
  const data = doc.data();
  console.log('Found slug:', data.slug, 'status:', data.status);
  
  // Actually, we can just activate it so we can fetch it!
  await doc.ref.update({ status: 'active' });
  console.log('Activated', data.slug);
  
  process.exit(0);
})();
