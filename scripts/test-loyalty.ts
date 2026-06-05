/**
 * scripts/test-loyalty.ts
 * Script de test terminal pour le système cartes de fidélité L&Lui.
 *
 * Usage :
 *   npm run test:loyalty
 *   npx tsx scripts/test-loyalty.ts
 *   npx tsx scripts/test-loyalty.ts --email=moi@email.com
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// ── Charger .env.local ────────────────────────────────────────────────────────
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// ── Arguments CLI ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const emailArg = args.find((a) => a.startsWith('--email='))
const TEST_EMAIL = emailArg ? emailArg.replace('--email=', '') : 'test-loyalty@l-et-lui.com'
const SKIP_CREATE = args.includes('--no-create')

// ── Couleurs terminal ─────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  cyan:  '\x1b[36m',
  green: '\x1b[32m',
  red:   '\x1b[31m',
  yellow:'\x1b[33m',
  bold:  '\x1b[1m',
  dim:   '\x1b[2m',
}

function log(level: 'info' | 'ok' | 'err' | 'warn', msg: string, data?: unknown) {
  const icon  = { info: 'ℹ ', ok: '✅', err: '❌', warn: '⚠️ ' }[level]
  const color = { info: C.cyan, ok: C.green, err: C.red, warn: C.yellow }[level]
  const time  = new Date().toLocaleTimeString('fr-FR')
  console.log(`${color}${icon} [${time}] ${msg}${C.reset}`)
  if (data !== undefined) {
    console.log(`${C.dim}   ${JSON.stringify(data, null, 2).replace(/\n/g, '\n   ')}${C.reset}`)
  }
}

function sep(title: string) {
  console.log(`\n${C.bold}── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}${C.reset}`)
}

// ── Firebase Admin init ───────────────────────────────────────────────────────
function initFirebase() {
  if (getApps().length > 0) return getFirestore()
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  })
  return getFirestore()
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST 1 — Variables d'environnement
// ═════════════════════════════════════════════════════════════════════════════

function testEnvVars(): boolean {
  sep('TEST 1 — Variables d\'environnement')

  const firebase = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_STORAGE_BUCKET',
  ]
  const brevo = [
    'BREVO_API_KEY',
    'BREVO_TEMPLATE_WELCOME',
    'BREVO_TEMPLATE_POINTS',
    'BREVO_TEMPLATE_LEVEL_UP',
    'BREVO_TEMPLATE_PAY_REQUEST',
    'BREVO_TEMPLATE_PAY_APPROVE',
  ]

  let ok = true

  for (const v of firebase) {
    const val = process.env[v]
    if (val) {
      const masked = v === 'FIREBASE_PRIVATE_KEY' ? '[présente, masquée]' : val.slice(0, 30) + (val.length > 30 ? '…' : '')
      log('ok', `${v} = ${masked}`)
    } else {
      log('err', `${v} = MANQUANTE`)
      ok = false
    }
  }

  for (const v of brevo) {
    const val = process.env[v]
    if (val) {
      const masked = v === 'BREVO_API_KEY' ? val.slice(0, 12) + '…' : val
      log('ok', `${v} = ${masked}`)
    } else {
      log('warn', `${v} = non définie (emails désactivés pour cette clé)`)
    }
  }

  return ok
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST 2 — Connexion Firebase
// ═════════════════════════════════════════════════════════════════════════════

async function testFirebase(): Promise<ReturnType<typeof getFirestore> | null> {
  sep('TEST 2 — Connexion Firebase')
  try {
    const db = initFirebase()
    const snap = await db.collection('loyalty_programs').limit(1).get()
    log('ok', `Firebase connecté — ${snap.size} doc(s) dans loyalty_programs`)
    return db
  } catch (e: any) {
    log('err', 'Connexion Firebase échouée', e?.message)
    return null
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST 3 — Programmes ACTIVE
// ═════════════════════════════════════════════════════════════════════════════

async function testPrograms(db: ReturnType<typeof getFirestore>) {
  sep('TEST 3 — Programmes de fidélité ACTIVE')
  const snap = await db.collection('loyalty_programs').where('statut', '==', 'ACTIVE').get()

  if (snap.empty) {
    log('warn', 'Aucun programme ACTIVE — créez-en un via /admin/loyalty-programs/create')
    return []
  }

  log('ok', `${snap.size} programme(s) ACTIVE`)
  const programs = snap.docs.map((d) => ({ id: d.id, ...d.data() as any }))

  programs.forEach((p, i) => {
    console.log(`   ${i + 1}. ${C.bold}${p.nom}${C.reset}`)
    console.log(`      id          : ${p.id}`)
    console.log(`      partenaire  : ${p.partenaire_id}`)
    console.log(`      prix        : ${Number(p.prix_fcfa).toLocaleString('fr-FR')} FCFA`)
    console.log(`      niveaux     : ${p.niveaux?.length ?? 0}`)
    console.log(`      commissions : L&Lui ${p.commission_lui_percent}% / Partenaire ${p.commission_partner_percent}%`)
  })

  return programs
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST 4 — Création de carte (simulation)
// ═════════════════════════════════════════════════════════════════════════════

async function testCreateCard(db: ReturnType<typeof getFirestore>, program: any): Promise<string | null> {
  sep('TEST 4 — Création de carte (simulation)')

  if (SKIP_CREATE) {
    log('info', 'Ignoré (--no-create)')
    return null
  }

  const cardId = `test_${Date.now()}`
  const expiresAt = new Date(Date.now() + program.duree_validite_mois * 30 * 24 * 60 * 60 * 1000)

  const cardData = {
    card_id: cardId,
    program_id: program.id,
    partenaire_id: program.partenaire_id,
    client_id: `guest_test_${Date.now()}`,
    client_email: TEST_EMAIL,
    client_nom: 'Client Test Script',
    niveau_actuel: program.niveaux?.[0]?.id ?? 'bronze',
    points_cumules: 0,
    nombre_utilisations: 0,
    qr_code_data: `loyalty://${cardId}`,
    commission_lui_percent: program.commission_lui_percent,
    commission_partner_percent: program.commission_partner_percent,
    created_at: new Date(),
    expires_at: expiresAt,
    statut: 'ACTIVE',
    montant_achat: program.prix_fcfa,
    updated_at: new Date(),
    _test: true,   // marqueur pour nettoyage facile
  }

  try {
    await db.collection('loyalty_cards').doc(cardId).set(cardData)
    log('ok', `Carte créée : ${cardId}`, {
      client_email: TEST_EMAIL,
      programme: program.nom,
      expire_le: expiresAt.toLocaleDateString('fr-FR'),
    })
    console.log(`   ${C.cyan}→ URL carte : https://llui-signature-hebergements.vercel.app/loyalty/card/${cardId}${C.reset}`)
    return cardId
  } catch (e: any) {
    log('err', 'Erreur création Firestore', e?.message)
    return null
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST 5 — Envoi email Brevo
// ═════════════════════════════════════════════════════════════════════════════

async function testBrevoEmail(cardId: string, programNom: string): Promise<boolean> {
  sep('TEST 5 — Envoi email Brevo')

  const apiKey      = process.env.BREVO_API_KEY
  const templateId  = Number(process.env.BREVO_TEMPLATE_WELCOME ?? 0)
  const cardUrl     = `https://llui-signature-hebergements.vercel.app/loyalty/card/${cardId}`

  log('info', `Cible : ${TEST_EMAIL}`)
  log('info', `Template ID : ${templateId || '(non défini)'}`)
  log('info', `Card URL : ${cardUrl}`)

  if (!apiKey) {
    log('err', 'BREVO_API_KEY absente — ajoutez-la dans .env.local ou Vercel')
    return false
  }
  if (!templateId) {
    log('warn', 'BREVO_TEMPLATE_WELCOME=0 — test ignoré (ajoutez l\'ID template Brevo)')
    return false
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: [{ email: TEST_EMAIL }],
        templateId,
        params: {
          program_nom: programNom,
          client_nom: 'Client Test Script',
          card_url: cardUrl,
        },
      }),
    })

    const body = await res.json() as any

    if (res.ok) {
      log('ok', 'Email envoyé', { messageId: body.messageId, to: TEST_EMAIL })
      console.log(`   ${C.cyan}→ Vérifiez la boîte ${TEST_EMAIL}${C.reset}`)
      return true
    } else {
      log('err', `Brevo HTTP ${res.status}`, body)
      return false
    }
  } catch (e: any) {
    log('err', 'Exception fetch Brevo', e?.message)
    return false
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST 6 — Lister les cartes de test existantes
// ═════════════════════════════════════════════════════════════════════════════

async function testListCards(db: ReturnType<typeof getFirestore>) {
  sep('TEST 6 — Cartes de test existantes (_test=true)')

  const snap = await db
    .collection('loyalty_cards')
    .where('_test', '==', true)
    .limit(10)
    .get()

  if (snap.empty) {
    log('info', 'Aucune carte de test (_test=true) trouvée')
    return
  }

  log('ok', `${snap.size} carte(s) de test`)
  snap.docs.forEach((d, i) => {
    const c = d.data()
    console.log(`   ${i + 1}. ${c.card_id}`)
    console.log(`      email   : ${c.client_email}`)
    console.log(`      statut  : ${c.statut}`)
    console.log(`      points  : ${c.points_cumules}`)
    const ts = (c.created_at as any)?.toDate?.() ?? new Date(c.created_at)
    console.log(`      créée   : ${ts.toLocaleString('fr-FR')}`)
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// ORCHESTRATION
// ═════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`\n${C.bold}╔══════════════════════════════════════════════════════╗`)
  console.log(`║     🧪  TEST SYSTÈME CARTES DE FIDÉLITÉ L&LUI       ║`)
  console.log(`╚══════════════════════════════════════════════════════╝${C.reset}`)
  console.log(`${C.dim}   email test : ${TEST_EMAIL}${SKIP_CREATE ? '  |  --no-create actif' : ''}${C.reset}`)

  const envOk = testEnvVars()
  if (!envOk) {
    log('err', 'Variables Firebase manquantes. Ajoutez-les dans .env.local')
    process.exit(1)
  }

  const db = await testFirebase()
  if (!db) process.exit(1)

  const programs = await testPrograms(db)
  if (!programs.length) {
    log('warn', 'Aucun programme ACTIVE — tests 4-5 ignorés')
    await testListCards(db)
    process.exit(0)
  }

  const program = programs[0]
  const cardId = await testCreateCard(db, program)

  if (cardId) {
    await testBrevoEmail(cardId, program.nom)
  } else if (!SKIP_CREATE) {
    log('warn', 'Carte non créée — test email ignoré')
  }

  await testListCards(db)

  console.log(`\n${C.bold}${C.green}╔══════════════════════════════════════════════════════╗`)
  console.log(`║                  ✅ TESTS TERMINÉS                   ║`)
  console.log(`╚══════════════════════════════════════════════════════╝${C.reset}\n`)

  process.exit(0)
}

main().catch((e) => {
  log('err', 'Erreur fatale', e?.message ?? e)
  process.exit(1)
})
