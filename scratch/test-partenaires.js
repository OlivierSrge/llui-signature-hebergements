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
  const snap = await db.collection('partenaires').get();
  snap.docs.forEach(d => {
    const data = d.data();
    console.log(d.id, data.name, 'created_at:', data.created_at?.constructor?.name, 'updated_at:', data.updated_at?.constructor?.name);
  });
  process.exit(0);
})();
