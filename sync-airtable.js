#!/usr/bin/env node
/**
 * sync-airtable.js
 * Lit outputs/schema-firestore-villas.json (source principale)
 * ou outputs/import-airtable.csv (fallback)
 * → Insère / met à jour les 6 hébergements des Gîtes de Kribi dans Airtable
 *
 * Usage : node sync-airtable.js
 *   → Demande Token et Base ID au lancement
 *   → Drapeaux optionnels :
 *       --dry-run   Affiche les records sans insérer
 *       --upsert    Met à jour si le Nom existe déjà (évite les doublons)
 *       --table "Nom de la table"  (défaut : "Hébergements")
 */

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');
const Airtable = require('airtable');

// ─── CLI FLAGS ───────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const UPSERT  = args.includes('--upsert');
const tIdx    = args.indexOf('--table');
const TABLE_NAME = tIdx !== -1 ? args[tIdx + 1] : 'Hébergements';

// ─── LECTURE SOURCE ──────────────────────────────────────────────────────────

const JSON_PATH = path.join(__dirname, 'outputs', 'schema-firestore-villas.json');
const CSV_PATH  = path.join(__dirname, 'outputs', 'import-airtable.csv');

function chargerDepuisJSON() {
  const raw = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  return raw.documents_dev.map(doc => ({
    Nom:              doc.nom,
    Slug:             doc.slug,
    Type:             doc.type,
    Surface_m2:       doc.surface_m2,
    Capacite:         doc.capacite_personnes,
    Description_LLui: doc.description_llui,
    Description_Brute:doc.description_brute,
    Atouts:           (doc.atouts || []).join(' | '),
    Tags:             (doc.tags  || []).join(' | '),
    Image_Principale: doc.image_principale || '',
    Etablissement:    doc.etablissement_nom || '',
    Ville:            doc.localisation?.ville || '',
    Pays:             doc.localisation?.pays  || '',
    Source_URL:       doc.source_url || '',
    Statut:           doc.statut || 'draft',
  }));
}

function chargerDepuisCSV() {
  const lines  = fs.readFileSync(CSV_PATH, 'utf-8').split('\n').filter(Boolean);
  const headers = parseLigneCsv(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseLigneCsv(line);
    const obj  = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return {
      Nom:              obj['Nom'],
      Slug:             obj['Slug'],
      Type:             obj['Type'],
      Surface_m2:       obj['Surface_m2'] ? Number(obj['Surface_m2']) : null,
      Capacite:         obj['Capacite_personnes'] ? Number(obj['Capacite_personnes']) : null,
      Description_LLui: obj['Description_LLui'],
      Description_Brute:obj['Description_Brute'],
      Atouts:           obj['Atouts'],
      Tags:             obj['Tags'],
      Image_Principale: obj['Image_Principale'],
      Etablissement:    obj['Etablissement'],
      Ville:            obj['Ville'],
      Pays:             obj['Pays'],
      Source_URL:       obj['Source_URL'],
      Statut:           obj['Statut'] || 'draft',
    };
  });
}

// Parser CSV minimaliste (gère les champs entre guillemets avec virgules)
function parseLigneCsv(line) {
  const result = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
      result.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

// Chargement — JSON en priorité, CSV en fallback
let hebergements;
if (fs.existsSync(JSON_PATH)) {
  hebergements = chargerDepuisJSON();
  console.log(`Source : outputs/schema-firestore-villas.json (${hebergements.length} hébergements)`);
} else if (fs.existsSync(CSV_PATH)) {
  hebergements = chargerDepuisCSV();
  console.log(`Source : outputs/import-airtable.csv (${hebergements.length} hébergements)`);
} else {
  console.error('Aucun fichier source trouvé. Lance d\'abord : node setup-database.js');
  process.exit(1);
}

// ─── DEMANDE TOKEN / BASE ID ─────────────────────────────────────────────────

function poser(rl, question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())));
}

async function demanderCredentials() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Sync Airtable — Les Gîtes de Kribi');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Où trouver ces infos :');
  console.log('  • Token  → https://airtable.com/create/tokens');
  console.log('  • Base ID → URL de ta base : airtable.com/appXXXXXXXX/...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const token  = await poser(rl, '  Token Airtable (pat…) : ');
  const baseId = await poser(rl, '  Base ID (appXXXXXXXX) : ');

  rl.close();

  if (!token.startsWith('pat') && !token.startsWith('key')) {
    console.warn('\n  ⚠  Le token ne ressemble pas à un Personal Access Token Airtable (attendu : pat…)');
    console.warn('  Continue quand même, mais vérifie sur https://airtable.com/create/tokens\n');
  }
  if (!baseId.startsWith('app')) {
    console.error('\n  ✗ Base ID invalide — doit commencer par "app" (ex: appABCDEF123456)');
    process.exit(1);
  }

  return { token, baseId };
}

// ─── CONVERSION → CHAMPS AIRTABLE ────────────────────────────────────────────
// Airtable n'accepte que des types primitifs ou des tableaux (multi-select).
// On adapte chaque champ selon les types Airtable courants.

