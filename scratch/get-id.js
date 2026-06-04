require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();
(async () => {
  const snap = await db.collection('hebergements').where('slug', '==', 'residence-signature-trois-chambres-six-personnes').get();
  console.log(snap.docs[0].id);
  process.exit(0);
})();
