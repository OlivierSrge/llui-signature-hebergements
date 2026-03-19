// ============================================================
// lib/devisDefaults.ts — Source de vérité du module Devis Mariage
// L&Lui Signature — Générateur de Propositions Commerciales
// ============================================================

export const LLUI_CONFIG = {
  enseigne: 'L&Lui Signature',
  slogan: 'Organisation de mariages haut de gamme',
  adresse: 'Kribi, Cameroun',
  telephone: '+237 693 407 964',
  email: 'contact@l-et-lui.com',
  site: 'http://l-et-lui.com',
  niu: 'M052517752316N',
  rccm: 'RC/BWA/2025/B/32',
  honoraires: 0.10,
  paiement: {
    cameroun: { banque: 'BICEC', iban: 'CM21 1000 1068 2171 1707 2100 140' },
    france: { banque: 'Revolut', iban: 'FR76 2823 3000 0131 1988 8000' },
    om: '693407964',
    revolut: 'https://revolut.me/olivieqf4i',
  },
  echeancier: [
    { label: 'À la signature du contrat', pourcentage: 30 },
    { label: 'À J-60 avant l\'événement', pourcentage: 40 },
    { label: 'À J-30 avant l\'événement', pourcentage: 30 },
  ],
}

export const PACKS = {
  PERLE: {
    nom: 'PERLE', couleur: '#E8E0D0', emoji: '🤍',
    description: 'L\'élégance essentielle pour un mariage intimiste et raffiné',
    invites: 100, traiteur: 'N2', decoration: 'N2', multimedia: 'N2',
    services: ['Menu Standard', 'Décoration Basique', 'Photographe 4h', 'DJ', 'Coordination', 'Voiture Mariés'],
    prixBase: 2500000,
  },
  SAPHIR: {
    nom: 'SAPHIR', couleur: '#B8C4D4', emoji: '💙',
    description: 'Une célébration lumineuse avec des prestations soignées',
    invites: 150, traiteur: 'N3', decoration: 'N3', multimedia: 'N3',
    services: ['Menu Premium', 'Décoration Élaborée', 'Photographe Journée', 'Vidéographe', 'DJ', 'Coordination', 'Voiture Mariés', 'Photobooth'],
    prixBase: 4500000,
  },
  EMERAUDE: {
    nom: 'ÉMERAUDE', couleur: '#A8C4A8', emoji: '💚',
    description: 'Le prestige d\'un mariage d\'exception avec des détails sublimes',
    invites: 200, traiteur: 'N4', decoration: 'N4', multimedia: 'N4',
    services: ['Menu Premium', 'Décoration Luxe', 'Duo Photo/Vidéo 4K', 'Drone', 'Orchestre Live', 'Coordination Premium', 'Voiture Prestige', 'Feux d\'Artifice', 'Chaises Chiavari'],
    prixBase: 8000000,
  },
  DIAMANT: {
    nom: 'DIAMANT', couleur: '#D4AF37', emoji: '💎',
    description: 'L\'excellence absolue — une expérience unique et inoubliable',
    invites: 300, traiteur: 'N6', decoration: 'N6', multimedia: 'N6',
    services: ['Menu Luxe Gastronomique', 'Décoration Immersive Sur Mesure', 'Duo Photo/Vidéo 4K Cinématique', 'Drone', 'Orchestre Live', 'Feux d\'Artifice', 'Coordination Exclusive', 'Flotte Véhicules Prestige', 'Chaises Chiavari Or', 'Cadeaux Invités', 'Conciergerie Beauté'],
    prixBase: 15000000,
  },
} as const

export type PackKey = keyof typeof PACKS

