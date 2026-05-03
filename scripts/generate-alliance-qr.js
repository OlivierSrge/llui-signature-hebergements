/**
 * Génère des QR codes PNG pour les partenaires Alliance Privée actifs.
 *
 * Usage :
 *   FIREBASE_PROJECT_ID=xxx FIREBASE_CLIENT_EMAIL=xxx FIREBASE_PRIVATE_KEY="xxx" \
 *     node scripts/generate-alliance-qr.js
 *
 * Ou depuis la racine du projet (charge .env.local automatiquement) :
 *   node -e "
 *     const fs=require('fs');
 *     fs.readFileSync('.env.local','utf8').split('\n').forEach(l=>{const m=l.match(/^([A-Z_]+)=\"(.*)\"$/);if(m)process.env[m[1]]=m[2]});
 *     require('./scripts/generate-alliance-qr.js')
 *   "
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const QRCode = require('qrcode')
const slugify = require('slugify')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'https://llui-signature-hebergements.vercel.app'
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'qr-codes', 'alliance')

async function main() {
  // ─── Firebase init ────────────────────────────────────────────────────────
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

  // ─── Dossier de sortie ────────────────────────────────────────────────────
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  // ─── Lecture Firestore ────────────────────────────────────────────────────
  const snap = await db
    .collection('alliance_privee_partners')
    .where('alliance_active', '==', true)
    .get()

  if (snap.empty) {
    console.log('⚠️   Aucun partenaire Alliance actif trouvé.')
    return
  }

  const partenaires = snap.docs.map(d => ({ id: d.id, ...d.data() }))

  // ─── Génération QR ────────────────────────────────────────────────────────
  const resultats = []

  for (const p of partenaires) {
    const url = `${BASE_URL}/alliance-privee/activate?pid=${p.id}`

    const slug = slugify(p.nom_etablissement || p.id, {
      lower: true,
      strict: true,
      locale: 'fr',
    })
    const filename = `${slug}.png`
    const filepath = path.join(OUTPUT_DIR, filename)
    const cheminPublic = `/public/qr-codes/alliance/${filename}`

    await QRCode.toFile(filepath, url, {
      type: 'png',
      width: 300,
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })

    resultats.push({
      nom: p.nom_etablissement || '(sans nom)',
      ville: p.ville || '—',
      fichier: cheminPublic,
      url,
    })
  }

  // ─── Tableau récapitulatif ─────────────────────────────────────────────────
  console.log('\n')

  const colNom    = Math.max(10, ...resultats.map(r => r.nom.length))
  const colVille  = Math.max(6,  ...resultats.map(r => r.ville.length))
  const colFichier= Math.max(12, ...resultats.map(r => r.fichier.length))

  const sep = `+${'-'.repeat(colNom+2)}+${'-'.repeat(colVille+2)}+${'-'.repeat(colFichier+2)}+`

  console.log(sep)
  console.log(
    `| ${'Partenaire'.padEnd(colNom)} | ${'Ville'.padEnd(colVille)} | ${'QR Code'.padEnd(colFichier)} |`
  )
  console.log(sep)

  for (const r of resultats) {
    console.log(
      `| ${r.nom.padEnd(colNom)} | ${r.ville.padEnd(colVille)} | ${r.fichier.padEnd(colFichier)} |`
    )
    console.log(`|   ${('→ ' + r.url).padEnd(colNom + colVille + colFichier + 5)} |`)
  }

  console.log(sep)
  console.log(`\n✓ ${resultats.length} QR code(s) générés dans /public/qr-codes/alliance/\n`)
}

main().catch((err) => {
  console.error('❌  Erreur :', err)
  process.exit(1)
})
