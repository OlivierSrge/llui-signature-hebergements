#!/usr/bin/env node
/**
 * sync-airtable.js — v3
 * Source   : outputs/moteur-prestige.json  (si disponible, sinon moteur-brut.json)
 * Cible    : Airtable base app4xCy2vSCp8rW13, table tblk1eTmcnnjO7hfT
 * Mode     : UPSERT par Name (met à jour les existants, insère les nouveaux)
 *
 * Usage :
 *   AIRTABLE_TOKEN=pat… node sync-airtable.js
 *   AIRTABLE_TOKEN=pat… node sync-airtable.js --dry-run
 */

const fs       = require('fs');
const path     = require('path');
const Airtable = require('airtable');

// ─── CREDENTIALS ─────────────────────────────────────────────────────────────
const TOKEN    = process.env.AIRTABLE_TOKEN;
const BASE_ID  = process.env.AIRTABLE_BASE_ID  || 'app4xCy2vSCp8rW13';
const TABLE_ID = process.env.AIRTABLE_TABLE_ID || 'tblk1eTmcnnjO7hfT';
const DRY_RUN  = process.argv.includes('--dry-run');

if (!TOKEN) {
  console.error('Token manquant. Lance avec :');
  console.error('  AIRTABLE_TOKEN=pat… node sync-airtable.js');
  process.exit(1);
}

// ─── LECTURE SOURCE (prestige en priorité, fallback brut) ─────────────────────
const prestigePath = path.join(__dirname, 'outputs', 'moteur-prestige.json');
const brutPath     = path.join(__dirname, 'outputs', 'moteur-brut.json');

let srcPath;
if (fs.existsSync(prestigePath)) {
  srcPath = prestigePath;
  console.log('  [info] Source : moteur-prestige.json (descriptions L&Lui)');
} else if (fs.existsSync(brutPath)) {
  srcPath = brutPath;
  console.log('  [info] Source : moteur-brut.json (descriptions brutes eviivo)');
} else {
  console.error('Source introuvable : outputs/moteur-prestige.json ou moteur-brut.json');
  console.error('Lance d\'abord : node scrape-moteur.js  (puis optionnel : node embellir-descriptions.js)');
  process.exit(1);
}
const { meta, hebergements } = JSON.parse(fs.readFileSync(srcPath, 'utf-8'));

// ─── NETTOYAGE DES ÉQUIPEMENTS ────────────────────────────────────────────────
// Retire les doublons, les lignes bruitées (taille, "Maximum de:X") et les virgules
function nettoyerEquipements(liste) {
  const vus = new Set();
  return liste
    .map(e => e.replace(/,$/, '').replace(/\n/g, ' ').trim())
    .filter(e => {
      if (!e || e.length < 3) return false;
      if (/^\d+\s*m²/.test(e)) return false;          // "18 m² / 194 ft²"
      if (/^Taille:/i.test(e)) return false;           // "Taille:18 m² / 194 ft²"
      if (/^Maximum de:/i.test(e)) return false;       // "Maximum de: 2"
      if (/^\d+$/.test(e)) return false;               // chiffres isolés
      if (vus.has(e)) return false;
      vus.add(e);
      return true;
    });
}

// ─── CONSTRUCTION DU CHAMP Notes ─────────────────────────────────────────────
function construireNotes(h) {
  const cap = h.capacite_max
    || (h.equipements.find(e => /Maximum de/i.test(e))?.match(/\d+/) || [])[0]
    || '—';
  const prix = h.prix_sejour_xaf
    ? h.prix_sejour_xaf.toLocaleString('fr-FR') + ' XAF / nuit'
    : '— (prix non disponible)';
  const frais = h.frais_sup_xaf
    ? '+ ' + h.frais_sup_xaf.toLocaleString('fr-FR') + ' XAF en sus'
    : '';
  const dispo = h.disponibilite === 'disponible'
    ? `Disponible${h.chambres_dispos ? ' (' + h.chambres_dispos + ' unité(s))' : ''}`
    : h.disponibilite;

  const equip = nettoyerEquipements(h.equipements);

  // Utilise la description prestige si disponible, sinon la description brute
  const nomAffiche         = h.nom_prestige || h.nom;
  const descriptionAffiche = h.description_prestige || h.description || '—';
  const estPrestige        = !!h.nom_prestige;

  const lignes = [
    `━━━ ${nomAffiche} ━━━`,
    estPrestige ? `✨ Nom original : ${h.nom}` : '',
    ``,
    `📍 Les Gîtes de Kribi — Kribi, Cameroun`,
    `🔢 ID eviivo    : ${h.eviivo_id || '—'}`,
    `📐 Surface      : ${h.surface || '—'}`,
    `👥 Capacité max : ${cap} pers.`,
    ``,
    `💰 Tarif        : ${prix}`,
    frais ? `   Frais sup.   : ${frais}` : '',
    `🏷  Label        : ${h.label_tarif || 'Meilleur Tarif'}`,
    `✅ Disponibilité: ${dispo}`,
    ``,
    `📝 Description${estPrestige ? ' (L&Lui Prestige)' : ''}`,
    descriptionAffiche,
    ``,
    `🛎  Équipements (${equip.length})`,
    equip.map(e => `• ${e}`).join('\n'),
    ``,
    `📅 Données extraites le : ${meta.extrait_le?.slice(0, 10) || '—'}`,
    estPrestige && meta.embelli_le
      ? `✨ Embelli le    : ${meta.embelli_le.slice(0, 10)}`
      : '',
    `🔗 Source : ${meta.url_source || '—'}`,
  ].filter(l => l !== '');

  return lignes.join('\n');
}