export const CATALOGUE = {
  traiteur: {
    produits: [
      { id: 'R1', nom: 'Ndolé Traditionnel (Crevettes grises)', prix_kg: 4000, prestige: 1 },
      { id: 'R2', nom: 'Bar Sauvage (Entier/Pavé)', prix_kg: 5000, prestige: 3 },
      { id: 'R3', nom: 'Cœur de Capitaine Premium', prix_kg: 8000, prestige: 5 },
      { id: 'R4', nom: 'Gambas Royales (10/15)', prix_kg: 10000, prestige: 6 },
      { id: 'R5', nom: 'Langoustines Prestige', prix_kg: 15000, prestige: 7 },
    ],
    cdc: [
      'N2: Buffet assisté, dressage soigné, 1 serveur/20 personnes',
      'N3: Service mixte, dressage signature, Maîtres d\'hôtel',
      'N4: Service à l\'assiette, nappage damassé, 1 serveur/15 personnes',
      'N6: Excellence gants blancs, cristal, menu dégustation sur mesure',
    ],
  },
  decoration: {
    nuances: [
      { id: 'D1', nom: 'Gris & Blanc', prestige: 2 },
      { id: 'D2', nom: 'Terracotta & Ivory', prestige: 4 },
      { id: 'D3', nom: 'Gold & Royal Chic', prestige: 7 },
    ],
    cdc: [
      'N2: Nappage gris/blanc, chemins de table soignés',
      'N3: Thème Terracotta, fleurs fraîches (30%), éclairage doux',
      'N4: Éclairage LED architectural, centres de table surélevés',
      'N6: Immersion totale, plafond floral, design sur mesure exclusif',
    ],
  },
  optionsALaCarte: [
    { nom: 'Invité supplémentaire', prix: 15000, unite: 'par personne' },
    { nom: 'Photographe vidéo supplémentaire', prix: 750000, unite: 'forfait' },
    { nom: 'Drone seul', prix: 300000, unite: 'forfait' },
    { nom: 'Feux d\'artifice', prix: 900000, unite: 'forfait' },
    { nom: 'Orchestre live', prix: 1500000, unite: 'forfait' },
    { nom: 'Gâteau de mariage 3 étages', prix: 300000, unite: 'forfait' },
    { nom: 'Photobooth', prix: 300000, unite: 'forfait' },
    { nom: 'Voiture prestige', prix: 300000, unite: 'forfait' },
    { nom: 'Chaises Chiavari (100 unités)', prix: 200000, unite: 'forfait' },
    { nom: 'Cadeaux invités', prix: 5000, unite: 'par personne' },
  ],
  optionsBoutique: [
    { nom: 'Vins de Bordeaux', prix: 300000 },
    { nom: 'Champagne Premium', prix: 500000 },
    { nom: 'Bar à Cocktails', prix: 400000 },
    { nom: 'Spiritueux Sélection', prix: 250000 },
    { nom: 'Bar Ouvert Soirée', prix: 900000 },
  ],
}

export const INTRODUCTIONS: Record<string, string> = {
  PERLE: `Madame, Monsieur,\n\nC'est avec une immense joie que nous accueillons votre projet de mariage au sein de la famille L&Lui Signature. Votre union mérite une célébration à votre image — intime, chaleureuse et profondément authentique.\n\nNous avons imaginé pour vous une expérience raffinée où chaque détail est pensé avec soin, où vos proches se sentent accueillis avec amour, et où vos souvenirs seront gravés pour toujours dans les cœurs.\n\nLe Pack PERLE a été conçu pour les couples qui chérissent l'élégance dans la simplicité — une beauté tranquille qui n'a pas besoin d'en faire trop pour émouvoir.`,
  SAPHIR: `Madame, Monsieur,\n\nVotre mariage sera un moment de lumière pure — l'éclat d'une journée où tout brille, où chaque rire résonne et où l'amour se célèbre avec éclat.\n\nL&Lui Signature vous propose une expérience soignée dans ses moindres détails, portée par une équipe passionnée qui mettra toute son expertise à votre service pour faire de ce jour une symphonie parfaite.\n\nLe Pack SAPHIR est la promesse d'une célébration lumineuse, d'un service attentionné et de prestations qui sublimeront chaque instant de votre grand jour.`,
  EMERAUDE: `Madame, Monsieur,\n\nVotre mariage sera bien plus qu'une cérémonie — ce sera un événement dont vos invités parleront longtemps, une expérience sensorielle complète où le prestige se mêle à l'émotion la plus sincère.\n\nL&Lui Signature vous offre le meilleur de son savoir-faire avec le Pack ÉMERAUDE — une composition d'exception pensée pour les couples qui refusent de faire des compromis sur la beauté et la qualité.\n\nChaque prestation a été sélectionnée avec rigueur pour créer une cohérence parfaite, une harmonie visuelle et émotionnelle qui transformera votre journée en œuvre d'art vivante.`,
  DIAMANT: `Madame, Monsieur,\n\nIl existe des mariages que l'on n'oublie jamais. Des célébrations qui transcendent l'ordinaire et entrent dans la légende. C'est exactement ce que L&Lui Signature s'engage à créer pour vous avec le Pack DIAMANT.\n\nDans un monde où tout est possible, nous choisissons l'excellence absolue. Chaque prestataire, chaque détail, chaque instant de votre journée sera orchestré avec la précision d'un chef-d'œuvre, la chaleur d'une attention portée à chaque invité.\n\nVous ne méritez rien de moins que l'extraordinaire. Et c'est exactement ce que vous aurez.`,
}

