/**
 * Génère 3 formats marketing par partenaire Alliance Privée
 *
 * 1. QR code simple PNG  300×300  → /public/qr-codes/alliance/[slug].png
 * 2. Chevalet A5  (559×794px)     → /public/kits/alliance/chevalet-[slug].png
 * 3. Flyer A4     (794×1123px)    → /public/kits/alliance/flyer-[slug].png
 *
 * Usage :
 *   node -e "
 *     const fs=require('fs');
 *     fs.readFileSync('.env.local','utf8').split('\n').forEach(l=>{const m=l.match(/^([A-Z_]+)=\"(.*)\"$/);if(m)process.env[m[1]]=m[2]});
 *     require('./scripts/generate-alliance-kits.js')
 *   "
 *
 * Prérequis : scripts/.alliance-partners-ids.json doit exister
 */

const QRCode = require('qrcode')
const sharp  = require('sharp')
const path   = require('path')
const fs     = require('fs')

const QR_DIR        = path.join(__dirname, '..', 'public', 'qr-codes', 'alliance')
const KIT_DIR       = path.join(__dirname, '..', 'public', 'kits', 'alliance')
const PARTNERS_FILE = path.join(__dirname, '.alliance-partners-ids.json')

// ── Palette ──────────────────────────────────────────────────────────────
const GOLD   = '#D4AF37'
const GOLD_D = '#8B6914'
const GOLD_M = '#C49A28'
const BLACK  = '#0A0A0A'
const WHITE  = '#F5F0E8'

