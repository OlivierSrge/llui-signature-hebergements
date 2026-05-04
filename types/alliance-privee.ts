// types/alliance-privee.ts — Module Alliance Privée L&Lui

export type AllianceCardTier = 'PRESTIGE' | 'EXCELLENCE' | 'ELITE'
export type ApplicationStatus = 'en_attente' | 'approuve' | 'refuse' | 'en_revision'
export type MatchStatus = 'propose' | 'accepte' | 'refuse' | 'expire'
export type MatchGlobalStatus = 'propose' | 'mutuel' | 'refuse' | 'expire'
export type ChatMessageStatus = 'ok' | 'bloque' | 'signale'
export type CardStatus = 'active' | 'expired' | 'suspended'
export type GenderType = 'HOMME' | 'FEMME'
export type LocationType = 'DIASPORA' | 'LOCAL'
export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'
export type PaymentMethod = 'REVOLUT' | 'ORANGE_MONEY'

// ─── Tarification bimodale genre/localisation ────────────────────────────────

export interface TierPricing {
  homme_diaspora_eur: number
  homme_local_fcfa: number
  femme_local_fcfa: number
  validite_mois: number
}

export const TIER_PRICING: Record<AllianceCardTier, TierPricing> = {
  PRESTIGE: {
    homme_diaspora_eur: 150,
    homme_local_fcfa: 50000,
    femme_local_fcfa: 10000,
    validite_mois: 6,
  },
  EXCELLENCE: {
    homme_diaspora_eur: 250,
    homme_local_fcfa: 100000,
    femme_local_fcfa: 25000,
    validite_mois: 12,
  },
  ELITE: {
    homme_diaspora_eur: 500,
    homme_local_fcfa: 200000,
    femme_local_fcfa: 50000,
    validite_mois: 12,
  },
}

export function getPrixPourProfil(
  tier: AllianceCardTier,
  gender: GenderType,
  location: LocationType
): { montant: number; devise: 'EUR' | 'FCFA'; methode: PaymentMethod } {
  const pricing = TIER_PRICING[tier]
  if (gender === 'HOMME') {
    if (location === 'DIASPORA') {
      return { montant: pricing.homme_diaspora_eur, devise: 'EUR', methode: 'REVOLUT' }
    }
    return { montant: pricing.homme_local_fcfa, devise: 'FCFA', methode: 'ORANGE_MONEY' }
  }
  return { montant: pricing.femme_local_fcfa, devise: 'FCFA', methode: 'ORANGE_MONEY' }
}

// ─── Paiement (nouvelle collection) ──────────────────────────────────────────

export interface AlliancePayment {
  id: string
  tier: AllianceCardTier
  gender: GenderType
  location: LocationType
  partenaire_id: string
  montant: number
  devise: 'EUR' | 'FCFA'
  methode: PaymentMethod
  proof_url: string
  statut: PaymentStatus
  date_creation: string
  verified_by?: string
  date_verification?: string
  rejection_reason?: string
}

// ─── Partenaire Alliance ──────────────────────────────────────────────────────

export interface AlliancePartner {
  id: string
  partenaire_id: string           // ref prescripteurs_partenaires
  nom_etablissement: string
  alliance_active: boolean
  prix_prestige_fcfa: number
  prix_excellence_fcfa: number
  prix_elite_fcfa: number
  revolut_link_prestige?: string
  revolut_link_excellence?: string
  revolut_link_elite?: string
  description_club?: string       // texte d'accroche personnalisé
  created_at: string
  updated_at: string
}

// ─── Carte Membre ─────────────────────────────────────────────────────────────

export interface AllianceMemberCard {
  id: string
  tier: AllianceCardTier
  portrait_id: string             // ref alliance_privee_portraits_verified
  partenaire_id: string
  card_number: string             // ex: AP-2026-00042
  activated_at: string
  expires_at: string
  status: CardStatus
  prix_paye_fcfa: number
  revolut_payment_ref?: string
  created_at: string
}

// ─── Candidature ─────────────────────────────────────────────────────────────

export interface AllianceApplication {
  id: string
  partenaire_id: string
  tier_souhaite: AllianceCardTier
  status: ApplicationStatus
  // Profil tarification
  gender: GenderType
  location: LocationType
  payment_id?: string             // ref alliance_privee_payments
  payment_proof_verified: boolean
  charte_acceptee: boolean
  charte_date_acceptation?: string
  // Portrait
  prenom: string
  age: number
  ville: string
  profession: string
  photo_url?: string
  bio: string
  valeurs: string[]
  loisirs: string[]
  recherche: string
  genre: 'homme' | 'femme' | 'autre'
  genre_recherche: 'homme' | 'femme' | 'les deux'
  // Contact (confidentiel, admin seulement)
  telephone: string
  email?: string
  // Modération
  moderateur_notes?: string
  traite_par?: string
  traite_at?: string
  created_at: string
  updated_at: string
}

// ─── Portrait Vérifié (publié) ────────────────────────────────────────────────

export interface AlliancePortraitVerified {
  id: string
  application_id: string
  partenaire_id: string
  tier: AllianceCardTier
  card_id: string
  prenom: string
  age: number
  ville: string
  profession: string
  photo_url?: string
  bio: string
  valeurs: string[]
  loisirs: string[]
  recherche: string
  genre: 'homme' | 'femme' | 'autre'
  genre_recherche: 'homme' | 'femme' | 'les deux'
  actif: boolean
  created_at: string
  updated_at: string
}

// ─── Match ────────────────────────────────────────────────────────────────────

