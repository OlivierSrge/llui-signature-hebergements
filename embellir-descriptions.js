#!/usr/bin/env node
/**
 * embellir-descriptions.js — v1
 * Source  : outputs/moteur-brut.json  (18 hébergements eviivo)
 * Cible   : outputs/moteur-prestige.json
 * Mode    : Appel Claude API (claude-opus-4-6) pour réécrire nom + description
 *           en ton "Dark Luxury / Conciergerie Prestige"
 *
 * Usage :
 *   ANTHROPIC_API_KEY=sk-ant-… node embellir-descriptions.js
 *   ANTHROPIC_API_KEY=sk-ant-… node embellir-descriptions.js --dry-run
 */

const fs        = require('fs');
const path      = require('path');
const Anthropic = require('@anthropic-ai/sdk').default ?? require('@anthropic-ai/sdk');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_KEY = process.env.ANTHROPIC_API_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

if (!API_KEY) {
  console.error('Clé API manquante. Lance avec :');
  console.error('  ANTHROPIC_API_KEY=sk-ant-… node embellir-descriptions.js');
  process.exit(1);
}

// ─── LECTURE SOURCE ───────────────────────────────────────────────────────────
const srcPath = path.join(__dirname, 'outputs', 'moteur-brut.json');
if (!fs.existsSync(srcPath)) {
  console.error('Source introuvable : outputs/moteur-brut.json');
  console.error("Lance d'abord : node scrape-moteur.js");
  process.exit(1);
}
const { meta, hebergements } = JSON.parse(fs.readFileSync(srcPath, 'utf-8'));

// ─── NETTOYAGE ÉQUIPEMENTS (repris de sync-airtable.js) ───────────────────────
function nettoyerEquipements(liste) {
  const vus = new Set();
  return liste
    .map(e => e.replace(/,$/, '').replace(/\n/g, ' ').trim())
    .filter(e => {
      if (!e || e.length < 3) return false;
      if (/^\d+\s*m²/.test(e)) return false;
      if (/^Taille:/i.test(e)) return false;
      if (/^Maximum de:/i.test(e)) return false;
      if (/^\d+$/.test(e)) return false;
      if (vus.has(e)) return false;
      vus.add(e);
      return true;
    });
}

// ─── PROMPT SYSTÈME (stable → prompt caching) ────────────────────────────────
const SYSTEM_PROMPT = `Tu es le rédacteur en chef de L&Lui Signature Hébergements, une conciergerie de prestige basée à Kribi, Cameroun.

Ta mission : transformer des descriptions brutes et neutres d'hébergements en textes "Dark Luxury / Conciergerie Prestige" — élégants, désirables, évocateurs. Les textes doivent donner l'impression d'un établissement exclusif, d'un refuge secret pour connaisseurs.

**Règles absolues :**
- Ton : raffiné, sensoriel, légèrement mystérieux — jamais clinique, jamais commercial
- Longueur nom prestige : 3–8 mots maximum, sans numérotation ni codes
- Longueur description prestige : 2–3 phrases, max 80 mots — dense, évocatrice
- Valorise systématiquement : la proximité de l'Atlantique à Kribi, la chaleur équatoriale, le confort, l'intimité, l'exclusivité
- Ne jamais mentionner les prix, les tarifs, les disponibilités, ni le site de réservation
- Ne jamais recopier le nom original tel quel
- Répondre UNIQUEMENT en JSON valide, sans markdown ni texte autour

**Format de réponse attendu (JSON strict) :**
{
  "nom_prestige": "...",
  "description_prestige": "..."
}`;

// ─── APPEL CLAUDE POUR UN HÉBERGEMENT ────────────────────────────────────────
const client = new Anthropic({ apiKey: API_KEY });

async function embellirHebergement(h, index, total) {
  const equip = nettoyerEquipements(h.equipements);
  const userMessage = `Hébergement ${index + 1}/${total} — à embellir :

Nom original : ${h.nom_original || h.nom}
Surface : ${h.surface || h.surface_m2 + ' m²' || '—'}
Capacité : ${h.capacite_max ? h.capacite_max + ' personnes max' : '—'}
Description brute : ${h.description || '(aucune)'}
Équipements notables : ${equip.slice(0, 12).join(', ')}

Réécris le nom et la description en ton Dark Luxury / Conciergerie Prestige.`;

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 400,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  const response = await stream.finalMessage();

  // Extraire le bloc texte (ignorer les blocs thinking)
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('Aucun bloc texte dans la réponse Claude');

  const raw = textBlock.text.trim();

  // Nettoyer les éventuelles balises markdown ```json … ```
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`JSON invalide reçu : ${cleaned.slice(0, 200)}`);
  }

  if (!parsed.nom_prestige || !parsed.description_prestige) {
    throw new Error(`Champs manquants : ${JSON.stringify(parsed)}`);
  }

  return {
    nom_prestige: parsed.nom_prestige,
    description_prestige: parsed.description_prestige,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
    },
  };
}

