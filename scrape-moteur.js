#!/usr/bin/env node
/**
 * scrape-moteur.js
 * Scrape le moteur de réservation eviivo des Gîtes de Kribi.
 * Ouvre la page, saisit des dates J+1/J+2, attend le chargement des prix
 * et extrait pour chaque hébergement : nom, prix/nuit, disponibilité,
 * surface, capacité, équipements, image principale.
 *
 * Usage :
 *   node scrape-moteur.js
 *   node scrape-moteur.js --arrivee 2026-06-10 --depart 2026-06-12
 *   node scrape-moteur.js --url https://via.eviivo.com/MonAutreEtab
 *
 * Résultat : outputs/moteur-brut.json
 */

const puppeteer = require('puppeteer-core');
const fs        = require('fs');
const path      = require('path');

// ─── ARGUMENTS ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

function getArg(flag, def = null) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
}

const URL_MOTEUR = getArg('--url', 'https://via.eviivo.com/GitesDeKribi');

// Dates par défaut : demain → après-demain
function dateISO(offsetJours = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetJours);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

const DATE_ARRIVEE = getArg('--arrivee', dateISO(1));
const DATE_DEPART  = getArg('--depart',  dateISO(2));

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function pad(n) { return String(n).padStart(2, '0'); }

// Format date YYYY-MM-DD → objet { jour, mois, annee }
function parseDate(iso) {
  const [annee, mois, jour] = iso.split('-').map(Number);
  return { annee, mois, jour };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Scrape Moteur eviivo — Les Gîtes de Kribi');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  URL      : ${URL_MOTEUR}`);
  console.log(`  Arrivée  : ${DATE_ARRIVEE}`);
  console.log(`  Départ   : ${DATE_DEPART}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!fs.existsSync(CHROME_PATH)) {
    console.error('Chrome non trouvé dans /Applications. Installe Google Chrome.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1280, height: 900 });

  // ── 1. Chargement de la page ────────────────────────────────────────────────
  console.log('Chargement du moteur de réservation...');
  await page.goto(URL_MOTEUR, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  // ── 2. Saisie des dates via jQuery UI datepicker (clic réel) ────────────────
  console.log(`Saisie des dates : ${DATE_ARRIVEE} → ${DATE_DEPART}...`);

  let prixObtenus = false;

  // Extrait le numéro du jour depuis une date ISO
  const jourArrivee = String(parseInt(DATE_ARRIVEE.split('-')[2], 10));
  const jourDepart  = String(parseInt(DATE_DEPART.split('-')[2], 10));

  try {
    // ─ Champ Arrivée ──────────────────────────────────────────────────────────
    await page.click('#eviivo-start-date');
    await new Promise(r => setTimeout(r, 1200));

    const clicArrivee = await page.evaluate((jour) => {
      const dp = document.getElementById('ui-datepicker-div');
      if (!dp) return false;
      const link = Array.from(dp.querySelectorAll('td a'))
        .find(a => a.innerText.trim() === jour);
      if (link) { link.click(); return true; }
      return false;
    }, jourArrivee);
    console.log(`  Arrivée (jour ${jourArrivee}) cliqué : ${clicArrivee}`);
    await new Promise(r => setTimeout(r, 800));

    // ─ Champ Départ ───────────────────────────────────────────────────────────
    await page.click('#eviivo-end-date');
    await new Promise(r => setTimeout(r, 1200));

    const clicDepart = await page.evaluate((jour) => {
      const dp = document.getElementById('ui-datepicker-div');
      if (!dp) return false;
      const link = Array.from(dp.querySelectorAll('td a'))
        .find(a => a.innerText.trim() === jour);
      if (link) { link.click(); return true; }
      return false;
    }, jourDepart);
    console.log(`  Départ  (jour ${jourDepart}) cliqué : ${clicDepart}`);
    await new Promise(r => setTimeout(r, 800));

    // ─ Bouton "Voir les prix" ─────────────────────────────────────────────────
    console.log('  Soumission du formulaire...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button, input[type="submit"], a'))
          .find(b => /voir|prix|search|cherch/i.test(b.innerText || b.value || ''));
        if (btn) btn.click();
      }),
    ]);

    console.log(`  Page résultats chargée : ${page.url().slice(0, 80)}`);
    await new Promise(r => setTimeout(r, 4000));
    prixObtenus = true;

  } catch (e) {
    console.warn(`  Saisie de dates partielle (${e.message}).`);
    // Fallback : rechargement direct avec paramètres URL
    try {
      const urlFallback = `${URL_MOTEUR}?startdate=${DATE_ARRIVEE}&enddate=${DATE_DEPART}&adults1=2&children1=0`;
      console.log('  Fallback URL params...');
      await page.goto(urlFallback, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise(r => setTimeout(r, 5000));
      prixObtenus = true;
    } catch (e2) {
      console.warn('  Fallback échoué également — extraction sans prix.');
    }
  }

  // ── 3. Scroll pour charger tous les hébergements (lazy load) ────────────────
  console.log('Défilement pour charger tous les hébergements...');
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let total = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, 400);
        total += 400;
        if (total >= document.body.scrollHeight) { clearInterval(timer); resolve(); }
      }, 120);
    });
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 1000));

  // ── 4. Extraction des hébergements ──────────────────────────────────────────
  console.log('Extraction des données...');

  const hebergements = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('section.results-item'));

    return cards.map(card => {
      // ─ Nom ──────────────────────────────────────────────────────────────────
      const nomEl = card.querySelector('.room-details .result-title, .room-details h2, .room-details h3, .result-title, .room-details');
      let nom = '';
      if (nomEl) {
        nom = nomEl.innerText.split('\n')[0].trim();
      }

      // Nettoie le préfixe numérique "6. ", "18. ", "2 - ", "3 - " etc.
      const nomPropre = nom.replace(/^\d+[\.\-]\s*/, '').trim();

      // ─ ID / numéro eviivo ────────────────────────────────────────────────────
      const numMatch = nom.match(/^(\d+)[\.\-]/);
      const eviivoId = numMatch ? numMatch[1] : null;

      // ─ Surface ──────────────────────────────────────────────────────────────
      const surfaceEl = card.querySelector('.icon-room-size');
      const surface = surfaceEl
        ? surfaceEl.innerText.trim().replace(/\s+/g, ' ')
        : null;
      const surfaceM2 = surface
        ? (surface.match(/(\d+)\s*m²/) || [])[1] || null
        : null;

      // ─ Capacité max ─────────────────────────────────────────────────────────
      const strongEl = card.querySelector('strong');
      const capaciteMax = strongEl ? parseInt(strongEl.innerText.trim(), 10) || null : null;

      // ─ Équipements ──────────────────────────────────────────────────────────
      const equipEls = card.querySelectorAll('.mod-room-options li, [class*="amenity"], [class*="facility"]');
      const equipements = Array.from(equipEls)
        .map(el => el.innerText.trim())
        .filter(t => t && t.length > 1 && !/^\d+$/.test(t));

      // ─ Prix ─────────────────────────────────────────────────────────────────
      // Sélecteurs confirmés : .price-wrap (montant total séjour), .cp-extraCost
      let prixBrut      = null;
      let prixSejourXAF = null; // total pour le séjour
      let fraisSupXAF   = null; // frais additionnels
      let devise        = 'XAF';
      let labelTarif    = null;

      const priceWrap = card.querySelector('.price-wrap');
      if (priceWrap) {
        const txt = priceWrap.innerText.trim();
        prixBrut = txt;
        // Extrait le premier montant (ex: "86 400,00 XAF")
        const m = txt.match(/[\d\s]+[,.]?\d*/);
        if (m) {
          prixSejourXAF = parseFloat(m[0].replace(/\s/g, '').replace(',', '.')) || null;
        }
        if (txt.includes('€')) devise = 'EUR';
        else if (txt.includes('$')) devise = 'USD';
      }

      const extraCost = card.querySelector('.cp-extraCost, [class*="extraCost"]');
      if (extraCost) {
        const txt = extraCost.innerText.trim();
        const m = txt.match(/[\d\s]+[,.]?\d*/);
        if (m) fraisSupXAF = parseFloat(m[0].replace(/\s/g, '').replace(',', '.')) || null;
      }

      const priceLbl = card.querySelector('.price-details, .results-price');
      if (priceLbl) {
        const lines = priceLbl.innerText.split('\n').map(l => l.trim()).filter(Boolean);
        labelTarif = lines[0] || null; // ex: "Meilleur Tarif"
      }

      // ─ Disponibilité ────────────────────────────────────────────────────────
      const bodyText = card.innerText;
      let disponibilite = 'inconnu';
      let chambresDispos = null;

      if (/indisponible|unavailable|complet|sold.?out/i.test(bodyText)) {
        disponibilite = 'indisponible';
      } else if (prixSejourXAF) {
        // Si un prix est affiché = disponible
        disponibilite = 'disponible';
        // Cherche le bouton "Réservez" et un compteur éventuel
        if (/[Rr][eé]servez|[Bb]ook/i.test(bodyText)) {
          disponibilite = 'disponible';
        }
        // Compteur de lofts/chambres restantes (DIV isolé avec chiffre)
        const allEls2 = Array.from(card.querySelectorAll('div'));
        const divsNb = allEls2.filter(el => {
          const t = (el.innerText || '').trim();
          const cn = (typeof el.className === 'string') ? el.className : '';
          return /^\d+$/.test(t) && el.children.length === 0 && !cn;
        });
        if (divsNb.length) chambresDispos = parseInt(divsNb[0].innerText, 10) || null;
      } else if (/s[eé]lectionner|select|reserver|book|choose/i.test(bodyText)) {
        disponibilite = 'disponible';
      } else {
        // Sans dates, le compteur DIV anonyme est présent sur les cartes dispos
        const allEls2 = Array.from(card.querySelectorAll('div'));
        const divsNb = allEls2.filter(el => {
          const t = (el.innerText || '').trim();
          const cn = (typeof el.className === 'string') ? el.className : '';
          return /^\d+$/.test(t) && el.children.length === 0 && !cn;
        });
        if (divsNb.length > 0) {
          const nb = parseInt(divsNb[0].innerText, 10);
          if (nb > 0) { disponibilite = 'disponible'; chambresDispos = nb; }
        } else {
          disponibilite = 'non_renseignee_sans_dates';
        }
      }

      // ─ Image principale ─────────────────────────────────────────────────────
      const imgEl = card.querySelector('img[src], img[data-src]');
      const imageSrc = imgEl
        ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '')
        : '';

      // ─ Description courte ───────────────────────────────────────────────────
      const descEl = card.querySelector('.room-text, .description, [class*="desc"], [class*="text"]');
      let description = '';
      if (descEl) {
        description = descEl.innerText.trim().replace(/\s+/g, ' ').slice(0, 400);
      } else {
        // Fallback : texte du .room-details après le titre
        const rdEl = card.querySelector('.room-details');
        if (rdEl) {
          const lines = rdEl.innerText.split('\n').map(l => l.trim()).filter(Boolean);
          // Saute le titre et les éléments courts (surface, max)
          description = lines.slice(1).filter(l => l.length > 20).slice(0, 3).join(' ').slice(0, 400);
        }
      }

      // ─ URL de réservation ───────────────────────────────────────────────────
      const lienEl = card.querySelector('a[href]');
      const urlResa = lienEl ? lienEl.href : '';

      return {
        eviivo_id:        eviivoId,
        nom:              nomPropre,
        nom_original:     nom,
        surface:          surface,
        surface_m2:       surfaceM2 ? parseInt(surfaceM2, 10) : null,
        capacite_max:     capaciteMax,
        equipements,
        label_tarif:      labelTarif,
        prix_sejour_xaf:  prixSejourXAF,
        frais_sup_xaf:    fraisSupXAF,
        prix_brut:        prixBrut,
        devise,
        disponibilite,
        chambres_dispos:  chambresDispos,
        image_principale: imageSrc,
        description,
        url_reservation:  urlResa,
      };
    });
  });

  await browser.close();

  // ── 5. Post-traitement ──────────────────────────────────────────────────────
  const avecPrix      = hebergements.filter(h => h.prix_sejour_xaf !== null);
  const disponibles   = hebergements.filter(h => h.disponibilite === 'disponible');
  const indisponibles = hebergements.filter(h => h.disponibilite === 'indisponible');

  // ── 6. Sauvegarde ──────────────────────────────────────────────────────────
  const sortie = {
    meta: {
      url_source:    URL_MOTEUR,
      date_arrivee:  DATE_ARRIVEE,
      date_depart:   DATE_DEPART,
      extrait_le:    new Date().toISOString(),
      prix_obtenus:  prixObtenus,
      total_hebergements: hebergements.length,
      avec_prix:     avecPrix.length,
      disponibles:   disponibles.length,
      indisponibles: indisponibles.length,
    },
    hebergements,
  };

  const outputDir  = path.join(__dirname, 'outputs');
  const outputPath = path.join(outputDir, 'moteur-brut.json');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(sortie, null, 2), 'utf-8');

  // ── 7. Résumé console ──────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  RÉSULTAT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Hébergements trouvés : ${hebergements.length}`);
  console.log(`  Avec prix            : ${avecPrix.length}`);
  console.log(`  Disponibles          : ${disponibles.length}`);
  console.log(`  Indisponibles        : ${indisponibles.length}`);
  console.log(`\n  Détail :`);

  hebergements.forEach((h, i) => {
    const prix  = h.prix_sejour_xaf
      ? `${h.prix_sejour_xaf.toLocaleString('fr-FR')} ${h.devise} séjour`
      : '— (dates requises)';
    const dispo = h.disponibilite === 'disponible'
      ? `✔ dispo${h.chambres_dispos ? ` (${h.chambres_dispos})` : ''}`
      : h.disponibilite === 'indisponible' ? '✗ indispo'
      : '? —';
    console.log(`  [${String(i+1).padStart(2)}] ${h.nom.slice(0, 45).padEnd(45)} ${dispo.padEnd(14)} ${prix}`);
  });

  console.log(`\n  Fichier : outputs/moteur-brut.json`);
  if (avecPrix.length === 0) {
    console.log('\n  Note : les prix ne s\'affichent qu\'après sélection de dates sur eviivo.');
    console.log('  Relance avec des dates futures :');
    console.log('  node scrape-moteur.js --arrivee 2026-06-10 --depart 2026-06-12');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
})().catch(err => {
  console.error('\nErreur fatale :', err.message);
  process.exit(1);
});