function versChamps(h) {
  const champs = {
    'Nom':               h.Nom,
    'Slug':              h.Slug,
    'Type':              h.Type,
    'Description L&Lui': h.Description_LLui,
    'Description Brute': h.Description_Brute,
    'Atouts':            h.Atouts,
    'Tags':              h.Tags,
    'Établissement':     h.Etablissement,
    'Ville':             h.Ville,
    'Pays':              h.Pays,
    'Source URL':        h.Source_URL,
    'Statut':            h.Statut,
  };
  if (h.Surface_m2)  champs['Surface (m²)']    = h.Surface_m2;
  if (h.Capacite)    champs['Capacité (pers.)'] = h.Capacite;

  // Image : Airtable attend un tableau d'objets { url } pour les pièces jointes
  if (h.Image_Principale) {
    champs['Image Principale'] = [{ url: h.Image_Principale }];
  }
  return champs;
}

// ─── UPSERT — trouve un record existant par Nom ───────────────────────────────

async function trouverExistant(table, nom) {
  return new Promise((resolve, reject) => {
    let found = null;
    table.select({
      filterByFormula: `{Nom} = "${nom.replace(/"/g, '\\"')}"`,
      maxRecords: 1,
    }).eachPage(
      (records, next) => { if (records.length) found = records[0]; next(); },
      (err) => err ? reject(err) : resolve(found)
    );
  });
}

// ─── INSERTION PAR LOTS (max 10 par appel Airtable) ─────────────────────────

function chunker(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

(async () => {
  const { token, baseId } = await demanderCredentials();

  Airtable.configure({ apiKey: token });
  const base  = Airtable.base(baseId);
  const table = base(TABLE_NAME);

  console.log(`\n  Table cible     : "${TABLE_NAME}"`);
  console.log(`  Mode            : ${DRY_RUN ? 'DRY-RUN (aucune écriture)' : UPSERT ? 'UPSERT' : 'INSERT'}`);
  console.log(`  Hébergements    : ${hebergements.length}\n`);

  if (DRY_RUN) {
    console.log('─── Aperçu des records (dry-run) ──────────────────────');
    hebergements.forEach((h, i) => {
      console.log(`\n  [${i + 1}] ${h.Nom}`);
      console.log(`       Type       : ${h.Type}`);
      console.log(`       Capacité   : ${h.Capacite || '—'} pers.`);
      console.log(`       Statut     : ${h.Statut}`);
      console.log(`       Image      : ${h.Image_Principale ? h.Image_Principale.slice(0, 60) + '…' : '—'}`);
      console.log(`       Description: ${h.Description_LLui.slice(0, 80)}…`);
    });
    console.log('\n  Dry-run terminé. Relance sans --dry-run pour insérer.\n');
    return;
  }

  const resultats = { inseres: [], mis_a_jour: [], erreurs: [] };

  if (UPSERT) {
    // Mode upsert — un par un pour pouvoir vérifier l'existence
    for (const h of hebergements) {
      const label = h.Nom;
      try {
        const existant = await trouverExistant(table, label);
        const champs   = versChamps(h);
        if (existant) {
          await table.update(existant.id, champs);
          console.log(`  ↻  Mis à jour  : ${label}`);
          resultats.mis_a_jour.push(label);
        } else {
          await table.create(champs);
          console.log(`  ✔  Inséré      : ${label}`);
          resultats.inseres.push(label);
        }
      } catch (err) {
        console.error(`  ✗  Erreur sur "${label}" : ${err.message}`);
        resultats.erreurs.push({ nom: label, erreur: err.message });
      }
      // Pause pour respecter la limite 5 req/s d'Airtable
      await new Promise(r => setTimeout(r, 250));
    }
  } else {
    // Mode insert par lots de 10
    const lots = chunker(hebergements, 10);
    for (const lot of lots) {
      const payload = lot.map(h => ({ fields: versChamps(h) }));
      try {
        const created = await table.create(payload);
        created.forEach(r => {
          console.log(`  ✔  Inséré : ${r.fields['Nom']} (id: ${r.id})`);
          resultats.inseres.push(r.fields['Nom']);
        });
      } catch (err) {
        console.error(`  ✗  Erreur lot : ${err.message}`);
        lot.forEach(h => resultats.erreurs.push({ nom: h.Nom, erreur: err.message }));
      }
      await new Promise(r => setTimeout(r, 250));
    }
  }

  // ─ Sauvegarde du rapport ─────────────────────────────────────────────────
  const rapport = {
    date:        new Date().toISOString(),
    base_id:     baseId,
    table:       TABLE_NAME,
    mode:        UPSERT ? 'upsert' : 'insert',
    inseres:     resultats.inseres,
    mis_a_jour:  resultats.mis_a_jour,
    erreurs:     resultats.erreurs,
  };
  const rapportPath = path.join(__dirname, 'outputs', 'sync-airtable-rapport.json');
  fs.writeFileSync(rapportPath, JSON.stringify(rapport, null, 2), 'utf-8');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  RÉSUMÉ SYNC AIRTABLE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ✔  Insérés       : ${resultats.inseres.length}`);
  console.log(`  ↻  Mis à jour    : ${resultats.mis_a_jour.length}`);
  console.log(`  ✗  Erreurs       : ${resultats.erreurs.length}`);
  console.log(`  Rapport          : outputs/sync-airtable-rapport.json`);
  if (resultats.erreurs.length) {
    console.log('\n  Détail erreurs :');
    resultats.erreurs.forEach(e => console.log(`    • ${e.nom} → ${e.erreur}`));
    console.log('\n  Conseil si erreur 422 : vérifie que les colonnes de ta table Airtable');
    console.log('  correspondent exactement aux noms de champs du script (sensible à la casse).');
    console.log('  Tu peux d\'abord lancer : node sync-airtable.js --dry-run');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
})().catch(err => {
  console.error('\nErreur fatale :', err.message);
  process.exit(1);
});