const pause = ms => new Promise(r => setTimeout(r, ms));

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Embellir Descriptions v1 — L&Lui Signature');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Source   : outputs/moteur-brut.json`);
  console.log(`  Cible    : outputs/moteur-prestige.json`);
  console.log(`  Records  : ${hebergements.length}`);
  console.log(`  Modèle   : claude-opus-4-6 (adaptive thinking)`);
  console.log(`  Mode     : ${DRY_RUN ? 'DRY-RUN (aucun appel API)' : 'LIVE'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (DRY_RUN) {
    hebergements.forEach((h, i) => {
      console.log(`  [${String(i + 1).padStart(2)}] ${h.nom.slice(0, 60)}`);
    });
    console.log('\n  Dry-run OK. Relance sans --dry-run pour appeler Claude.\n');
    return;
  }

  const prestige = [];
  const erreurs  = [];
  let totalTokensIn  = 0;
  let totalTokensOut = 0;
  let totalCacheRead = 0;

  for (let i = 0; i < hebergements.length; i++) {
    const h = hebergements[i];
    process.stdout.write(`  [${String(i + 1).padStart(2)}/${hebergements.length}] ${h.nom.slice(0, 50).padEnd(50)} `);

    try {
      const enrichi = await embellirHebergement(h, i, hebergements.length);

      // Fusionner les données brutes avec les données prestige
      prestige.push({
        ...h,
        nom_prestige:          enrichi.nom_prestige,
        description_prestige:  enrichi.description_prestige,
      });

      totalTokensIn  += enrichi.usage.input_tokens;
      totalTokensOut += enrichi.usage.output_tokens;
      totalCacheRead += enrichi.usage.cache_read_input_tokens;

      const cacheHit = enrichi.usage.cache_read_input_tokens > 0 ? ' [cache ✓]' : '';
      console.log(`✔  "${enrichi.nom_prestige.slice(0, 40)}"${cacheHit}`);
    } catch (err) {
      console.log(`✗  ${err.message.slice(0, 60)}`);
      // Conserver l'hébergement original sans enrichissement
      prestige.push({ ...h, nom_prestige: h.nom, description_prestige: h.description || '' });
      erreurs.push({ nom: h.nom, erreur: err.message });
    }

    // Petite pause pour éviter les rate limits (max 5 req/min sur les grands modèles)
    if (i < hebergements.length - 1) await pause(1200);
  }

  // ─── SAUVEGARDE ──────────────────────────────────────────────────────────────
  const output = {
    meta: {
      ...meta,
      embelli_le:  new Date().toISOString(),
      modele:      'claude-opus-4-6',
      erreurs:     erreurs.length,
    },
    hebergements: prestige,
  };

  const destPath = path.join(__dirname, 'outputs', 'moteur-prestige.json');
  fs.writeFileSync(destPath, JSON.stringify(output, null, 2));

  // ─── RÉSUMÉ ──────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  RÉSUMÉ');
  console.log(`  ✔  Embellis    : ${prestige.length - erreurs.length}/${hebergements.length}`);
  console.log(`  ✗  Erreurs     : ${erreurs.length}`);
  console.log(`  🔢 Tokens in   : ${totalTokensIn.toLocaleString('fr-FR')}`);
  console.log(`  🔢 Tokens out  : ${totalTokensOut.toLocaleString('fr-FR')}`);
  console.log(`  💾 Cache read  : ${totalCacheRead.toLocaleString('fr-FR')} tokens`);
  console.log(`  📄 Fichier     : outputs/moteur-prestige.json`);
  if (erreurs.length) {
    console.log('\n  Détail erreurs :');
    erreurs.forEach(e => console.log(`    • ${e.nom} → ${e.erreur}`));
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
})().catch(err => {
  console.error('\nErreur fatale :', err.message);
  process.exit(1);
});
