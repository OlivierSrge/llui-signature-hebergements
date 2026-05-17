#!/usr/bin/env node
/**
 * veille-des-prix.js — v1
 * Pipeline de surveillance des tarifs — Les Gîtes de Kribi
 *
 * Enchaîne automatiquement :
 *   Étape 1 — scrape-moteur.js       → outputs/moteur-brut.json
 *   Étape 2 — embellir-descriptions.js → outputs/moteur-prestige.json  (si ANTHROPIC_API_KEY)
 *   Étape 3 — sync-airtable.js       → Airtable (Notes + Prix)          (si AIRTABLE_TOKEN)
 *   Étape 4 — Push Firestore         → collection `hebergements`         (si FIREBASE_*)
 *
 * Usage :
 *   node veille-des-prix.js                     # pipeline complet
 *   node veille-des-prix.js --dry-run            # affiche sans écrire
 *   node veille-des-prix.js --skip-scrape        # repart du JSON existant
 *   node veille-des-prix.js --skip-embellir      # pas d'appel Claude
 *   node veille-des-prix.js --skip-airtable      # pas de sync Airtable
 *   node veille-des-prix.js --skip-firestore     # pas de push Firestore
 *
 * Variables d'environnement (lues depuis .env.local en priorité) :
 *   ANTHROPIC_API_KEY   — clé Claude (optionnel, active l'étape 2)
 *   AIRTABLE_TOKEN      — token Airtable (optionnel, active l'étape 3)
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */

// ─── Charge .env.local avant tout ─────────────────────────────────────────────
try {
  require('dotenv').config({ path: '.env.local', override: false });
} catch {}

const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

// ─── ARGS ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN       = args.includes('--dry-run');
const SKIP_SCRAPE   = args.includes('--skip-scrape');
const SKIP_EMBELLIR = args.includes('--skip-embellir');
const SKIP_AIRTABLE = args.includes('--skip-airtable');
const SKIP_FIRESTORE= args.includes('--skip-firestore');

const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const pause = ms => new Promise(r => setTimeout(r, ms));

function titre(texte) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ${texte}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

function log(icone, msg) {
  console.log(`  ${icone}  ${msg}`);
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // enlève les accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function devinerType(nom) {
  const n = nom.toLowerCase();
  if (/suite/.test(n))   return 'suite';
  if (/villa/.test(n))   return 'villa';
  if (/chalet/.test(n))  return 'chalet';
  if (/cabane|treehouse|arbre/.test(n)) return 'cabane';
  if (/bungalow/.test(n)) return 'bungalow';
  if (/studio/.test(n))  return 'studio';
  if (/appartement|appart/.test(n)) return 'appartement';
  return 'chambre';
}

// ─── ÉTAPE 1 — SCRAPE ─────────────────────────────────────────────────────────
async function etape1Scrape() {
  titre('ÉTAPE 1 / 4 — Scrape eviivo (tarifs live)');
  if (SKIP_SCRAPE) {
    log('⏭', 'Skip (--skip-scrape)');
    return true;
  }
  if (DRY_RUN) {
    log('🔍', '[dry-run] node scrape-moteur.js');
    return true;
  }
  try {
    log('🕷', 'Lancement de scrape-moteur.js...');
    execSync('node scrape-moteur.js', { stdio: 'inherit', cwd: __dirname });
    log('✔', 'outputs/moteur-brut.json mis à jour');
    return true;
  } catch (err) {
    log('✗', `Échec scrape : ${err.message.slice(0, 100)}`);
    return false;
  }
}

// ─── ÉTAPE 2 — EMBELLIR ───────────────────────────────────────────────────────
async function etape2Embellir() {
  titre('ÉTAPE 2 / 4 — Embellissement Claude (Dark Luxury)');
  if (SKIP_EMBELLIR) {
    log('⏭', 'Skip (--skip-embellir)');
    return;
  }
  if (!ANTHROPIC_KEY) {
    log('⏭', 'ANTHROPIC_API_KEY non définie — étape ignorée');
    log('💡', 'Lance avec ANTHROPIC_API_KEY=sk-ant-… pour activer');
    return;
  }
  if (DRY_RUN) {
    log('🔍', '[dry-run] ANTHROPIC_API_KEY=*** node embellir-descriptions.js');
    return;
  }
  try {
    log('✨', 'Lancement de embellir-descriptions.js...');
    execSync('node embellir-descriptions.js', {
      stdio: 'inherit',
      cwd: __dirname,
      env: { ...process.env, ANTHROPIC_API_KEY: ANTHROPIC_KEY },
    });
    log('✔', 'outputs/moteur-prestige.json généré');
  } catch (err) {
    log('⚠', `Embellissement partiel ou échoué : ${err.message.slice(0, 80)}`);
    log('➡', 'La suite utilisera moteur-brut.json si prestige.json est absent');
  }
}

