/**
 * Seed — 15 partenaires Alliance Privée + QR codes PNG
 *
 * Usage : node -e "
 *   const fs=require('fs');
 *   fs.readFileSync('.env.local','utf8').split('\n').forEach(l=>{const m=l.match(/^([A-Z_]+)=\"(.*)\"$/);if(m)process.env[m[1]]=m[2]});
 *   require('./scripts/seed-alliance-partners.js')
 * "
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const QRCode = require('qrcode')
const slugify = require('slugify')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'https://llui-signature-hebergements.vercel.app'
const QR_DIR = path.join(__dirname, '..', 'public', 'qr-codes', 'alliance')

const PARTENAIRES = [
  // ── Kribi ──────────────────────────────────────────────────────
  { nom: 'Hôtel Ilomba Kribi',          type: 'HOTEL',      ville: 'Kribi',   description: 'Face à l\'Océan Atlantique, un écrin de sérénité pour votre cercle sélectif.' },
  { nom: 'Tara Plage Restaurant',        type: 'RESTAURANT', ville: 'Kribi',   description: 'Gastronomie et vue imprenable sur la mer pour les membres de l\'Alliance.' },
  { nom: 'Gîtes de Kribi',              type: 'HOTEL',      ville: 'Kribi',   description: 'Hébergement exclusif au cœur du paradis balnéaire de Kribi.' },
  { nom: 'Le Paradis des Plongeurs',     type: 'BAR',        ville: 'Kribi',   description: 'Bar de plage premium, rendez-vous discret des initiés de l\'Alliance.' },
  { nom: 'Restaurant Le Phare',          type: 'RESTAURANT', ville: 'Kribi',   description: 'Cuisine raffinée avec vue sur le phare historique de Kribi.' },
  // ── Douala ─────────────────────────────────────────────────────
  { nom: 'Hôtel Pullman Douala Rabingha', type: 'HOTEL',     ville: 'Douala',  description: 'Le summum du luxe hôtelier à Douala, cadre idéal pour les rencontres d\'exception.' },
  { nom: 'Le Méridien Douala',           type: 'HOTEL',      ville: 'Douala',  description: 'Élégance internationale et hospitalité camerounaise pour vos moments privilégiés.' },
  { nom: 'Bar Le 360° Akwa',             type: 'BAR',        ville: 'Douala',  description: 'Vue panoramique sur la ville, ambiance feutrée pour les membres sélectifs.' },
  { nom: 'Restaurant La Fourchette',     type: 'RESTAURANT', ville: 'Douala',  description: 'Table gastronomique franco-camerounaise, terreau de rencontres authentiques.' },
  { nom: 'Le Carré VIP Lounge',          type: 'BAR',        ville: 'Douala',  description: 'Lounge confidentiel réservé aux membres et leurs invités.' },
  // ── Yaoundé ────────────────────────────────────────────────────
  { nom: 'Hôtel Hilton Yaoundé',         type: 'HOTEL',      ville: 'Yaoundé', description: 'Prestige et discrétion au cœur de la capitale, pour des rencontres mémorables.' },
  { nom: 'Bar Le Privilège Bastos',      type: 'BAR',        ville: 'Yaoundé', description: 'Quartier diplomatique, atmosphère exclusive pour les membres de l\'Alliance.' },
  { nom: 'Restaurant Mont Fébé',         type: 'RESTAURANT', ville: 'Yaoundé', description: 'Panorama exceptionnel sur Yaoundé, gastronomie d\'altitude pour esprits raffinés.' },
  { nom: 'Hôtel Azur Paradise',          type: 'HOTEL',      ville: 'Yaoundé', description: 'Havre de paix dans la ville-capitale, espace intime pour les membres distingués.' },
  { nom: 'Le Diplomate Lounge',          type: 'BAR',        ville: 'Yaoundé', description: 'Lounge du quartier des ambassades, rencontres d\'élite dans un cadre feutré.' },
]

async function main() {
  // ─── Firebase init ────────────────────────────────────────────
  const projectId   = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌  Variables Firebase manquantes'); process.exit(1)
  }
  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }) })
  }
  const db = getFirestore()
  fs.mkdirSync(QR_DIR, { recursive: true })

  console.log('\n🏨  Création des 15 partenaires Alliance Privée...\n')
  const resultats = []

  for (const p of PARTENAIRES) {
    const ref = db.collection('alliance_privee_partners').doc()
    const id = ref.id
    const now = new Date().toISOString()

    const qrUrl = `${BASE_URL}/alliance-privee/activate?pid=${id}`
    await ref.set({
      id,
      nom_etablissement: p.nom,
      type: p.type,
      ville: p.ville,
      alliance_active: true,
      description_club: p.description,
      prix_prestige_fcfa: 50000,
      prix_excellence_fcfa: 100000,
      prix_elite_fcfa: 200000,
      revolut_link_prestige: null,
      revolut_link_excellence: null,
      revolut_link_elite: null,
      qr_code_data: qrUrl,
      cartes_vendues: 0,
      membres_recrutes: 0,
      partenaire_id: '',
      created_at: now,
      updated_at: now,
    })

    // QR code PNG
    const slug = slugify(p.nom, { lower: true, strict: true, locale: 'fr' })
    const qrFile = path.join(QR_DIR, `${slug}.png`)
    await QRCode.toFile(qrFile, qrUrl, { type: 'png', width: 300, margin: 4 })

    resultats.push({ nom: p.nom, ville: p.ville, id, slug, url: qrUrl })
    process.stdout.write(`  ✓ ${p.nom}\n`)
  }

  // Tableau récapitulatif
  console.log('\n')
  const w = [30, 9, 52, 0]
  const sep = `+${'-'.repeat(w[0]+2)}+${'-'.repeat(w[1]+2)}+${'-'.repeat(w[2]+2)}+`
  console.log(sep)
  console.log(`| ${'Partenaire'.padEnd(w[0])} | ${'Ville'.padEnd(w[1])} | ${'URL d\'activation'.padEnd(w[2])} |`)
  console.log(sep)
  for (const r of resultats) {
    console.log(`| ${r.nom.padEnd(w[0])} | ${r.ville.padEnd(w[1])} | ${r.url.padEnd(w[2])} |`)
  }
  console.log(sep)
  console.log(`\n✅  ${resultats.length} partenaires créés`)
  console.log(`✅  ${resultats.length} QR codes PNG → /public/qr-codes/alliance/\n`)

  // Sauvegarde des IDs pour les autres scripts
  const mapFile = path.join(__dirname, '.alliance-partners-ids.json')
  fs.writeFileSync(mapFile, JSON.stringify(resultats, null, 2))
  console.log(`💾  IDs sauvegardés dans scripts/.alliance-partners-ids.json\n`)
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
