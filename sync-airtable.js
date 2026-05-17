#!/usr/bin/env node
/**
 * sync-airtable.js
 * Lit outputs/schema-firestore-villas.json (source principale)
 * ou outputs/import-airtable.csv (fallback)
 * → Insère / met à jour les 6 hébergements des Gîtes de Kribi dans Airtable
 *
 * Credentials câblés directement — à déplacer en .env après usage.
 *
 * Usage :
 *   node sync-airtable.js             → insertion normale
 *   node sync-airtable.js --dry-run   → aperçu sans écriture
 *   node sync-airtable.js --upsert    → met à jour si Nom existe déjà
 */

const fs       = require('fs');
const path     = require('path');
const Airtable = require('airtable');

// ─── CREDENTIALS ─────────────────────────────────────────────────────────────
// Passe les valeurs via variables d'environnement :
//   AIRTABLE_TOKEN=pat…   AIRTABLE_BASE_ID=app…   AIRTABLE_TABLE_ID=tbl…
//   node sync-airtable.js
// Ou crée un fichier .env et charge-le avec : node -r dotenv/config sync-airtable.js
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID        = process.env.AIRTABLE_BASE_ID  || 'app4xCy2vSCp8rW13';
const TABLE_ID       = process.env.AIRTABLE_TABLE_ID || 'tblk1eTmcnnjO7hfT';

if (!AIRTABLE_TOKEN) {
  console.error('Token manquant. Lance avec :');
  console.error('  AIRTABLE_TOKEN=pat… node sync-airtable.js');
  process.exit(1);
}

// ─── CLI FLAGS ────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const UPSERT  = args.includes('--upsert');

// ─── LECTURE SOURCE ───────────────────────────────────────────────────────────
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

