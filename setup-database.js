#!/usr/bin/env node
/**
 * setup-database.js
 * Analyse outputs/logement-brut.json (Les Gîtes de Kribi)
 * → Génère outputs/import-airtable.csv
 * → Génère outputs/schema-firestore-villas.json
 *
 * Descriptions au ton « L&Lui Signature » — élégant, sensoriel, émotionnel.
 */

const fs   = require('fs');
const path = require('path');

// ─── 1. LECTURE DES DONNÉES BRUTES ──────────────────────────────────────────

const rawPath = path.join(__dirname, 'outputs', 'logement-brut.json');
if (!fs.existsSync(rawPath)) {
  console.error('Fichier introuvable : outputs/logement-brut.json\nLance d\'abord : node scrape-partenaire.js <URL>');
  process.exit(1);
}
const brut = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
const images = brut.images.liste;

console.log(`\nAnalyse de : ${brut.url_source}`);
console.log(`Titre détecté : ${brut.titre}`);
console.log(`Paragraphes bruts : ${brut.paragraphes.length}`);
console.log(`Images brutes : ${images.length}\n`);

// ─── 2. CATALOGUE ENRICHI — TON L&LUI SIGNATURE ─────────────────────────────
//
// Chaque hébergement est construit à partir des données scrappées :
// description_brute  → ce que dit le site
// description_llui   → reformulé avec l'élégance éditoriale L&Lui
// atouts             → liste condensée, pertinente pour un client premium
// image              → URL directe depuis le scrape (alt = nom hébergement)

const ETABLISSEMENT = {
  nom:            brut.h1[0] || 'Les Gîtes de Kribi',
  url_source:     brut.url_source,
  meta:           brut.meta_description,
  ville:          'Kribi',
  pays:           'Cameroun',
  services_site:  [
    'Restaurant "Au Plaisir du Goût" — cuisine locale et internationale',
    'Spa : massages, hammam, salon de coiffure',
    '2 piscines extérieures',
    'Terrain de sport & activités nautiques',
    'Excursions : Chutes de la Lobé, Plage de Grand Batanga',
    'Séminaires et réceptions sur mesure',
    'Service 24h/24',
  ],
};

// Fonction utilitaire : trouver l'image par son alt
function img(altFragment) {
  const found = images.find(i => i.alt.toLowerCase().includes(altFragment.toLowerCase()));
  return found ? found.src : null;
}