// ─── CONVERSION → CHAMPS AIRTABLE ────────────────────────────────────────────
// Champs confirmés dans cette table : Name, Notes, Attachments
function versChamps(h) {
  const champs = {
    'Name':  h.nom_prestige || h.nom,   // nom prestige si dispo
    'Notes': construireNotes(h),
  };
  if (h.image_principale) {
    champs['Attachments'] = [{ url: h.image_principale }];
  }
  return champs;
}

// ─── UPSERT : cherche un record existant par Name ─────────────────────────────
// Essaie nom_prestige en premier (nouveau nom), puis nom original (ancien)
function trouverParNom(table, nom) {
  return new Promise((resolve, reject) => {
    let found = null;
    table.select({
      filterByFormula: `{Name} = "${nom.replace(/"/g, '\\"')}"`,
      maxRecords: 1,
    }).eachPage(
      (recs, next) => { if (recs.length) found = recs[0]; next(); },
      (err) => err ? reject(err) : resolve(found)
    );
  });
}

function trouverParNomOuOriginal(table, nomPrestige, nomOriginal) {
  // Si pas de nom prestige, recherche simple
  if (!nomPrestige || nomPrestige === nomOriginal) {
    return trouverParNom(table, nomOriginal);
  }
  // Sinon cherche d'abord le nom prestige, puis le nom original (migration)
  return trouverParNom(table, nomPrestige).then(found => {
    if (found) return found;
    return trouverParNom(table, nomOriginal);
  });
}

const pause = ms => new Promise(r => setTimeout(r, ms));

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Sync Airtable v2 — Les Gîtes de Kribi (eviivo)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Source   : outputs/moteur-brut.json`);
  console.log(`  Base     : ${BASE_ID}`);
  console.log(`  Table    : ${TABLE_ID}`);
  console.log(`  Records  : ${hebergements.length}`);
  console.log(`  Dates    : ${meta.date_arrivee} → ${meta.date_depart}`);
  console.log(`  Mode     : ${DRY_RUN ? 'DRY-RUN (aucune écriture)' : 'UPSERT'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (DRY_RUN) {
    hebergements.forEach((h, i) => {
      const cap = (h.equipements.find(e => /Maximum de/i.test(e))?.match(/\d+/) || [])[0] || '—';
      console.log(`  [${String(i+1).padStart(2)}] ${h.nom.slice(0, 50).padEnd(50)} ${String(h.prix_sejour_xaf || 0).padStart(7)} XAF  cap:${cap}`);
    });
    console.log('\n  Dry-run OK. Relance sans --dry-run pour écrire.\n');
    return;
  }

  Airtable.configure({ apiKey: TOKEN });
  const table = Airtable.base(BASE_ID)(TABLE_ID);

  const res = { inseres: [], mis_a_jour: [], erreurs: [] };

  for (const h of hebergements) {
    try {
      const existant = await trouverParNomOuOriginal(table, h.nom_prestige, h.nom);
      const champs   = versChamps(h);

      if (existant) {
        await table.update(existant.id, champs);
        console.log(`  ↻  MAJ      : ${h.nom.slice(0, 55)}`);
        res.mis_a_jour.push(h.nom);
      } else {
        const rec = await table.create(champs);
        console.log(`  ✔  Inséré   : ${h.nom.slice(0, 55)}  (${rec.id})`);
        res.inseres.push(h.nom);
      }
    } catch (err) {
      console.error(`  ✗  Erreur   : ${h.nom.slice(0, 45)} → ${err.message}`);
      res.erreurs.push({ nom: h.nom, erreur: err.message });
    }
    // Respecte la limite 5 req/s d'Airtable
    await pause(220);
  }

  // ─ Rapport ──────────────────────────────────────────────────────────────────
  const rapport = {
    date:       new Date().toISOString(),
    base_id:    BASE_ID,
    table_id:   TABLE_ID,
    source:     srcPath,
    inseres:    res.inseres,
    mis_a_jour: res.mis_a_jour,
    erreurs:    res.erreurs,
  };
  fs.writeFileSync(
    path.join(__dirname, 'outputs', 'sync-airtable-rapport.json'),
    JSON.stringify(rapport, null, 2)
  );

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  RÉSUMÉ');
  console.log(`  ✔  Insérés    : ${res.inseres.length}`);
  console.log(`  ↻  Mis à jour : ${res.mis_a_jour.length}`);
  console.log(`  ✗  Erreurs    : ${res.erreurs.length}`);
  console.log('  Rapport       : outputs/sync-airtable-rapport.json');
  if (res.erreurs.length) {
    console.log('\n  Détail erreurs :');
    res.erreurs.forEach(e => console.log(`    • ${e.nom} → ${e.erreur}`));
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
})().catch(err => {
  console.error('\nErreur fatale :', err.message);
  process.exit(1);
});
