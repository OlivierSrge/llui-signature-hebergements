/**
 * Test Firestore : Architecture multi-type fidélité
 * Vérifie que hébergements ET prescripteurs ont des programmes séparés
 * Usage : node scratch/test-loyalty-multitype.js
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

function pass(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.log(`  ❌ ${msg}`); }
function info(msg) { console.log(`  ℹ️  ${msg}`); }
function section(msg) { console.log(`\n${'─'.repeat(60)}\n${msg}\n${'─'.repeat(60)}`); }

async function testLoyaltyMultitype() {
  let errors = 0;

  // ─── 1. Vérifier qu'il existe des partenaires dans les deux collections ───
  section('TEST 1 — Collections partenaires disponibles');

  const [prescSnap, hebergSnap] = await Promise.all([
    db.collection('prescripteurs_partenaires').where('statut', '==', 'actif').limit(5).get(),
    db.collection('partenaires').limit(5).get(),
  ]);

  if (prescSnap.empty) {
    fail('Aucun prescripteur actif dans prescripteurs_partenaires');
    errors++;
  } else {
    pass(`${prescSnap.size} prescripteur(s) actif(s) trouvé(s)`);
    prescSnap.docs.slice(0, 3).forEach(d => {
      info(`  Prescripteur: ${d.id} — ${d.data().nom_etablissement ?? '?'}`);
    });
  }

  if (hebergSnap.empty) {
    fail('Aucun hébergement dans partenaires');
    errors++;
  } else {
    pass(`${hebergSnap.size} hébergement(s) trouvé(s)`);
    hebergSnap.docs.slice(0, 3).forEach(d => {
      const data = d.data();
      info(`  Hébergement: ${d.id} — ${data.name ?? data.nom ?? '?'}`);
    });
  }

  // ─── 2. Vérifier les programmes existants et leur partenaire_type ─────────
  section('TEST 2 — Programmes fidélité existants (partenaire_type)');

  const progSnap = await db.collection('loyalty_programs').limit(20).get();

  if (progSnap.empty) {
    info('Aucun programme existant — OK pour un premier test');
  } else {
    pass(`${progSnap.size} programme(s) trouvé(s)`);
    const byType = { hebergement: 0, prescripteur: 0, absent: 0 };
    progSnap.docs.forEach(d => {
      const data = d.data();
      const type = data.partenaire_type ?? 'absent';
      byType[type] = (byType[type] ?? 0) + 1;
      info(`[${type}] ${data.nom} — partenaire: ${data.partenaire_id} — name: ${data.partenaire_name ?? '(vide)'}`);
    });
    info(`Répartition: prescripteur=${byType.prescripteur} / hebergement=${byType.hebergement} / sans type=${byType.absent} (anciens docs)`);
  }

  // ─── 3. Simuler getLoyaltyPrograms pour un prescripteur ──────────────────
  section('TEST 3 — getLoyaltyPrograms par partenaire_id (isolation)');

  if (!prescSnap.empty && !progSnap.empty) {
    const prescId = prescSnap.docs[0].id;
    const prescProgSnap = await db.collection('loyalty_programs')
      .where('partenaire_id', '==', prescId)
      .get();
    pass(`Prescripteur ${prescId}: ${prescProgSnap.size} programme(s) lié(s)`);

    // Vérifier qu'aucun programme hébergement n'est dans ces résultats
    const wrongType = prescProgSnap.docs.filter(d => d.data().partenaire_type === 'hebergement');
    if (wrongType.length > 0) {
      fail(`${wrongType.length} programme(s) hébergement trouvé(s) pour ce prescripteur — FUITE !`);
      errors++;
    } else {
      pass('Aucune fuite de données (pas de programme hébergement pour ce prescripteur)');
    }
  }

  if (!hebergSnap.empty && !progSnap.empty) {
    const hebergId = hebergSnap.docs[0].id;
    const hebergProgSnap = await db.collection('loyalty_programs')
      .where('partenaire_id', '==', hebergId)
      .get();
    pass(`Hébergement ${hebergId}: ${hebergProgSnap.size} programme(s) lié(s)`);

    const wrongType = hebergProgSnap.docs.filter(d => d.data().partenaire_type === 'prescripteur');
    if (wrongType.length > 0) {
      fail(`${wrongType.length} programme(s) prescripteur trouvé(s) pour cet hébergement — FUITE !`);
      errors++;
    } else {
      pass('Aucune fuite de données (pas de programme prescripteur pour cet hébergement)');
    }
  }

  // ─── 4. Vérifier les cartes et leur taux de points ────────────────────────
  section('TEST 4 — Cartes fidélité et taux par programme');

  const cardsSnap = await db.collection('loyalty_cards').where('statut', '==', 'ACTIVE').limit(10).get();
  pass(`${cardsSnap.size} carte(s) ACTIVE(s) trouvée(s)`);

  for (const cardDoc of cardsSnap.docs.slice(0, 3)) {
    const card = cardDoc.data();
    const progDoc = await db.collection('loyalty_programs').doc(card.program_id).get();
    if (!progDoc.exists) {
      fail(`Carte ${cardDoc.id} → programme ${card.program_id} introuvable`);
      errors++;
      continue;
    }
    const prog = progDoc.data();
    const taux = prog.taux_fcfa_par_point ?? 10000;
    const partType = prog.partenaire_type ?? 'prescripteur (défaut)';
    info(`Carte ${cardDoc.id.slice(0, 8)}… → programme "${prog.nom}" [${partType}] taux=${taux} FCFA/pt`);
    pass(`Carte liée à programme valide`);
  }

  // ─── 5. Simuler le calcul de points ──────────────────────────────────────
  section('TEST 5 — Calcul de points (logique)');

  const tests = [
    { montant: 50000, taux: 12000, expected: 4, label: 'Prescripteur 12000/pt' },
    { montant: 80000, taux: 10000, expected: 8, label: 'Hébergement 10000/pt' },
    { montant: 35000, taux: 10000, expected: 3, label: 'Arrondi inférieur' },
    { montant: 0, taux: 10000, expected: 0, label: 'Montant zéro' },
  ];
  tests.forEach(({ montant, taux, expected, label }) => {
    const result = Math.floor(montant / taux);
    if (result === expected) {
      pass(`${label}: ${montant} FCFA ÷ ${taux} = ${result} pt(s) ✓`);
    } else {
      fail(`${label}: attendu ${expected}, obtenu ${result}`);
      errors++;
    }
  });

  // ─── 6. Vérifier les transactions récentes ────────────────────────────────
  section('TEST 6 — Transactions fidélité récentes');

  const txSnap = await db.collection('loyalty_transactions')
    .orderBy('created_at', 'desc')
    .limit(5)
    .get();

  if (txSnap.empty) {
    info('Aucune transaction — OK pour un premier déploiement');
  } else {
    pass(`${txSnap.size} transaction(s) récente(s)`);
    txSnap.docs.forEach(d => {
      const tx = d.data();
      info(`[${tx.type}] +${tx.points_ajoutes} pts — ${tx.montant_depense ?? 0} FCFA — carte: ${(tx.card_id ?? '—').slice(0, 8)}…`);
    });
  }

  // ─── Résumé ───────────────────────────────────────────────────────────────
  section('RÉSUMÉ');
  if (errors === 0) {
    console.log('  🎉 Tous les tests passent — architecture multi-type OK\n');
  } else {
    console.log(`  ⚠️  ${errors} erreur(s) détectée(s) — voir ci-dessus\n`);
  }
  process.exit(errors > 0 ? 1 : 0);
}

testLoyaltyMultitype().catch(e => {
  console.error('Erreur fatale:', e);
  process.exit(1);
});