const HEBERGEMENTS = [
  {
    slug:              'ocean-pearl-suite',
    nom:               'Ocean Pearl Suite',
    type:              'suite',
    surface_m2:        75,
    capacite_personnes: 2,
    description_brute: 'Échappée romantique pour couples en quête d\'intimité. Suite premium de 75m² avec jacuzzi extérieur face à la mer, lit Queen et balcon privé vue océan.',
    description_llui:  'Une parenthèse hors du temps pour les amoureux du grand large. La Ocean Pearl Suite enveloppe ses hôtes dans 75 m² de luxe discret où le jacuzzi extérieur dialogue avec l\'horizon marin, le lit Queen invite à une nuit de velours et le balcon privé déroule une vue spectaculaire sur l\'océan Atlantique. Ici, chaque coucher de soleil devient un souvenir que l\'on grave.',
    atouts:            ['Jacuzzi extérieur vue mer', 'Balcon privé panoramique', 'Lit Queen confort premium', '75 m² — suite romantique', 'Idéal couples & lune de miel'],
    tags:              ['romantique', 'couples', 'vue mer', 'jacuzzi', 'suite', 'lune de miel'],
    image:             img('Ocean Pearl'),
  },
  {
    slug:              'cabane-dans-les-arbres',
    nom:               'Cabane dans les Arbres',
    type:              'cabane',
    surface_m2:        null,
    capacite_personnes: 2,
    description_brute: 'Charmante cabane perchée dans un manguier centenaire avec vue mer. Expérience unique au cœur de la nature avec tout le confort moderne.',
    description_llui:  'Perchée dans les bras d\'un manguier centenaire, cette cabane est une invitation à réenchanter son rapport au monde. À mi-chemin entre la canopée tropicale et le bleu de l\'Atlantique, elle conjugue l\'âme d\'une aventure authentique et tout le confort que l\'on est en droit d\'exiger. Une nuit ici, c\'est une histoire que l\'on raconte toute sa vie.',
    atouts:            ['Cabane perchée dans un manguier centenaire', 'Vue mer depuis la cime', 'Confort moderne en pleine nature', 'Expérience rare & mémorable'],
    tags:              ['nature', 'insolite', 'vue mer', 'éco-luxe', 'cabane', 'arbre'],
    image:             img('Cabane'),
  },
  {
    slug:              'chambre-premium',
    nom:               'Chambre Premium Vue Mer',
    type:              'chambre',
    surface_m2:        null,
    capacite_personnes: 2,
    description_brute: 'Chambre spacieuse avec vue mer panoramique et balcon privé. Lit Queen 160cm, climatisation, piscine et salle de sport inclus.',
    description_llui:  'L\'éveil face à l\'océan. La Chambre Premium s\'ouvre sur une vue mer panoramique qui capte la lumière dorée du matin et les teintes cuivrées du soir. Balcon privé, literie Queen 160 cm, climatisation silencieuse — chaque détail est pensé pour que le confort devienne un art de vivre. L\'accès à la piscine et à la salle de sport complète une expérience où le corps et les sens sont également choyés.',
    atouts:            ['Vue mer panoramique', 'Balcon privé', 'Lit Queen 160 cm', 'Accès piscine inclus', 'Climatisation', 'Salle de sport incluse'],
    tags:              ['vue mer', 'balcon', 'confort premium', 'piscine', 'chambre'],
    image:             img('Chambre Premium'),
  },
  {
    slug:              'chambre-standard-confort',
    nom:               'Chambre Standard Confort',
    type:              'chambre',
    surface_m2:        null,
    capacite_personnes: 2,
    description_brute: 'Chambre Standard Confort au cœur de Kribi. Literie de qualité, climatisation, TV écran plat, Wi-Fi gratuit et salle de bain privative.',
    description_llui:  'Le confort essentiel, sans compromis sur l\'élégance. Nichée au cœur de Kribi, la Chambre Standard Confort est un refuge intime où la literie soignée, la climatisation maîtrisée et la connexion Wi-Fi garantissent un séjour sans friction. Pour les voyageurs qui veulent profiter de chaque heure en ville sans se soucier du reste.',
    atouts:            ['Literie de qualité', 'Climatisation', 'TV écran plat', 'Wi-Fi gratuit', 'Salle de bain privative', 'Idéal voyageurs d\'affaires'],
    tags:              ['confort', 'standard', 'wifi', 'affaires', 'centre kribi'],
    image:             img('Standard'),
  },
  {
    slug:              'chambres-communicantes-familiales',
    nom:               'Chambres Communicantes Familiales',
    type:              'suite_familiale',
    surface_m2:        null,
    capacite_personnes: 5,
    description_brute: 'Chambre communicante familiale. Parfait pour les familles nombreuses en quête de confort.',
    description_llui:  'Parce que les plus beaux voyages se vivent ensemble. Les Chambres Communicantes offrent aux familles l\'espace nécessaire pour que chacun trouve son territoire sans perdre la chaleur du collectif. Deux univers reliés, un seul moment partagé — la formule idéale pour que parents et enfants se retrouvent au même rythme, sans jamais se marcher dessus.',
    atouts:            ['Configuration communicante', 'Parfait pour familles nombreuses', 'Espaces privatifs réunis', 'Capacité jusqu\'à 5 personnes'],
    tags:              ['famille', 'communicant', 'enfants', 'groupe', 'spacieux'],
    image:             img('Communicant'),
  },
  {
    slug:              'chalet-familial-magnolia',
    nom:               'Chalet Familial Magnolia',
    type:              'chalet',
    surface_m2:        null,
    capacite_personnes: 8,
    description_brute: 'Chalet Familial construit en bois azobé. 3 chambres, salon spacieux, kitchenette équipée et balcon vue rivière. Confort supérieur pour familles nombreuses.',
    description_llui:  'L\'art de recevoir la grande famille, dans la noblesse du bois azobé. Le Chalet Magnolia est une maison dans la maison : trois chambres indépendantes, un salon généreux où les récits de la journée se prolongent, une kitchenette pour les petits-déjeuners en pyjama et un balcon ouvert sur la rivière — tableau vivant qui change d\'heure en heure. Le séjour idéal pour les réunions de famille dont on parle encore des années plus tard.',
    atouts:            ['Construction en bois azobé', '3 chambres indépendantes', 'Salon & kitchenette équipée', 'Balcon vue rivière', 'Jusqu\'à 8 personnes', 'Petit-déjeuner buffet mentionné'],
    tags:              ['famille', 'chalet', 'bois', 'kitchenette', 'rivière', 'groupe', 'grand espace'],
    image:             img('Chalet'),
  },
];

