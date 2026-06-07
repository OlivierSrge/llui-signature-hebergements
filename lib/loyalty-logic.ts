import type { Niveau } from '@/types/loyalty'

export function determinerNiveau(points: number, niveaux: Niveau[]): string {
  for (let i = niveaux.length - 1; i >= 0; i--) {
    if (points >= niveaux[i].seuil_points) return niveaux[i].id
  }
  return niveaux[0].id
}

/**
 * Calcule les points à créditer.
 * @param montant       Montant dépensé en FCFA
 * @param tauxFcfaParPoint  FCFA nécessaires pour 1 point (défaut 10 000)
 */
export function calculerPoints(montant: number, tauxFcfaParPoint = 10000): number {
  if (tauxFcfaParPoint <= 0) return 0
  return Math.floor(montant / tauxFcfaParPoint)
}

export function calculerProgression(
  points: number,
  niveaux: Niveau[]
): {
  niveauActuel: string
  niveauProchainId?: string
  niveauProchainNom?: string
  progressionPourcent: number
  manquantPoints: number
} {
  const current = determinerNiveau(points, niveaux)
  const currentIdx = niveaux.findIndex((n) => n.id === current)

  if (currentIdx === niveaux.length - 1) {
    return { niveauActuel: current, progressionPourcent: 100, manquantPoints: 0 }
  }

  const nextNiveau = niveaux[currentIdx + 1]
  const seuilActuel = niveaux[currentIdx].seuil_points
  const plage = nextNiveau.seuil_points - seuilActuel
  const pointsApresActuel = points - seuilActuel

  return {
    niveauActuel: current,
    niveauProchainId: nextNiveau.id,
    niveauProchainNom: nextNiveau.nom,
    progressionPourcent: Math.round((pointsApresActuel / plage) * 100),
    manquantPoints: Math.max(0, nextNiveau.seuil_points - points),
  }
}

export function getNiveauData(niveauId: string, niveaux: Niveau[]): Niveau | null {
  return niveaux.find((n) => n.id === niveauId) || null
}

export const NIVEAUX_DEFAUT: Niveau[] = [
  {
    id: 'bronze',
    nom: 'BRONZE',
    couleur: '#888888',
    emoji: '🤍',
    seuil_points: 0,
    avantages: ['1 point par 10 000 FCFA', 'Menu du jour spécial'],
  },
  {
    id: 'argent',
    nom: 'ARGENT',
    couleur: '#A8A9AD',
    emoji: '🩷',
    seuil_points: 500,
    avantages: ['5% de réduction', 'Café offert'],
  },
  {
    id: 'or',
    nom: 'OR',
    couleur: '#C9A84C',
    emoji: '💎',
    seuil_points: 1000,
    avantages: ['10% de réduction', 'Repas offert à l\'anniversaire'],
  },
]