function chargerDepuisCSV() {
  const lines   = fs.readFileSync(CSV_PATH, 'utf-8').split('\n').filter(Boolean);
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

let hebergements;
if (fs.existsSync(JSON_PATH)) {
  hebergements = chargerDepuisJSON();
  console.log(`Source : outputs/schema-firestore-villas.json  (${hebergements.length} hébergements)`);
} else if (fs.existsSync(CSV_PATH)) {
  hebergements = chargerDepuisCSV();
  console.log(`Source : outputs/import-airtable.csv  (${hebergements.length} hébergements)`);
} else {
  console.error('Aucun fichier source. Lance d\'abord : node setup-database.js');
  process.exit(1);
}

// ─── CONVERSION → CHAMPS AIRTABLE ────────────────────────────────────────────
// Champs disponibles dans cette table (sondés via l'API) :
//   Name          → texte court (champ primaire)
//   Notes         → texte long  (on y concentre toutes les métadonnées)
//   Attachments   → pièces jointes (image principale)

function versChamps(h) {
  const lignes = [
    `🏡 ${h.Nom}`,
    ``,
    `📍 ${h.Etablissement} — ${h.Ville}, ${h.Pays}`,
    `🏷  Type : ${h.Type}${h.Surface_m2 ? `  |  Surface : ${h.Surface_m2} m²` : ''}${h.Capacite ? `  |  Capacité : ${h.Capacite} pers.` : ''}`,
    ``,
    `✨ Description L&Lui Signature`,
    h.Description_LLui,
    ``,
    `📝 Description d'origine`,
    h.Description_Brute,
    ``,
    `✅ Atouts`,
    (h.Atouts || '').split(' | ').map(a => `• ${a}`).join('\n'),
    ``,
    `🏷  Tags : ${h.Tags}`,
    ``,
    `🔗 Source : ${h.Source_URL}`,
    `📌 Statut : ${h.Statut}`,
    `🔑 Slug   : ${h.Slug}`,
  ];

  const champs = {
    'Name':  h.Nom,
    'Notes': lignes.join('\n'),
  };

  if (h.Image_Principale) {
    champs['Attachments'] = [{ url: h.Image_Principale }];
  }

  return champs;
}

// ─── UPSERT helper ───────────────────────────────────────────────────────────
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

function chunker(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Sync Airtable — Les Gîtes de Kribi');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Base            : ${BASE_ID}`);
  console.log(`  Table           : ${TABLE_ID}`);
  console.log(`  Mode            : ${DRY_RUN ? 'DRY-RUN' : UPSERT ? 'UPSERT' : 'INSERT'}`);
  console.log(`  Hébergements    : ${hebergements.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── Dry-run ────────────────────────────────────────────────────────────────
  if (DRY_RUN) {
    hebergements.forEach((h, i) => {
      console.log(`  [${i + 1}] ${h.Nom}`);
      console.log(`       Type        : ${h.Type}`);
      console.log(`       Capacité    : ${h.Capacite || '—'} pers.`);
      console.log(`       Image       : ${h.Image_Principale ? 'OK' : 'manquante'}`);
      console.log(`       Description : ${h.Description_LLui.slice(0, 80)}…\n`);
    });
    console.log('  Dry-run OK. Relance sans --dry-run pour insérer.\n');
    return;
  }

  // ── Connexion Airtable ─────────────────────────────────────────────────────
  Airtable.configure({ apiKey: AIRTABLE_TOKEN });
  const base  = Airtable.base(BASE_ID);
  const table = base(TABLE_ID);

  const resultats = { inseres: [], mis_a_jour: [], erreurs: [] };

  if (UPSERT) {
    // Un par un pour vérifier l'existence
    for (const h of hebergements) {
      try {
        const existant = await trouverExistant(table, h.Nom);
        const champs   = versChamps(h);
        if (existant) {
          await table.update(existant.id, champs);
          console.log(`  ↻  Mis à jour  : ${h.Nom}`);
          resultats.mis_a_jour.push(h.Nom);
        } else {
          const rec = await table.create(champs);
          console.log(`  ✔  Inséré      : ${h.Nom}  (${rec.id})`);
          resultats.inseres.push(h.Nom);
        }
      } catch (err) {
        console.error(`  ✗  Erreur "${h.Nom}" : ${err.message}`);
        resultats.erreurs.push({ nom: h.Nom, erreur: err.message });
      }
      await new Promise(r => setTimeout(r, 250));
    }
  } else {
    // Batch de 10 max (limite Airtable)
    for (const lot of chunker(hebergements, 10)) {
      const payload = lot.map(h => ({ fields: versChamps(h) }));
      try {
        const created = await table.create(payload);
        created.forEach(r => {
          console.log(`  ✔  Inséré : ${r.fields['Name']}  (${r.id})`);
          resultats.inseres.push(r.fields['Nom']);
        });
      } catch (err) {
        console.error(`  ✗  Erreur lot : ${err.message}`);
        // Réessai un par un pour identifier le record problématique
        console.log('     Réessai un par un…');
        for (const h of lot) {
          try {
            const rec = await table.create(versChamps(h));
            console.log(`  ✔  Inséré (retry) : ${h.Nom}  (${rec.id})`);
            resultats.inseres.push(h.Nom);
          } catch (e2) {
            console.error(`  ✗  Échec définitif "${h.Nom}" : ${e2.message}`);
            resultats.erreurs.push({ nom: h.Nom, erreur: e2.message });
          }
          await new Promise(r => setTimeout(r, 300));
        }
      }
      await new Promise(r => setTimeout(r, 250));
    }
  }

  // ── Rapport ────────────────────────────────────────────────────────────────
  const rapport = {
    date:       new Date().toISOString(),
    base_id:    BASE_ID,
    table_id:   TABLE_ID,
    mode:       UPSERT ? 'upsert' : 'insert',
    inseres:    resultats.inseres,
    mis_a_jour: resultats.mis_a_jour,
    erreurs:    resultats.erreurs,
  };
  const rapportPath = path.join(__dirname, 'outputs', 'sync-airtable-rapport.json');
  fs.writeFileSync(rapportPath, JSON.stringify(rapport, null, 2), 'utf-8');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  RÉSUMÉ');
  console.log(`  ✔  Insérés    : ${resultats.inseres.length}`);
  console.log(`  ↻  Maj        : ${resultats.mis_a_jour.length}`);
  console.log(`  ✗  Erreurs    : ${resultats.erreurs.length}`);
  console.log(`  Rapport       : outputs/sync-airtable-rapport.json`);

  if (resultats.erreurs.length) {
    console.log('\n  Détail erreurs :');
    resultats.erreurs.forEach(e => console.log(`    • ${e.nom} → ${e.erreur}`));
    console.log('\n  Si erreur 422 "Unknown field name" :');
    console.log('  Les noms de colonnes dans versChamps() doivent correspondre exactement');
    console.log('  à ceux visibles dans ta table Airtable (casse et espaces inclus).');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
})().catch(err => {
  console.error('\nErreur fatale :', err.message);
  process.exit(1);
});
