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
  const snap = await db.collection('hebergements').where('synced_from', '>=', 'moteur').limit(1).get();
  if (snap.empty) {
    console.log('No new accommodations found.');
    process.exit(0);
  }
  const doc = snap.docs[0];
  const data = doc.data();
  console.log('Found slug:', data.slug);
  
  // Now fetch the page locally
  const http = require('http');
  http.get(`http://localhost:3000/hebergements/${data.slug}`, (res) => {
    console.log('Status code:', res.statusCode);
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(body.includes('Application error') ? 'Got Application Error' : 'Success');
      if (body.includes('Application error')) {
        console.log('Trying to find error stack locally in .next/server...');
      }
      process.exit(0);
    });
  }).on('error', (e) => {
    console.error('HTTP Error:', e.message);
  });
})();