// ── Escape XML ────────────────────────────────────────────────────────────
function x(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── QR code en SVG string (inner path seulement) ─────────────────────────
async function qrSvgString(url) {
  return await QRCode.toString(url, {
    type: 'svg', margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

// ─────────────────────────────────────────────────────────────────────────
// 1. QR CODE SIMPLE
// ─────────────────────────────────────────────────────────────────────────
async function generateQr(partner) {
  const outPath = path.join(QR_DIR, `${partner.slug}.png`)
  await QRCode.toFile(outPath, partner.url, {
    type: 'png', width: 300, margin: 4,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

// ─────────────────────────────────────────────────────────────────────────
// 2. CHEVALET A5  559 × 794 px
// ─────────────────────────────────────────────────────────────────────────
async function generateChevalet(partner) {
  const W = 559, H = 794
  const qrSvg = await qrSvgString(partner.url)

  // Extraire viewBox du QR SVG généré par qrcode
  const vbMatch = qrSvg.match(/viewBox="([^"]+)"/)
  const qrVB = vbMatch ? vbMatch[1] : '0 0 37 37'

  const nom = x(partner.nom.length > 32 ? partner.nom.substring(0, 30) + '…' : partner.nom)
  const ville = x(partner.ville.toUpperCase())

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="goldH" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0"/>
      <stop offset="15%" stop-color="${GOLD}" stop-opacity="1"/>
      <stop offset="85%" stop-color="${GOLD}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="heroGold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${GOLD_D}"/>
      <stop offset="50%" stop-color="${GOLD}"/>
      <stop offset="100%" stop-color="${GOLD_D}"/>
    </linearGradient>
  </defs>

  <!-- Fond noir -->
  <rect width="${W}" height="${H}" fill="${BLACK}"/>

  <!-- Dégradé haut -->
  <rect width="${W}" height="120" fill="url(#topGrad)"/>

  <!-- Bordure extérieure -->
  <rect x="14" y="14" width="${W-28}" height="${H-28}" rx="6" fill="none"
        stroke="${GOLD_D}" stroke-width="1.5"/>

  <!-- Bordure intérieure fine -->
  <rect x="22" y="22" width="${W-44}" height="${H-44}" rx="4" fill="none"
        stroke="${GOLD}" stroke-width="0.5" opacity="0.4"/>

  <!-- L & LUI -->
  <text x="${W/2}" y="60" text-anchor="middle" font-family="Georgia,serif" font-size="13"
        font-weight="bold" fill="${GOLD}" letter-spacing="4">L &amp; L U I</text>
  <text x="${W/2}" y="78" text-anchor="middle" font-family="sans-serif" font-size="10"
        fill="${GOLD_M}" letter-spacing="2">ALLIANCE PRIVÉE</text>

  <!-- Ligne or -->
  <rect x="60" y="90" width="${W-120}" height="1" fill="url(#goldH)"/>

  <!-- Étoile -->
  <text x="${W/2}" y="118" text-anchor="middle" font-family="serif" font-size="18"
        fill="${GOLD}">✦</text>

  <!-- Titre -->
  <text x="${W/2}" y="175" text-anchor="middle" font-family="Georgia,serif" font-size="28"
        font-weight="bold" fill="${WHITE}">Serez-vous</text>
  <text x="${W/2}" y="215" text-anchor="middle" font-family="Georgia,serif" font-size="34"
        font-weight="bold" fill="url(#heroGold)">l'un d'eux ?</text>

  <!-- Ligne séparatrice -->
  <rect x="80" y="230" width="${W-160}" height="1" fill="url(#goldH)"/>
  <text x="${W/2}" y="255" text-anchor="middle" font-family="Georgia,serif" font-size="13"
        font-style="italic" fill="${GOLD}" opacity="0.75">Club privé de rencontres sélectives</text>
  <rect x="80" y="265" width="${W-160}" height="1" fill="url(#goldH)"/>

  <!-- Cadre QR -->
  <rect x="167" y="273" width="226" height="226" rx="10" fill="${WHITE}" stroke="${GOLD}" stroke-width="1.5"/>

  <!-- QR code embedded SVG -->
  <svg x="179" y="285" width="202" height="202" viewBox="${qrVB}">
    ${qrSvg.replace(/<\/?svg[^>]*>/g, '')}
  </svg>

  <!-- Étiquette QR -->
  <text x="${W/2}" y="${285+202+36}" text-anchor="middle" font-family="serif" font-size="14"
        fill="${GOLD}">✦</text>
  <text x="${W/2}" y="${285+202+52}" text-anchor="middle" font-family="sans-serif" font-size="11"
        fill="${GOLD_M}" letter-spacing="1">SCANNEZ POUR POSTULER</text>

  <!-- Ligne + nom partenaire -->
  <rect x="50" y="${285+202+62}" width="${W-100}" height="1" fill="url(#goldH)"/>
  <text x="${W/2}" y="${285+202+82}" text-anchor="middle" font-family="sans-serif" font-size="14"
        font-weight="bold" fill="${WHITE}">${nom}</text>
  <text x="${W/2}" y="${285+202+100}" text-anchor="middle" font-family="sans-serif" font-size="11"
        fill="${GOLD_M}">${ville}</text>
  <rect x="50" y="${285+202+110}" width="${W-100}" height="1" fill="url(#goldH)"/>

  <!-- 3 piliers -->
  <text x="${W/4}" y="${285+202+148}" text-anchor="middle" font-family="serif" font-size="16"
        fill="${GOLD}">◈</text>
  <text x="${W/4}" y="${285+202+164}" text-anchor="middle" font-family="sans-serif" font-size="9"
        fill="${WHITE}" opacity="0.7">Sélection rigoureuse</text>

  <text x="${W/2}" y="${285+202+148}" text-anchor="middle" font-family="serif" font-size="16"
        fill="${GOLD}">◈</text>
  <text x="${W/2}" y="${285+202+164}" text-anchor="middle" font-family="sans-serif" font-size="9"
        fill="${WHITE}" opacity="0.7">Discrétion absolue</text>

  <text x="${3*W/4}" y="${285+202+148}" text-anchor="middle" font-family="serif" font-size="16"
        fill="${GOLD}">◈</text>
  <text x="${3*W/4}" y="${285+202+164}" text-anchor="middle" font-family="sans-serif" font-size="9"
        fill="${WHITE}" opacity="0.7">Rencontres d'exception</text>

  <!-- Pied de page -->
  <rect x="60" y="${H-64}" width="${W-120}" height="1" fill="url(#goldH)"/>
  <text x="${W/2}" y="${H-48}" text-anchor="middle" font-family="sans-serif" font-size="9"
        fill="${GOLD}" opacity="0.5">Membres sélectifs · Discrétion · Qualité</text>
  <text x="${W/2}" y="${H-32}" text-anchor="middle" font-family="sans-serif" font-size="8"
        fill="${GOLD}" opacity="0.35">llui-signature-hebergements.vercel.app</text>

  <!-- Étoiles coins bas -->
  <text x="40" y="${H-28}" text-anchor="middle" font-family="serif" font-size="12"
        fill="${GOLD}" opacity="0.3">✦</text>
  <text x="${W-40}" y="${H-28}" text-anchor="middle" font-family="serif" font-size="12"
        fill="${GOLD}" opacity="0.3">✦</text>
</svg>`

  const outPath = path.join(KIT_DIR, `chevalet-${partner.slug}.png`)
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outPath)
}

// ─────────────────────────────────────────────────────────────────────────
// 3. FLYER A4  794 × 1123 px
// ─────────────────────────────────────────────────────────────────────────
async function generateFlyer(partner) {
  const W = 794, H = 1123
  const qrSvg = await qrSvgString(partner.url)
  const vbMatch = qrSvg.match(/viewBox="([^"]+)"/)
  const qrVB = vbMatch ? vbMatch[1] : '0 0 37 37'

  const nom = x(partner.nom.length > 42 ? partner.nom.substring(0, 40) + '…' : partner.nom)
  const ville = x(partner.ville.toUpperCase())

  // Coordonnées sections
  const sepY1 = 272   // ligne après description
  const tierY = 300   // cartes tiers
  const sepY2 = 470   // ligne avant avantages
  const advY  = 498   // avantages
  const ctaY  = 710   // zone QR+CTA

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="headerGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="goldH" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0"/>
      <stop offset="15%" stop-color="${GOLD}" stop-opacity="1"/>
      <stop offset="85%" stop-color="${GOLD}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="heroGold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${GOLD_D}"/>
      <stop offset="30%" stop-color="${GOLD}"/>
      <stop offset="70%" stop-color="${GOLD}"/>
      <stop offset="100%" stop-color="${GOLD_D}"/>
    </linearGradient>
    <linearGradient id="topBar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${GOLD}"/>
      <stop offset="100%" stop-color="${GOLD_D}"/>
    </linearGradient>
    <linearGradient id="botBar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${GOLD_D}"/>
      <stop offset="100%" stop-color="${GOLD}"/>
    </linearGradient>
    <linearGradient id="partBox" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0.05"/>
    </linearGradient>
  </defs>

  <!-- Fond noir -->
  <rect width="${W}" height="${H}" fill="${BLACK}"/>

  <!-- Bande or haut -->
  <rect x="0" y="0" width="${W}" height="6" fill="url(#topBar)"/>

  <!-- Dégradé header -->
  <rect x="0" y="0" width="${W}" height="260" fill="url(#headerGrad)"/>

  <!-- Bordures latérales -->
  <line x1="28" y1="20" x2="28" y2="${H-20}" stroke="${GOLD_D}" stroke-width="1" opacity="0.5"/>
  <line x1="${W-28}" y1="20" x2="${W-28}" y2="${H-20}" stroke="${GOLD_D}" stroke-width="1" opacity="0.5"/>

  <!-- L & LUI -->
  <text x="${W/2}" y="65" text-anchor="middle" font-family="sans-serif" font-size="18"
        font-weight="bold" fill="${GOLD}" letter-spacing="4">L &amp; L U I</text>
  <text x="${W/2}" y="85" text-anchor="middle" font-family="sans-serif" font-size="11"
        fill="${GOLD_M}" letter-spacing="2">SIGNATURE HÉBERGEMENTS</text>
  <rect x="80" y="96" width="${W-160}" height="1" fill="url(#goldH)"/>
  <text x="${W/2}" y="120" text-anchor="middle" font-family="serif" font-size="14"
        fill="${GOLD}" letter-spacing="3">✦  ALLIANCE PRIVÉE  ✦</text>
  <rect x="80" y="130" width="${W-160}" height="1" fill="url(#goldH)"/>

  <!-- Accroche -->
  <text x="${W/2}" y="175" text-anchor="middle" font-family="Georgia,serif" font-size="22"
        fill="${WHITE}">Un cercle de rencontres</text>
  <text x="${W/2}" y="225" text-anchor="middle" font-family="Georgia,serif" font-size="40"
        font-weight="bold" fill="url(#heroGold)">d'exception</text>
  <text x="${W/2}" y="258" text-anchor="middle" font-family="Georgia,serif" font-size="15"
        font-style="italic" fill="${GOLD}" opacity="0.7">Pour ceux qui méritent mieux que le hasard</text>

  <rect x="50" y="${sepY1}" width="${W-100}" height="1.5" fill="url(#goldH)"/>

  <!-- Description -->
  <text x="${W/2}" y="300" text-anchor="middle" font-family="sans-serif" font-size="13"
        fill="${WHITE}" opacity="0.8">Alliance Privée est un club de rencontres sélectif</text>
  <text x="${W/2}" y="322" text-anchor="middle" font-family="sans-serif" font-size="13"
        fill="${WHITE}" opacity="0.8">réservé aux profils authentiques, ambitieux et discrets.</text>
  <text x="${W/2}" y="344" text-anchor="middle" font-family="sans-serif" font-size="13"
        fill="${WHITE}" opacity="0.8">Chaque membre est personnellement validé.</text>

  <!-- Partenaire -->
  <rect x="60" y="375" width="${W-120}" height="72" rx="6" fill="url(#partBox)"
        stroke="${GOLD_D}" stroke-width="1"/>
  <text x="${W/2}" y="400" text-anchor="middle" font-family="sans-serif" font-size="10"
        fill="${GOLD_M}" letter-spacing="1">PARTENAIRE OFFICIEL</text>
  <text x="${W/2}" y="426" text-anchor="middle" font-family="sans-serif" font-size="18"
        font-weight="bold" fill="${WHITE}">${nom}</text>
  <text x="${W/2}" y="442" text-anchor="middle" font-family="sans-serif" font-size="11"
        fill="${GOLD_M}">${ville}</text>

  <!-- Section Tiers -->
  <rect x="50" y="472" width="${W-100}" height="1" fill="url(#goldH)"/>
  <text x="${W/2}" y="492" text-anchor="middle" font-family="sans-serif" font-size="10"
        fill="${GOLD_M}" letter-spacing="1">✦  NOS FORMULES  ✦</text>
  <rect x="50" y="504" width="${W-100}" height="1" fill="url(#goldH)"/>

  <!-- Carte PRESTIGE -->
  <rect x="60" y="518" width="190" height="130" rx="6" fill="${BLACK}" fill-opacity="0.6"
        stroke="${GOLD_D}" stroke-width="0.8"/>
  <text x="155" y="548" text-anchor="middle" font-family="sans-serif" font-size="12"
        font-weight="bold" fill="${GOLD_D}">PRESTIGE</text>
  <text x="155" y="566" text-anchor="middle" font-family="Georgia,serif" font-size="10"
        font-style="italic" fill="${WHITE}" opacity="0.55">Pour commencer</text>
  <text x="155" y="596" text-anchor="middle" font-family="sans-serif" font-size="14"
        font-weight="bold" fill="${WHITE}">50 000 FCFA</text>
  <text x="155" y="614" text-anchor="middle" font-family="sans-serif" font-size="9"
        fill="${GOLD}" opacity="0.6">6 mois · Diaspora : 150€</text>

  <!-- Carte EXCELLENCE (recommandé) -->
  <rect x="302" y="518" width="190" height="130" rx="6" fill="${BLACK}" fill-opacity="0.6"
        stroke="${GOLD}" stroke-width="1.5"/>
  <text x="397" y="548" text-anchor="middle" font-family="sans-serif" font-size="14"
        font-weight="bold" fill="${GOLD}">EXCELLENCE</text>
  <text x="397" y="566" text-anchor="middle" font-family="Georgia,serif" font-size="10"
        font-style="italic" fill="${WHITE}" opacity="0.55">La formule phare</text>
  <text x="397" y="596" text-anchor="middle" font-family="sans-serif" font-size="16"
        font-weight="bold" fill="${WHITE}">100 000 FCFA</text>
  <text x="397" y="614" text-anchor="middle" font-family="sans-serif" font-size="9"
        fill="${GOLD}" opacity="0.6">12 mois · Diaspora : 250€</text>
  <!-- Badge recommandé -->
  <rect x="359" y="630" width="76" height="16" rx="8" fill="${GOLD}"/>
  <text x="397" y="641" text-anchor="middle" font-family="sans-serif" font-size="8"
        font-weight="bold" fill="${BLACK}">RECOMMANDÉ</text>

  <!-- Carte ELITE -->
  <rect x="544" y="518" width="190" height="130" rx="6" fill="${BLACK}" fill-opacity="0.6"
        stroke="#E5D58A" stroke-width="0.8"/>
  <text x="639" y="548" text-anchor="middle" font-family="sans-serif" font-size="12"
        font-weight="bold" fill="#E5D58A">ELITE</text>
  <text x="639" y="566" text-anchor="middle" font-family="Georgia,serif" font-size="10"
        font-style="italic" fill="${WHITE}" opacity="0.55">Ultime distinction</text>
  <text x="639" y="596" text-anchor="middle" font-family="sans-serif" font-size="14"
        font-weight="bold" fill="${WHITE}">200 000 FCFA</text>
  <text x="639" y="614" text-anchor="middle" font-family="sans-serif" font-size="9"
        fill="${GOLD}" opacity="0.6">12 mois · Diaspora : 500€</text>

  <!-- Section Avantages -->
  <rect x="50" y="668" width="${W-100}" height="1" fill="url(#goldH)"/>
  <text x="${W/2}" y="688" text-anchor="middle" font-family="sans-serif" font-size="10"
        fill="${GOLD_M}" letter-spacing="1">✦  POURQUOI ALLIANCE PRIVÉE ?  ✦</text>
  <rect x="50" y="700" width="${W-100}" height="1" fill="url(#goldH)"/>

  <!-- Avantage 1 -->
  <text x="80" y="730" font-family="serif" font-size="18" fill="${GOLD}">◈</text>
  <text x="108" y="726" font-family="sans-serif" font-size="12" font-weight="bold" fill="${WHITE}">Profils vérifiés</text>
  <text x="108" y="742" font-family="sans-serif" font-size="10" fill="${WHITE}" opacity="0.55">Chaque candidature est examinée individuellement</text>

  <!-- Avantage 2 -->
  <text x="430" y="730" font-family="serif" font-size="18" fill="${GOLD}">◈</text>
  <text x="458" y="726" font-family="sans-serif" font-size="12" font-weight="bold" fill="${WHITE}">Confidentialité</text>
  <text x="458" y="742" font-family="sans-serif" font-size="10" fill="${WHITE}" opacity="0.55">Vos informations ne sont jamais partagées</text>

  <!-- Avantage 3 -->
  <text x="80" y="788" font-family="serif" font-size="18" fill="${GOLD}">◈</text>
  <text x="108" y="784" font-family="sans-serif" font-size="12" font-weight="bold" fill="${WHITE}">Cercle exclusif</text>
  <text x="108" y="800" font-family="sans-serif" font-size="10" fill="${WHITE}" opacity="0.55">Accès limité pour garantir la qualité</text>

  <!-- Avantage 4 -->
  <text x="430" y="788" font-family="serif" font-size="18" fill="${GOLD}">◈</text>
  <text x="458" y="784" font-family="sans-serif" font-size="12" font-weight="bold" fill="${WHITE}">Accompagnement</text>
  <text x="458" y="800" font-family="sans-serif" font-size="10" fill="${WHITE}" opacity="0.55">Une équipe dédiée à votre expérience</text>

  <!-- Zone CTA + QR -->
  <rect x="50" y="824" width="${W-100}" height="1.5" fill="url(#goldH)"/>

  <!-- QR code -->
  <rect x="178" y="840" width="176" height="176" rx="6" fill="${WHITE}" stroke="${GOLD}" stroke-width="1.5"/>
  <svg x="190" y="852" width="152" height="152" viewBox="${qrVB}">
    ${qrSvg.replace(/<\/?svg[^>]*>/g, '')}
  </svg>

  <!-- Texte CTA -->
  <text x="450" y="882" font-family="Georgia,serif" font-size="16" font-weight="bold"
        fill="${WHITE}">Postulez</text>
  <text x="450" y="910" font-family="Georgia,serif" font-size="22" font-weight="bold"
        fill="${GOLD}">maintenant</text>
  <text x="450" y="940" font-family="sans-serif" font-size="10" fill="${GOLD}" opacity="0.7">Scannez le QR code</text>
  <text x="450" y="958" font-family="sans-serif" font-size="10" fill="${GOLD}" opacity="0.7">ou visitez notre site</text>
  <text x="450" y="992" font-family="sans-serif" font-size="9" font-style="italic"
        fill="${GOLD}" opacity="0.5">Réponse sous 48–72h</text>

  <!-- Pied de page -->
  <rect x="0" y="${H-6}" width="${W}" height="6" fill="url(#botBar)"/>
  <rect x="50" y="${H-44}" width="${W-100}" height="1" fill="url(#goldH)"/>
  <text x="${W/2}" y="${H-28}" text-anchor="middle" font-family="sans-serif" font-size="8.5"
        fill="${GOLD}" opacity="0.45">Alliance Privée par L&amp;Lui Signature Hébergements  ·  Discrétion · Exclusivité · Excellence</text>
  <text x="${W/2}" y="${H-12}" text-anchor="middle" font-family="sans-serif" font-size="8"
        fill="${GOLD}" opacity="0.35">llui-signature-hebergements.vercel.app  ·  Kribi · Douala · Yaoundé</text>
</svg>`

  const outPath = path.join(KIT_DIR, `flyer-${partner.slug}.png`)
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outPath)
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(PARTNERS_FILE)) {
    console.error(`❌  ${PARTNERS_FILE} introuvable.`)
    console.error('   Exécutez d\'abord seed-alliance-partners.js')
    process.exit(1)
  }

  const partners = JSON.parse(fs.readFileSync(PARTNERS_FILE, 'utf8'))
  fs.mkdirSync(QR_DIR,  { recursive: true })
  fs.mkdirSync(KIT_DIR, { recursive: true })

  console.log(`\n🎨  Génération des kits marketing pour ${partners.length} partenaires...\n`)

  const stats = { qr: 0, chevalets: 0, flyers: 0, errors: 0 }

  for (const partner of partners) {
    process.stdout.write(`  ▶ ${partner.nom.padEnd(38)}`)
    try {
      await generateQr(partner)
      stats.qr++
      process.stdout.write('QR ')

      await generateChevalet(partner)
      stats.chevalets++
      process.stdout.write('CHEV ')

      await generateFlyer(partner)
      stats.flyers++
      process.stdout.write('FLYER ')

      process.stdout.write('✓\n')
    } catch (e) {
      stats.errors++
      process.stdout.write(`❌ ${e.message}\n`)
      console.error(e)
    }
  }

  console.log('\n' + '─'.repeat(60))
  console.log(`✅  ${stats.qr}       QR codes       → /public/qr-codes/alliance/`)
  console.log(`✅  ${stats.chevalets}       chevalets A5   → /public/kits/alliance/chevalet-*.png`)
  console.log(`✅  ${stats.flyers}       flyers A4      → /public/kits/alliance/flyer-*.png`)
  if (stats.errors) console.log(`❌  ${stats.errors} erreurs`)
  console.log('─'.repeat(60) + '\n')
}

main().catch(e => { console.error('❌', e); process.exit(1) })