export interface AllianceMatch {
  id: string
  portrait_a_id: string
  portrait_b_id: string
  partenaire_id: string
  score_compatibilite: number     // 0-100
  status_a: MatchStatus
  status_b: MatchStatus
  global_status: MatchGlobalStatus
  created_at: string
  updated_at: string
  expires_at: string              // 7j par défaut
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface AlliancePrivateChat {
  id: string
  match_id: string
  participant_a_id: string
  participant_b_id: string
  partenaire_id: string
  last_message_at?: string
  message_count: number
  created_at: string
}

export interface AllianceChatMessage {
  id: string
  chat_id: string
  sender_id: string
  content: string
  status: ChatMessageStatus
  blocked_reason?: string         // raison du blocage par sentinelle
  created_at: string
}

// ─── Carte + Portrait fusionnés (pour affichage) ─────────────────────────────

export interface CardDetails {
  // Carte
  card_id: string
  card_number: string
  tier: AllianceCardTier
  status: CardStatus
  activated_at: string
  expires_at: string
  prix_paye_fcfa: number
  partenaire_id: string
  // Portrait
  prenom: string
  age: number
  ville: string
  profession: string
  photo_url?: string
  // Partenaire
  nom_etablissement: string
}

// ─── Configs UI ──────────────────────────────────────────────────────────────

export interface TierConfig {
  label: string
  emoji: string
  tagline: string
  color: string                   // couleur principale hex
  gradient: string                // Tailwind gradient classes
  border: string                  // Tailwind border classes
  badge: string                   // Tailwind badge classes
  prix_defaut_fcfa: number
  prix_eur: number                // tarif en euros (paiement Revolut)
  avantages: string[]
}

export const TIER_CONFIGS: Record<AllianceCardTier, TierConfig> = {
  PRESTIGE: {
    label: 'Prestige',
    emoji: '✦',
    tagline: 'L\'accès au cercle sélectif',
    color: '#C9A84C',
    gradient: 'from-amber-950 via-amber-900 to-amber-950',
    border: 'border-amber-500/40',
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    prix_defaut_fcfa: 50000,
    prix_eur: 150,
    avantages: [
      'Accès au club Alliance Privée',
      'Portrait vérifié publié',
      'Jusqu\'à 3 propositions de rencontres / mois',
      'Chat privé sécurisé',
      'Durée de validité 3 mois',
    ],
  },
  EXCELLENCE: {
    label: 'Excellence',
    emoji: '◈',
    tagline: 'Le prestige de l\'exclusivité',
    color: '#E8E8E8',
    gradient: 'from-slate-900 via-slate-800 to-slate-900',
    border: 'border-slate-400/40',
    badge: 'bg-slate-400/20 text-slate-200 border border-slate-400/30',
    prix_defaut_fcfa: 100000,
    prix_eur: 250,
    avantages: [
      'Tout Prestige +',
      'Jusqu\'à 8 propositions de rencontres / mois',
      'Score de compatibilité avancé',
      'Priorité dans les propositions',
      'Durée de validité 6 mois',
    ],
  },
  ELITE: {
    label: 'Élite',
    emoji: '♛',
    tagline: 'Le sommet de l\'Alliance',
    color: '#B9F2FF',
    gradient: 'from-black via-purple-950 to-black',
    border: 'border-purple-400/40',
    badge: 'bg-purple-500/20 text-purple-200 border border-purple-400/30',
    prix_defaut_fcfa: 200000,
    prix_eur: 500,
    avantages: [
      'Tout Excellence +',
      'Propositions illimitées',
      'Accès prioritaire aux événements L&Lui',
      'Accompagnement personnalisé',
      'Durée de validité 12 mois',
    ],
  },
}

// ─── Sentinelle IA — patterns de blocage ──────────────────────────────────────

export const SENTINELLE_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  // Numéros de téléphone (chiffres)
  {
    regex: /\b(0|\+?2\d{2})[\s\.\-\/]?[567]\d[\s\.\-\/]?\d{2}[\s\.\-\/]?\d{2}[\s\.\-\/]?\d{2}\b/i,
    reason: 'numéro de téléphone détecté',
  },
  // Numéros écrits en lettres (français)
  {
    regex: /\b(z[eé]ro|un|deux|trois|quatre|cinq|six|sept|huit|neuf)\s+(z[eé]ro|un|deux|trois|quatre|cinq|six|sept|huit|neuf)/i,
    reason: 'numéro de téléphone en lettres détecté',
  },
  // Réseaux sociaux
  {
    regex: /\b(instagram|insta|facebook|fb|whatsapp|wapp|wa|snapchat|snap|twitter|tiktok|tik[\s\-]?tok|telegram|tg|linkedin|signal|viber|wechat)\b/i,
    reason: 'mention réseau social détectée',
  },
  // Adresses email
  {
    regex: /[a-zA-Z0-9._%+\-]+\s*@\s*[a-zA-Z0-9.\-]+\s*\.\s*[a-zA-Z]{2,}/,
    reason: 'adresse email détectée',
  },
  // Arobase seul avec tentative de camouflage
  {
    regex: /\b(at|arrob|arobas|arobase)\b/i,
    reason: 'tentative de partage d\'email détectée',
  },
  // Chiffres dissimulés avec séparateurs variés
  {
    regex: /\d[\s\.\-_,]{0,2}\d[\s\.\-_,]{0,2}\d[\s\.\-_,]{0,2}\d[\s\.\-_,]{0,2}\d[\s\.\-_,]{0,2}\d[\s\.\-_,]{0,2}\d[\s\.\-_,]{0,2}\d/,
    reason: 'séquence numérique suspecte détectée',
  },
]

export function analyserMessageSentinelle(content: string): { ok: boolean; reason?: string } {
  for (const { regex, reason } of SENTINELLE_PATTERNS) {
    if (regex.test(content)) {
      return { ok: false, reason }
    }
  }
  return { ok: true }
}