// ── Helpers ──────────────────────────────────────────────────

export function generateDevisRef(): string {
  const year = new Date().getFullYear()
  const num = String(Math.floor(10000 + Math.random() * 90000))
  return `LLUI-DEV-${year}-${num}`
}

export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA'
}

// Retourne le CDC traiteur correspondant au niveau du pack
export function getCdcTraiteur(niveau: string): string {
  return CATALOGUE.traiteur.cdc.find((c) => c.startsWith(niveau)) || ''
}

export function getCdcDecoration(niveau: string): string {
  return CATALOGUE.decoration.cdc.find((c) => c.startsWith(niveau)) || ''
}

// Type complet du formulaire devis
export interface DevisFormData {
  // Étape 1
  prenomMarie: string
  nomMarie: string
  prenomMariee: string
  nomMariee: string
  telephone: string
  email: string
  dateEvenement: string
  ville: string
  nombreInvites: number
  // Étape 2
  pack: PackKey | null
  // Étape 3
  lieuCeremonie: string
  prixLieuCeremonie: number
  lieuReception: string
  prixLieuReception: number
  optionsSelectionnees: string[]     // noms des options à la carte
  optionsBoutiqueSelectionnees: string[] // noms des options boutique
  // Étape 4
  notes: string
  variantesIncluses: ('confort' | 'equilibre' | 'prestige')[]
}

export const DEVIS_FORM_DEFAULT: DevisFormData = {
  prenomMarie: '', nomMarie: '',
  prenomMariee: '', nomMariee: '',
  telephone: '', email: '',
  dateEvenement: '', ville: '',
  nombreInvites: 150,
  pack: null,
  lieuCeremonie: '', prixLieuCeremonie: 0,
  lieuReception: '', prixLieuReception: 0,
  optionsSelectionnees: [],
  optionsBoutiqueSelectionnees: [],
  notes: '',
  variantesIncluses: ['equilibre'],
}

// Calcul des totaux
export function calculerTotaux(form: DevisFormData) {
  const pack = form.pack ? PACKS[form.pack] : null
  const prixBase = pack?.prixBase || 0

  const totalLieux = (form.prixLieuCeremonie || 0) + (form.prixLieuReception || 0)

  const totalOptions = CATALOGUE.optionsALaCarte
    .filter((o) => form.optionsSelectionnees.includes(o.nom))
    .reduce((sum, o) => sum + o.prix, 0)

  const sousTotalPrestations = prixBase + totalLieux + totalOptions
  const honoraires = Math.round(sousTotalPrestations * LLUI_CONFIG.honoraires)
  const totalTTC = sousTotalPrestations + honoraires

  const totalBoutique = CATALOGUE.optionsBoutique
    .filter((o) => form.optionsBoutiqueSelectionnees.includes(o.nom))
    .reduce((sum, o) => sum + o.prix, 0)

  const echeancier = LLUI_CONFIG.echeancier.map((e) => ({
    ...e,
    montant: Math.round(totalTTC * e.pourcentage / 100),
  }))

  return { prixBase, totalLieux, totalOptions, sousTotalPrestations, honoraires, totalTTC, totalBoutique, echeancier }
}
