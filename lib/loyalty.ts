// ============================================================
// Système de fidélité client L&Lui Stars
// ============================================================

export type NiveauId = 'novice' | 'explorateur' | 'ambassadeur' | 'excellence'

export interface NiveauBenefits {
  hebergements: string[]
  boutique: string[]
  evenementiel: string[]
  exclusifs?: string[]
}

export interface Niveau {
  id: NiveauId
  label: string
  stars: number
  emoji: string
  minSejours: number
  maxSejours: number | null
  boutiqueDiscount: number    // % de réduction boutique
  hebergementDiscount: number // % de réduction hébergements
  color: string               // couleur principale
  bgColor: string             // couleur de fond
  borderColor: string
  benefits: NiveauBenefits
}

export const NIVEAUX: Record<NiveauId, Niveau> = {
  novice: {
    id: 'novice',
    label: 'Novice',
    stars: 1,
    emoji: '⭐',
    minSejours: 0,
    maxSejours: 2,
    boutiqueDiscount: 5,
    hebergementDiscount: 5,
    color: '#8B7355',
    bgColor: '#FAF7F2',
    borderColor: '#D4C4A8',
    benefits: {
      hebergements: [
        'Code -5% sur la 2ème réservation',
        'Page de suivi réservation en temps réel',
        'QR Code d\'accès logement',
      ],
      boutique: [
        '-5% sur premier achat boutique',
        'Accès au catalogue complet',
        'Newsletter offres exclusives',
      ],
      evenementiel: [
        'Consultation gratuite 30 min avec Olivier',
        'Accès aux formules d\'entrée de gamme',
      ],
    },
  },

  explorateur: {
    id: 'explorateur',
    label: 'Explorateur',
    stars: 2,
    emoji: '⭐⭐',
    minSejours: 3,
    maxSejours: 6,
    boutiqueDiscount: 10,
    hebergementDiscount: 8,
    color: '#2E7D32',
    bgColor: '#F1F8F1',
    borderColor: '#A5D6A7',
    benefits: {
      hebergements: [
        'Réduction permanente -8% sur tous les hébergements',
        'Late check-out gratuit jusqu\'à 14h',
        'Priorité de réponse sous 2h',
        'Préférences mémorisées pour chaque séjour',
      ],
      boutique: [
        '-10% permanent sur tous les articles',
        'Accès aux ventes privées avant tout le monde',
        'Livraison prioritaire à Kribi et Yaoundé',
      ],
      evenementiel: [
        '-8% sur tous les packs mariage',
        'Invitation aux showcases et journées portes ouvertes L&Lui',
        'Accès aux prestataires partenaires à tarif préférentiel',
      ],
      exclusifs: [
        'Badge "Client Fidèle" sur sa fiche',
        'Invitation à tester les nouveaux logements en avant-première',
      ],
    },
  },

  ambassadeur: {
    id: 'ambassadeur',
    label: 'Ambassadeur',
    stars: 3,
    emoji: '⭐⭐⭐',
    minSejours: 7,
    maxSejours: 12,
    boutiqueDiscount: 15,
    hebergementDiscount: 12,
    color: '#1565C0',
    bgColor: '#F0F4FF',
    borderColor: '#90CAF9',
    benefits: {
      hebergements: [
        'Réduction permanente -12% sur tous les hébergements',
        '1 nuit offerte tous les 10 séjours',
        'Surclassement gratuit si disponible',
        'Check-in dès 10h sans supplément',
        'Annulation flexible jusqu\'à 48h avant',
      ],
      boutique: [
        '-15% permanent sur tous les articles',
        '1 article offert tous les 50 000 FCFA d\'achats',
        'Personnalisation gratuite (broderie, gravure, emballage cadeau)',
        'Accès aux packs exclusifs non listés publiquement',
      ],
      evenementiel: [
        '-12% sur tous les packs mariage et événementiel',
        'Coordination gratuite d\'une petite cérémonie (anniversaire, fiançailles)',
        'Séance photo offerte (1h avec photographe partenaire)',
        'Accès prioritaire au planning des prestataires',
      ],
      exclusifs: [
        'Contact WhatsApp direct avec Olivier',
        'Invitation aux événements et soirées L&Lui',
        'Nom mentionné dans les remerciements des événements',
      ],
    },
  },

  excellence: {
    id: 'excellence',
    label: 'Excellence',
    stars: 4,
    emoji: '👑',
    minSejours: 13,
    maxSejours: null,
    boutiqueDiscount: 20,
    hebergementDiscount: 15,
    color: '#B8860B',
    bgColor: '#FFFBF0',
    borderColor: '#F4C842',
    benefits: {
      hebergements: [
        'Réduction permanente -15% sur tous les hébergements',
        'Tarif négocié personnalisé selon historique',
        'Logements non listés publiquement accessibles',
        'Conciergerie personnalisée 24h/24',
        'Transfert aéroport inclus sur demande',
      ],
      boutique: [
        '-20% permanent sur tous les articles',
        'Commandes sur mesure à prix coûtant',
        'Livraison gratuite partout au Cameroun',
        'Accès collections privées avant lancement',
      ],
      evenementiel: [
        '-20% sur tous les packs mariage et événementiel',
        'Planning mariage offert (consultation illimitée)',
        'Accès au réseau VIP de prestataires L&Lui',
        'Invitation exclusive aux mariages L&Lui (invité d\'honneur)',
        'Co-création d\'un pack personnalisé à votre nom',
      ],
      exclusifs: [
        'Carte physique "L&Lui Excellence" nominative',
        'Rencontre annuelle avec l\'équipe L&Lui',
        'Témoignage mis en avant sur le site et réseaux sociaux',
        'Programme ambassadeur rémunéré (commissions sur parrainages)',
      ],
    },
  },
}

export const NIVEAUX_ORDER: NiveauId[] = ['novice', 'explorateur', 'ambassadeur', 'excellence']

export function getNiveauFromSejours(totalSejours: number): NiveauId {
  if (totalSejours >= 13) return 'excellence'
  if (totalSejours >= 7) return 'ambassadeur'
  if (totalSejours >= 3) return 'explorateur'
  return 'novice'
}

export function getNextNiveau(current: NiveauId): NiveauId | null {
  const idx = NIVEAUX_ORDER.indexOf(current)
  return idx < NIVEAUX_ORDER.length - 1 ? NIVEAUX_ORDER[idx + 1] : null
}

export function getProgressToNextLevel(totalSejours: number): {
  current: Niveau
  next: Niveau | null
  progressPercent: number
  sejoursToNext: number | null
} {
  const currentId = getNiveauFromSejours(totalSejours)
  const current = NIVEAUX[currentId]
  const nextId = getNextNiveau(currentId)
  const next = nextId ? NIVEAUX[nextId] : null

  if (!next) {
    return { current, next: null, progressPercent: 100, sejoursToNext: null }
  }

  const range = next.minSejours - current.minSejours
  const done = totalSejours - current.minSejours
  const progressPercent = Math.min(100, Math.round((done / range) * 100))
  const sejoursToNext = next.minSejours - totalSejours

  return { current, next, progressPercent, sejoursToNext }
}

// Points boutique : 1 000 FCFA = 10 points
export function calculatePointsFromBoutique(montantFCFA: number): number {
  return Math.floor(montantFCFA / 1000) * 10
}

// Génère un code promo boutique unique
export function generateBoutiquePromoCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'BOUTIQUE-'
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Génère un code membre unique
export function generateMemberCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'LLS-'
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