// ─── ÉTAPE 3 — AIRTABLE ───────────────────────────────────────────────────────
async function etape3Airtable() {
  titre('ÉTAPE 3 / 4 — Sync Airtable (Notes + Photos)');
  if (SKIP_AIRTABLE) {
    log('⏭', 'Skip (--skip-airtable)');
    return;
  }
  if (!AIRTABLE_TOKEN) {
    log('⏭', 'AIRTABLE_TOKEN non définie — étape ignorée');
    log('💡', 'Lance avec AIRTABLE_TOKEN=pat… pour activer');
    return;
  }
  if (DRY_RUN) {
    log('🔍', '[dry-run] AIRTABLE_TOKEN=*** node sync-airtable.js');
    return;
  }
  try {
    log('📋', 'Lancement de sync-airtable.js...');
    execSync('node sync-airtable.js', {
      stdio: 'inherit',
      cwd: __dirname,
      env: { ...process.env, AIRTABLE_TOKEN: AIRTABLE_TOKEN },
    });
    log('✔', 'Airtable synchronisé');
  } catch (err) {
    log('⚠', `Sync Airtable partiel : ${err.message.slice(0, 80)}`);
  }
}

// ─── ÉTAPE 4 — FIRESTORE ──────────────────────────────────────────────────────
async function etape4Firestore() {
  titre('ÉTAPE 4 / 4 — Push Firestore (collection hebergements)');

  if (SKIP_FIRESTORE) {
    log('⏭', 'Skip (--skip-firestore)');
    return;
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    log('⚠', 'Variables Firebase manquantes (FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY)');
    log('💡', 'Vérifie ton fichier .env.local');
    return;
  }

  // Choisir la source : prestige > brut
  const prestigePath = path.join(__dirname, 'outputs', 'moteur-prestige.json');
  const brutPath     = path.join(__dirname, 'outputs', 'moteur-brut.json');
  const srcPath      = fs.existsSync(prestigePath) ? prestigePath : brutPath;

  if (!fs.existsSync(srcPath)) {
    log('✗', 'Aucun fichier source (moteur-prestige.json / moteur-brut.json)');
    return;
  }

  const { meta, hebergements } = JSON.parse(fs.readFileSync(srcPath, 'utf-8'));
  const estPrestige = srcPath === prestigePath;
  log('📂', `Source : ${path.basename(srcPath)} (${hebergements.length} hébergements)`);

  if (DRY_RUN) {
    log('🔍', '[dry-run] Aperçu des documents qui seraient upsertés :');
    hebergements.forEach((h, i) => {
      const nom   = h.nom_prestige || h.nom;
      const prix  = h.prix_sejour_xaf ? h.prix_sejour_xaf.toLocaleString('fr-FR') + ' XAF' : '—';
      const dispo = h.disponibilite === 'disponible' ? 'active' : 'inactive';
      console.log(`     [${String(i+1).padStart(2)}] ${nom.slice(0,48).padEnd(48)} ${prix.padStart(14)}  ${dispo}`);
    });
    return;
  }

  // Init Firebase Admin (CJS-safe)
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey:  FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
  const db                = admin.firestore();
  const FieldValue        = admin.firestore.FieldValue;
  const COLLECTION        = 'hebergements';

  // Cherche le partenaire "Les Gîtes de Kribi" pour dénormalisation
  let partnerSnap = await db.collection('partenaires')
    .where('name', '>=', 'Gîtes de Kribi').where('name', '<=', 'Gîtes de Kribi\uf8ff')
    .limit(1).get();
  // Fallback: recherche par email ou URL eviivo
  if (partnerSnap.empty) {
    partnerSnap = await db.collection('partenaires')
      .where('website', '==', 'https://kribiholidays.com/').limit(1).get();
  }
  const partnerDoc   = partnerSnap.empty ? null : partnerSnap.docs[0];
  const partnerId    = partnerDoc?.id    || null;
  const partnerName  = partnerDoc?.data()?.name || 'Les Gîtes de Kribi';

  if (partnerId) {
    log('🔗', `Partenaire lié : ${partnerName} (${partnerId})`);
  } else {
    log('⚠', `Partenaire "Les Gîtes de Kribi" non trouvé dans Firestore — partner_id = null`);
    log('💡', 'Crée le partenaire via /admin ou link manuellement après');
  }

  // Charge les docs existants (index eviivo_id → docId, name → docId)
  log('🔎', 'Chargement des docs existants...');
  const existingSnap = await db.collection(COLLECTION).get();
  const indexEviivo  = {};  // eviivo_id → docRef
  const indexSlug    = {};  // slug → docRef
  const indexName    = {};  // nom normalisé → docRef
  existingSnap.forEach(doc => {
    const d = doc.data();
    if (d.eviivo_id) indexEviivo[String(d.eviivo_id)] = doc.ref;
    if (d.slug)      indexSlug[d.slug] = doc.ref;
    if (d.name)      indexName[d.name.toLowerCase().trim()] = doc.ref;
  });
  log('📊', `${existingSnap.size} docs existants indexés`);

  const stats = { crees: 0, mis_a_jour: 0, erreurs: 0 };

  for (const h of hebergements) {
    const nomPrestige = h.nom_prestige || h.nom;
    const slug        = generateSlug(nomPrestige);
    const type        = devinerType(nomPrestige);
    const description = h.description_prestige || h.description || null;
    const shortDesc   = description ? description.slice(0, 200) : null;
    const prix        = h.prix_sejour_xaf || null;
    const capacity    = h.capacite_max
      || (h.equipements?.find(e => /Maximum de/i.test(e))?.match(/\d+/) || [])[0]
      || null;
    const isActive    = h.disponibilite === 'disponible';

    // Cherche un doc existant : eviivo_id > slug > nom exact
    let existingRef = indexEviivo[String(h.eviivo_id)]
                   || indexSlug[slug]
                   || indexName[nomPrestige.toLowerCase().trim()]
                   || indexName[h.nom.toLowerCase().trim()];

    const payload = {
      name:              nomPrestige,
      slug,
      type,
      description,
      short_description: shortDesc,
      capacity:          capacity ? Number(capacity) : null,
      price_per_night:   prix,
      status:            isActive ? 'active' : 'inactive',
      eviivo_id:         h.eviivo_id || null,
      partner_id:        partnerId,
      partner:           { name: partnerName },
      images:            h.image_principale ? [h.image_principale] : [],
      surface_m2:        h.surface_m2 || null,
      source_url:        h.url_reservation || meta.url_source || null,
      updated_at:        FieldValue.serverTimestamp(),
      synced_from:       estPrestige ? 'moteur-prestige' : 'moteur-brut',
      synced_at:         new Date().toISOString(),
    };

    try {
      if (existingRef) {
        await existingRef.update(payload);
        log('↻', `MAJ  : ${nomPrestige.slice(0, 50)} — ${prix?.toLocaleString('fr-FR') || '—'} XAF`);
        stats.mis_a_jour++;
      } else {
        const newRef = db.collection(COLLECTION).doc();
        await newRef.set({
          ...payload,
          created_at: FieldValue.serverTimestamp(),
          created_by: 'veille-des-prix.js',
        });
        log('✔', `Créé : ${nomPrestige.slice(0, 50)} — ${prix?.toLocaleString('fr-FR') || '—'} XAF (${newRef.id})`);
        stats.crees++;
        // Ajouter au index pour éviter doublons dans la même session
        indexSlug[slug] = newRef;
      }
    } catch (err) {
      log('✗', `Erreur ${nomPrestige.slice(0, 40)} : ${err.message.slice(0, 80)}`);
      stats.erreurs++;
    }

    await pause(80);  // Firestore ne rate-limite pas agressivement, mais soyons polis
  }

  // Rapport Firestore
  console.log(`\n  ✔  Créés      : ${stats.crees}`);
  console.log(`  ↻  Mis à jour : ${stats.mis_a_jour}`);
  console.log(`  ✗  Erreurs    : ${stats.erreurs}`);

  // Sauvegarde rapport complet
  const rapportPath = path.join(__dirname, 'outputs', 'veille-rapport.json');
  const rapport = {
    date:          new Date().toISOString(),
    source:        path.basename(srcPath),
    firestore_crees:    stats.crees,
    firestore_maj:      stats.mis_a_jour,
    firestore_erreurs:  stats.erreurs,
    hebergements_traites: hebergements.length,
    meta_scrape:   meta,
  };
  fs.writeFileSync(rapportPath, JSON.stringify(rapport, null, 2));
  log('📄', `Rapport : outputs/veille-rapport.json`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  const debut = Date.now();

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  VEILLE DES PRIX — Les Gîtes de Kribi           ║');
  console.log('║  L&Lui Signature Hébergements                   ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Mode     : ${DRY_RUN ? 'DRY-RUN (aucune écriture)         ' : 'LIVE (écriture activée)           '}║`);
  console.log(`║  Scrape   : ${SKIP_SCRAPE ? 'ignoré                           ' : 'activé                            '}║`);
  console.log(`║  Claude   : ${SKIP_EMBELLIR || !ANTHROPIC_KEY ? 'ignoré                           ' : 'activé (claude-opus-4-6)          '}║`);
  console.log(`║  Airtable : ${SKIP_AIRTABLE || !AIRTABLE_TOKEN ? 'ignoré                           ' : 'activé                            '}║`);
  console.log(`║  Firestore: ${SKIP_FIRESTORE ? 'ignoré                           ' : 'activé                            '}║`);
  console.log('╚══════════════════════════════════════════════════╝');

  await etape1Scrape();
  await etape2Embellir();
  await etape3Airtable();
  await etape4Firestore();

  const duree = ((Date.now() - debut) / 1000).toFixed(1);
  titre(`PIPELINE TERMINÉ en ${duree}s`);
  console.log('');
})().catch(err => {
  console.error('\nErreur fatale :', err.message);
  process.exit(1);
});
