#!/usr/bin/env node
/**
 * scrape-partenaire.js
 * Usage : node scrape-partenaire.js <URL>
 * Résultat : outputs/logement-brut.json
 *
 * Mode 1 (défaut) : Puppeteer headless — exécute le JS du site, attend le rendu complet
 * Mode 2 (fallback) : axios + cheerio — si Puppeteer indisponible
 */

const fs   = require('fs');
const path = require('path');

const url = process.argv[2];

if (!url) {
  console.error('Usage: node scrape-partenaire.js <URL>');
  process.exit(1);
}

// Résout une URL relative en absolue
function toAbsolute(src, base) {
  if (!src) return null;
  if (src.startsWith('//'))   return 'https:' + src;
  if (src.startsWith('http')) return src;
  try { return new URL(src, base).href; } catch { return src; }
}

// Extraction depuis le HTML final (cheerio ou DOM puppeteer)
function extraire($, baseUrl) {
  const cheerio = require('cheerio');

  const titre = $('title').first().text().trim() || null;

  const metaDescription =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') || null;

  const ogImage = $('meta[property="og:image"]').attr('content') || null;

  const h1 = [];
  $('h1').each((_, el) => { const t = $(el).text().trim(); if (t) h1.push(t); });

  const h2 = [];
  $('h2').each((_, el) => { const t = $(el).text().trim(); if (t) h2.push(t); });

  const paragraphes = [];
  $('p').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t.length >= 20) paragraphes.push(t);
  });

  const imagesVues = new Set();
  const images = [];
  $('img').each((_, el) => {
    const raw = $(el).attr('src') || $(el).attr('data-src') ||
                $(el).attr('data-lazy-src') || $(el).attr('data-original');
    const alt = $(el).attr('alt') || '';
    const src = toAbsolute(raw, baseUrl);
    if (src && !imagesVues.has(src)) {
      imagesVues.add(src);
      images.push({ src, alt });
    }
  });

  // Arrière-plans CSS inline style="background-image:url(...)"
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const match = style.match(/background(?:-image)?\s*:\s*url\(['"]?([^'")\s]+)['"]?\)/i);
    if (match) {
      const src = toAbsolute(match[1], baseUrl);
      if (src && !imagesVues.has(src)) {
        imagesVues.add(src);
        images.push({ src, alt: '[background]' });
      }
    }
  });

  return { titre, metaDescription, ogImage, h1, h2, paragraphes, images };
}

(async () => {
  console.log(`\nScraping (mode Puppeteer) : ${url}\n`);

  let puppeteer, browser, html;

  try {
    puppeteer = require('puppeteer-core');
  } catch {
    console.warn('puppeteer-core absent, bascule sur axios+cheerio');
  }

  if (puppeteer) {
    // Cherche Chrome installé localement (macOS)
    const chromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
    const executablePath = chromePaths.find(p => fs.existsSync(p));

    if (!executablePath) {
      console.error(
        'Chrome/Chromium non trouvé dans /Applications.\n' +
        'Installe Google Chrome ou lance : npx puppeteer browsers install chrome'
      );
      process.exit(1);
    }

    browser = await puppeteer.launch({
      executablePath,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log('Chargement de la page...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Attente supplémentaire pour le rendu JS des SPA
    await new Promise(r => setTimeout(r, 4000));

    // Scroll pour forcer le lazy-loading des images
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let totalHeight = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, 300);
          totalHeight += 300;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    await new Promise(r => setTimeout(r, 1000));

    html = await page.content();
    await browser.close();
    console.log('Page rendue avec succès.\n');

  } else {
    // Fallback axios
    const axios = require('axios');
    const res = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
    });
    html = res.data;
  }

  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  const { titre, metaDescription, ogImage, h1, h2, paragraphes, images } = extraire($, url);

  const resultat = {
    url_source:       url,
    extrait_le:       new Date().toISOString(),
    titre,
    meta_description: metaDescription,
    og_image:         ogImage,
    h1,
    h2,
    paragraphes,
    images: {
      total: images.length,
      liste: images,
    },
  };

  const outputDir  = path.join(__dirname, 'outputs');
  const outputPath = path.join(outputDir, 'logement-brut.json');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(resultat, null, 2), 'utf-8');

  console.log(`Extraction terminée :`);
  console.log(`  Titre       : ${titre}`);
  console.log(`  H1          : ${h1.length} élément(s)`);
  console.log(`  H2          : ${h2.length} élément(s)`);
  console.log(`  Paragraphes : ${paragraphes.length} élément(s)`);
  console.log(`  Images      : ${images.length} trouvée(s)`);
  console.log(`\n  Résultat → ${outputPath}`);
})().catch(err => {
  console.error('Erreur fatale :', err.message);
  process.exit(1);
});
