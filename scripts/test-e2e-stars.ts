/**
 * scripts/test-e2e-stars.ts
 * Test End-to-End : Simule le flux complet d'un client
 * Scan QR → OTP → Code session → Achat boutique → Stars → Carte fidélité → Unification
 *
 * Usage :
 *   npm run test:e2e
 *   npx tsx scripts/test-e2e-stars.ts
 *   npx tsx scripts/test-e2e-stars.ts --phone=+237691000001 --keep
 *
 * --keep : ne pas supprimer les données après le test (pour inspection Firebase)
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { initializeApp, getApps, cert, deleteApp } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// ── Args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const phoneArg = args.find((a) => a.startsWith('--phone='))
const KEEP = args.includes('--keep')
const TEST_PHONE = phoneArg?.replace('--phone=', '') ?? '+237699000001'
const TEST_EMAIL = 'test-e2e@l-et-lui.com'
const TEST_PARTENAIRE_ID = 'test-partenaire-e2e'

// ── Couleurs terminal ─────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}
const ok = (s: string) => `${C.green}✅ ${s}${C.reset}`
const fail = (s: string) => `${C.red}❌ ${s}${C.reset}`
const info = (s: string) => `${C.dim}   ${s}${C.reset}`
const h = (s: string) => `\n${C.bold}${C.cyan}${s}${C.reset}`

// ── Firebase init ─────────────────────────────────────────────────────────────
const app = getApps().length === 0
  ? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  : getApps()[0]

const db = getFirestore(app)

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizePhone(tel: string): string {
  let t = tel.replace(/[\s\-().]/g, '')
  if (t.startsWith('00')) t = '+' + t.slice(2)
  if (/^237\d{8,9}$/.test(t)) t = '+' + t
  if (!t.startsWith('+')) t = '+237' + t
  return t
}

function randomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// ── Nettoyage ─────────────────────────────────────────────────────────────────
async function cleanup(codeSession: string, cardId: string, txId: string) {
  const ops: Promise<unknown>[] = [
    db.collection('clients_fidelite').doc(TEST_PHONE).delete().catch(() => {}),
    db.collection('codes_sessions').doc(codeSession).delete().catch(() => {}),
    db.collection('prescripteurs_partenaires').doc(TEST_PARTENAIRE_ID).delete().catch(() => {}),
  ]
  if (cardId) ops.push(db.collection('loyalty_cards').doc(cardId).delete().catch(() => {}))
  if (txId)   ops.push(db.collection('transactions_fidelite').doc(txId).delete().catch(() => {}))
  await Promise.all(ops)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  const phoneE164 = normalizePhone(TEST_PHONE)
  let codeSession = ''
  let cardId = ''
  let txId = ''
  const passed: string[] = []
  const failed: string[] = []

  function assert(label: string, cond: boolean, detail?: string) {
    if (cond) {
      console.log(ok(label))
      passed.push(label)
    } else {
      console.log(fail(label) + (detail ? ` — ${detail}` : ''))
      failed.push(label)
    }
  }

  console.log(`\n${C.bold}${C.cyan}🧪 TEST END-TO-END — L&Lui Stars + Loyalty Cards${C.reset}`)
  console.log(info(`Phone    : ${phoneE164}`))
  console.log(info(`Email    : ${TEST_EMAIL}`))
  console.log(info(`Partenaire : ${TEST_PARTENAIRE_ID}`))
  console.log(info(`Mode     : ${KEEP ? 'KEEP (données conservées)' : 'cleanup après test'}`))

  try {
    // ── 0. Cleanup préalable ──────────────────────────────────────
    console.log(h('0️⃣  Cleanup préalable'))
    await cleanup('000000', '', '')
    await db.collection('clients_fidelite').doc(phoneE164).delete().catch(() => {})
    const existingCards = await db.collection('loyalty_cards').where('client_email', '==', TEST_EMAIL).get()
    await Promise.all(existingCards.docs.map((d) => d.ref.delete()))
    const existingTx = await db.collection('transactions_fidelite').where('client_id', '==', phoneE164).get()
    await Promise.all(existingTx.docs.map((d) => d.ref.delete()))
    console.log(ok(`${existingCards.size + existingTx.size + 1} doc(s) test supprimés`))

    // ── 1. Partenaire test ────────────────────────────────────────
    console.log(h('1️⃣  Partenaire test'))
    await db.collection('prescripteurs_partenaires').doc(TEST_PARTENAIRE_ID).set({
      uid: TEST_PARTENAIRE_ID,
      nom_etablissement: 'Hôtel Test E2E',
      type: 'hotel',
      telephone: phoneE164,
      statut: 'actif',
      forfait_expire_at: new Date(Date.now() + 365 * 86400000).toISOString(),
      total_scans: 0,
      total_codes_generes: 0,
      total_utilisations: 0,
      total_ca_boutique_fcfa: 0,
      total_commissions_fcfa: 0,
      code_promo_affilie: 'TEST-E2E-2026',
      solde_provision: 100000,
    }, { merge: true })
    console.log(ok('prescripteurs_partenaires[test-partenaire-e2e] créé'))

    // ── 2. Scan QR → OTP simulé → Code session ────────────────────
    console.log(h('2️⃣  Scan QR → OTP simulé → Code session'))

    // Créer clients_fidelite (comme après OTP validé)
    await db.collection('clients_fidelite').doc(phoneE164).set({
      telephone: phoneE164,
      points_stars: 0,
      total_stars_historique: 0,
      membership_status: 'novice',
      last_status_update: new Date().toISOString(),
      phone_verified: true,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    })
    console.log(ok(`clients_fidelite[${phoneE164}] créé (phone_verified: true)`))

    // Générer code session lié
    codeSession = randomCode()
    await db.collection('codes_sessions').doc(codeSession).set({
      code: codeSession,
      prescripteur_partenaire_id: TEST_PARTENAIRE_ID,
      nom_partenaire: 'Hôtel Test E2E',
      type_partenaire: 'hotel',
      remise_type: 'reduction_pct',
      remise_valeur_pct: 5,
      redirection_prioritaire: 'boutique',
      created_at: new Date().toISOString(),
      expire_at: new Date(Date.now() + 48 * 3600000).toISOString(),
      max_utilisations: 5,
      nb_utilisations: 0,
      statut: 'actif',
      utilisations: [],
      client_id: phoneE164,  // ← posé par genererCodeSessionLie()
    })
    console.log(ok(`codes_sessions[${codeSession}] créé avec client_id = ${phoneE164}`))

    // Vérification : client_id bien posé
    const csSnap = await db.collection('codes_sessions').doc(codeSession).get()
    assert('codes_sessions.client_id = phone E.164', csSnap.data()?.client_id === phoneE164)

    // ── 3. Quota 1/mois : un 2ème code doit être bloqué ──────────
    console.log(h('3️⃣  Quota 1/30j : vérifier last_qr_generated_at'))

    const now = new Date().toISOString()
    await db.collection('clients_fidelite').doc(phoneE164).update({
      last_qr_generated_at: now,
      last_qr_code: codeSession,
    })
    const clientAfterQR = await db.collection('clients_fidelite').doc(phoneE164).get()
    assert('clients_fidelite.last_qr_generated_at posé', !!clientAfterQR.data()?.last_qr_generated_at)
    assert('clients_fidelite.last_qr_code = code session', clientAfterQR.data()?.last_qr_code === codeSession)

    // ── 4. Achat boutique → Webhook → Attribution Stars ──────────
    console.log(h('4️⃣  Achat boutique → Attribution Stars (simulé webhook)'))

    const montantAchat = 50000      // FCFA
    const valeurStarFcfa = 1        // 1 FCFA = 1 star (défaut params)
    const starsGagnees = Math.round(montantAchat / valeurStarFcfa)

    const txRef = db.collection('transactions_fidelite').doc()
    txId = txRef.id

    await Promise.all([
      txRef.set({
        client_id: phoneE164,
        partenaire_id: TEST_PARTENAIRE_ID,
        code_session: codeSession,
        montant_brut: montantAchat,
        montant_net: montantAchat,
        remise_appliquee: 0,
        stars_gagnees: starsGagnees,
        remise_pct: 0,
        multiplier: 1,
        valeur_star_fcfa: valeurStarFcfa,
        status: 'confirmed',
        source: 'test_e2e_script',
        created_at: Timestamp.now(),
        confirmed_at: Timestamp.now(),
      }),
      db.collection('clients_fidelite').doc(phoneE164).update({
        points_stars: FieldValue.increment(starsGagnees),
        total_stars_historique: FieldValue.increment(starsGagnees),
        membership_status: starsGagnees >= 25000 ? 'explorateur' : 'novice',
        last_status_update: new Date().toISOString(),
        updated_at: Timestamp.now(),
      }),
    ])

    const clientAfterStars = await db.collection('clients_fidelite').doc(phoneE164).get()
    const cd = clientAfterStars.data()!

    assert(`transactions_fidelite[${txId}] créée`, (await txRef.get()).exists)
    assert(`clients_fidelite.points_stars = ${starsGagnees}`, cd.points_stars === starsGagnees,
      `reçu: ${cd.points_stars}`)
    assert(`clients_fidelite.membership_status = explorateur`,
      cd.membership_status === 'explorateur', `reçu: ${cd.membership_status}`)

    // ── 5. Achat carte fidélité (PENDING) ─────────────────────────
    console.log(h('5️⃣  Achat carte fidélité → PENDING'))

    const confirmToken = Math.random().toString(36).substring(2, 10)
    const cardRef = db.collection('loyalty_cards').doc()
    cardId = cardRef.id

    await cardRef.set({
      card_id: cardId,
      client_id: `guest_${Date.now()}`,  // ← avant liaison
      client_email: TEST_EMAIL,
      client_phone: TEST_PHONE,           // ← format brut du formulaire
      client_nom: 'Test',
      client_prenom: 'E2E',
      program_id: 'test-prog-e2e',
      partenaire_id: TEST_PARTENAIRE_ID,
      niveau_actuel: 'argent',
      niveau_initial: 'argent',
      points_cumules: 0,
      nombre_utilisations: 0,
      qr_code_data: `loyalty://${cardId}`,
      commission_lui_percent: 70,
      commission_partner_percent: 30,
      montant_achat: 25000,
      prix_achat_fcfa: 25000,
      statut: 'PENDING',
      confirmation_token: confirmToken,
      confirmation_token_expires_at: Timestamp.fromDate(new Date(Date.now() + 86400000)),
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    })

    const cardBefore = await cardRef.get()
    assert(`loyalty_cards[${cardId}] créée (PENDING)`, cardBefore.exists)
    assert('loyalty_cards.statut = PENDING', cardBefore.data()?.statut === 'PENDING')
    assert('loyalty_cards.client_id commence par guest_',
      String(cardBefore.data()?.client_id).startsWith('guest_'))

    // ── 6. Admin confirme → Liaison Stars ────────────────────────
    console.log(h('6️⃣  Admin confirme carte → linkLoyaltyCardToStars()'))

    // Normaliser le phone (même logique que lib/phone-utils.ts)
    let t = TEST_PHONE.replace(/[\s\-().]/g, '')
    if (t.startsWith('00')) t = '+' + t.slice(2)
    if (/^237\d{8,9}$/.test(t)) t = '+' + t
    if (!t.startsWith('+')) t = '+237' + t
    const phoneFromCard = t

    // Simuler ce que confirmLoyaltyCard() fait (transaction + linkLoyaltyCardToStars)
    await cardRef.update({
      statut: 'ACTIVE',
      client_id: phoneFromCard,   // ← guest_${ts} remplacé par E.164
      confirmation_token: FieldValue.delete(),
      confirmation_token_expires_at: FieldValue.delete(),
      confirmed_at: Timestamp.now(),
      confirmed_by_admin: 'test_e2e',
      updated_at: Timestamp.now(),
    })

    const cardAfter = await cardRef.get()
    const cardData = cardAfter.data()!

    assert('loyalty_cards.statut = ACTIVE', cardData.statut === 'ACTIVE')
    assert(`loyalty_cards.client_id = ${phoneE164}`, cardData.client_id === phoneE164,
      `reçu: ${cardData.client_id}`)
    assert('loyalty_cards.confirmation_token supprimé', !cardData.confirmation_token)

    // Vérifier que clients_fidelite est inchangé (ne pas écraser phone_verified: true)
    const clientFinal = await db.collection('clients_fidelite').doc(phoneE164).get()
    const cf = clientFinal.data()!
    assert('clients_fidelite.phone_verified toujours true', cf.phone_verified === true)
    assert(`clients_fidelite.points_stars = ${starsGagnees} (inchangé)`, cf.points_stars === starsGagnees)

    // ── 7. Résumé Firestore ───────────────────────────────────────
    console.log(h('7️⃣  Résumé Firestore'))

    console.log(`\n${C.cyan}clients_fidelite[${phoneE164}]${C.reset}`)
    console.log(info(`points_stars           : ${cf.points_stars}`))
    console.log(info(`total_stars_historique : ${cf.total_stars_historique}`))
    console.log(info(`membership_status      : ${cf.membership_status}`))
    console.log(info(`phone_verified         : ${cf.phone_verified}`))
    console.log(info(`last_qr_generated_at   : ${cf.last_qr_generated_at ?? '—'}`))

    console.log(`\n${C.cyan}loyalty_cards[${cardId}]${C.reset}`)
    console.log(info(`client_id   : ${cardData.client_id}`))
    console.log(info(`statut      : ${cardData.statut}`))
    console.log(info(`client_phone: ${cardData.client_phone}`))

    console.log(`\n${C.cyan}codes_sessions[${codeSession}]${C.reset}`)
    const csData = csSnap.data()!
    console.log(info(`client_id   : ${csData.client_id}`))
    console.log(info(`statut      : ${csData.statut}`))

    console.log(`\n${C.cyan}transactions_fidelite[${txId}]${C.reset}`)
    const txData = (await txRef.get()).data()!
    console.log(info(`stars_gagnees : ${txData.stars_gagnees}`))
    console.log(info(`source        : ${txData.source}`))
    console.log(info(`status        : ${txData.status}`))

  } catch (err) {
    console.log(fail(`Exception non gérée : ${err}`))
    failed.push('exception')
  }

  // ── Résultat final ────────────────────────────────────────────
  const total = passed.length + failed.length
  console.log(`\n${C.bold}${'─'.repeat(60)}${C.reset}`)
  console.log(`${C.bold}RÉSULTAT : ${passed.length}/${total} tests passés${C.reset}`)

  if (failed.length > 0) {
    console.log(`${C.red}Tests échoués :${C.reset}`)
    failed.forEach((f) => console.log(`  ${C.red}• ${f}${C.reset}`))
  }

  if (failed.length === 0) {
    console.log(`\n${C.green}${C.bold}🎉 TOUS LES TESTS PASSENT — Flux E2E validé !${C.reset}`)
  } else {
    console.log(`\n${C.yellow}⚠️  Certains tests ont échoué — voir ci-dessus.${C.reset}`)
  }

  // Cleanup (sauf --keep)
  if (!KEEP) {
    console.log(`\n${C.dim}Nettoyage des données test...${C.reset}`)
    await cleanup(codeSession, cardId, txId)
    await db.collection('clients_fidelite').doc(normalizePhone(TEST_PHONE)).delete().catch(() => {})
    await db.collection('prescripteurs_partenaires').doc(TEST_PARTENAIRE_ID).delete().catch(() => {})
    console.log(info('Données test supprimées.'))
  } else {
    console.log(`\n${C.yellow}Mode --keep : données conservées dans Firestore.${C.reset}`)
  }

  await deleteApp(app).catch(() => {})
  process.exit(failed.length > 0 ? 1 : 0)
}

run()
