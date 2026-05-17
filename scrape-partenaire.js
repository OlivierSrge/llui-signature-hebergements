#!/usr/bin/env node
/**
 * scrape-partenaire.js
 * Usage : node scrape-partenaire.js <URL>
 * Résultat : outputs/logement-brut.json
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const url = process.argv[2];

if (!url) {
  console.error('Usage: node scrape-partenaire.js <URL>');
  process.exit(1);
}

(async () => {
  console.log(`Scraping : ${url}`);

  let html;
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
    });
    html = response.data;
  } catch (err) {
    console.error(`Erreur lors de la requête HTTP : ${err.message}`);
    process.exit(1);
  }

  const $ = cheerio.load(html);

  // Titre
  const titre = $('title').first().text().trim() || null;

  // H1
  const h1 = [];
  $('h1').each((_, el) => {
    const text = $(el).text().trim();
    if (text) h1.push(text);
  });

  // H2
  const h2 = [];
  $('h2').each((_, el) => {
    const text = $(el).text().trim();
    if (text) h2.push(text);
  });

  // Paragraphes (on filtre les vides et les très courts < 20 chars)
  const paragraphes = [];
  $('p').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length >= 20) paragraphes.push(text);
  });

  // Images
  const images = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
    const alt = $(el).attr('alt') || '';
    if (src) {
      // Résolution URL relative → absolue
      let srcAbsolu = src;
      if (src.startsWith('//')) {
        srcAbsolu = 'https:' + src;
      } else if (src.startsWith('/')) {
        const base = new URL(url);
        srcAbsolu = base.origin + src;
      } else if (!src.startsWith('http')) {
        try {
          srcAbsolu = new URL(src, url).href;
        } catch {
          srcAbsolu = src;
        }
      }
      images.push({ src: srcAbsolu, alt });
    }
  });

  // Meta description
  const metaDescription =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    null;

  // OG image
  const ogImage = $('meta[property="og:image"]').attr('content') || null;

  const resultat = {
    url_source: url,
    extrait_le: new Date().toISOString(),
    titre,
    meta_description: metaDescription,
    og_image: ogImage,
    h1,
    h2,
    paragraphes,
    images: {
      total: images.length,
      liste: images,
    },
  };

  const outputDir = path.join(__dirname, 'outputs');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, 'logement-brut.json');
  fs.writeFileSync(outputPath, JSON.stringify(resultat, null, 2), 'utf-8');

  console.log(`\nExtraction terminée :`);
  console.log(`  Titre       : ${titre}`);
  console.log(`  H1          : ${h1.length} élément(s)`);
  console.log(`  H2          : ${h2.length} élément(s)`);
  console.log(`  Paragraphes : ${paragraphes.length} élément(s)`);
  console.log(`  Images      : ${images.length} trouvée(s)`);
  console.log(`\n  Résultat enregistré → ${outputPath}`);
})();