console.log(`Hébergements analysés : ${HEBERGEMENTS.length}`);
HEBERGEMENTS.forEach(h => console.log(`  • [${h.type.padEnd(16)}] ${h.nom} — image: ${h.image ? 'OK' : 'NON TROUVÉE'}`));

// ─── 3. GÉNÉRATION DU CSV AIRTABLE ──────────────────────────────────────────

function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const str = Array.isArray(val) ? val.join(' | ') : String(val);
  // Entoure de guillemets si virgule, guillemet ou saut de ligne
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const CSV_COLUMNS = [
  'Nom',
  'Slug',
  'Type',
  'Surface_m2',
  'Capacite_personnes',
  'Description_LLui',
  'Description_Brute',
  'Atouts',
  'Tags',
  'Image_Principale',
  'Etablissement',
  'Ville',
  'Pays',
  'Source_URL',
  'Statut',
];

const csvRows = [CSV_COLUMNS.join(',')];

for (const h of HEBERGEMENTS) {
  const row = [
    h.nom,
    h.slug,
    h.type,
    h.surface_m2,
    h.capacite_personnes,
    h.description_llui,
    h.description_brute,
    h.atouts,
    h.tags,
    h.image,
    ETABLISSEMENT.nom,
    ETABLISSEMENT.ville,
    ETABLISSEMENT.pays,
    ETABLISSEMENT.url_source,
    'draft',
  ].map(csvEscape);
  csvRows.push(row.join(','));
}

const csvPath = path.join(__dirname, 'outputs', 'import-airtable.csv');
fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf-8');
console.log(`\nCSV Airtable → ${csvPath}  (${HEBERGEMENTS.length} lignes)`);

// ─── 4. SCHÉMA FIRESTORE — COLLECTION 'villas' ──────────────────────────────
//
// Ce fichier représente :
//   a) Le schéma de référence (types + valeurs par défaut)
//   b) Un tableau de documents prêts à importer en dev via firebase-admin

const SCHEMA_REFERENCE = {
  _description: 'Schéma de référence pour la collection Firestore "villas" — L&Lui Signature',
  _collection: 'villas',
  _environnement: 'dev',
  _genere_le: new Date().toISOString(),
  _source_scrape: ETABLISSEMENT.url_source,

  champs: {
    id:                     { type: 'string',    note: 'Auto — doc.id Firestore' },
    slug:                   { type: 'string',    note: 'URL-friendly, unique par établissement' },
    nom:                    { type: 'string',    required: true },
    type:                   { type: 'string',    enum: ['suite', 'chambre', 'bungalow', 'chalet', 'cabane', 'appartement', 'suite_familiale', 'villa'], required: true },
    etablissement_id:       { type: 'string',    note: 'Ref doc prescripteurs_partenaires', required: true },
    etablissement_nom:      { type: 'string',    note: 'Dénormalisé pour affichage rapide' },
    description_llui:       { type: 'string',    note: 'Description éditoriale L&Lui Signature', required: true },
    description_brute:      { type: 'string',    note: 'Description d\'origine scrappée' },
    atouts:                 { type: 'string[]',  note: 'Liste des points forts (max 6)' },
    tags:                   { type: 'string[]',  note: 'Tags de recherche / filtrage' },
    image_principale:       { type: 'string',    note: 'URL image principale (Firebase Storage ou CDN)' },
    images_galerie:         { type: 'string[]',  note: 'URLs galerie — max premium_nb_images' },
    surface_m2:             { type: 'number|null' },
    capacite_personnes:     { type: 'number|null' },
    prix_nuit_fcfa:         { type: 'number|null', note: 'Null si prix non public / sur devis' },
    disponible:             { type: 'boolean',   default: true },
    localisation: {
      ville:                { type: 'string',    default: 'Kribi' },
      pays:                 { type: 'string',    default: 'Cameroun' },
      coordonnees: {
        lat:                { type: 'number|null' },
        lng:                { type: 'number|null' },
      },
    },
    services_inclus:        { type: 'string[]',  note: 'Services compris dans l\'hébergement' },
    services_etablissement: { type: 'string[]',  note: 'Services globaux de l\'établissement' },
    source_url:             { type: 'string',    note: 'URL d\'origine du scrape' },
    statut:                 { type: 'string',    enum: ['actif', 'inactif', 'draft'], default: 'draft', required: true },
    created_at:             { type: 'Timestamp', note: 'Firestore ServerTimestamp' },
    updated_at:             { type: 'Timestamp', note: 'Firestore ServerTimestamp' },
    created_by:             { type: 'string',    default: 'setup-database.js' },
  },
};

// Documents prêts à insérer en dev
const DOCUMENTS_DEV = HEBERGEMENTS.map((h, index) => ({
  // L'id serait généré par Firestore — on préfixe pour le dev
  _id_suggestion: `gites-kribi-${h.slug}`,
  slug:                   h.slug,
  nom:                    h.nom,
  type:                   h.type,
  etablissement_id:       'gites-de-kribi-DEV',   // À remplacer par le vrai doc.id Firestore
  etablissement_nom:      ETABLISSEMENT.nom,
  description_llui:       h.description_llui,
  description_brute:      h.description_brute,
  atouts:                 h.atouts,
  tags:                   h.tags,
  image_principale:       h.image,
  images_galerie:         h.image ? [h.image] : [],
  surface_m2:             h.surface_m2,
  capacite_personnes:     h.capacite_personnes,
  prix_nuit_fcfa:         null,
  disponible:             true,
  localisation: {
    ville:      'Kribi',
    pays:       'Cameroun',
    coordonnees: { lat: null, lng: null },
  },
  services_inclus:        h.atouts,
  services_etablissement: ETABLISSEMENT.services_site,
  source_url:             ETABLISSEMENT.url_source,
  statut:                 'draft',
  created_at:             '__SERVER_TIMESTAMP__',
  updated_at:             '__SERVER_TIMESTAMP__',
  created_by:             'setup-database.js',
}));

const schemaOutput = {
  schema_reference: SCHEMA_REFERENCE,
  documents_dev: DOCUMENTS_DEV,
  // Résumé des index Firestore recommandés
  index_recommandes: [
    { collection: 'villas', fields: ['etablissement_id', 'statut', 'created_at'], ordre: 'ASC' },
    { collection: 'villas', fields: ['type', 'statut', 'disponible'], ordre: 'ASC' },
    { collection: 'villas', fields: ['tags', 'statut'], ordre: 'ASC', note: 'Array contains queries' },
  ],
};

const schemaPath = path.join(__dirname, 'outputs', 'schema-firestore-villas.json');
fs.writeFileSync(schemaPath, JSON.stringify(schemaOutput, null, 2), 'utf-8');
console.log(`Schéma Firestore  → ${schemaPath}  (${DOCUMENTS_DEV.length} docs prêts)`);

// ─── 5. RÉSUMÉ CONSOLE ───────────────────────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  RÉSUMÉ — Setup Database Les Gîtes de Kribi');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Établissement  : ${ETABLISSEMENT.nom}`);
console.log(`  Ville / Pays   : ${ETABLISSEMENT.ville}, ${ETABLISSEMENT.pays}`);
console.log(`  Hébergements   : ${HEBERGEMENTS.length}`);
console.log(`  Services site  : ${ETABLISSEMENT.services_site.length}`);
console.log('\n  Fichiers générés :');
console.log(`    ✔  outputs/import-airtable.csv`);
console.log(`    ✔  outputs/schema-firestore-villas.json`);
console.log('\n  Prochaines étapes :');
console.log('    1. Importer le CSV dans Airtable (Import → CSV)');
console.log('    2. Créer le doc prescripteur "gites-de-kribi" dans Firestore');
console.log('    3. Remplacer etablissement_id dans schema-firestore-villas.json');
console.log('    4. Insérer les docs dev via firebase-admin ou la console Firestore');
console.log('    5. Déployer les index : firebase deploy --only firestore:indexes');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
