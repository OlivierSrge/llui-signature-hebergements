// lib/portailGrades.ts
// Grades du portail L&Lui Signature — système d'affiliation
// Décision validée Olivier : START → BRONZE → ARGENT → OR → SAPHIR → DIAMANT

export const PORTAIL_GRADES = ['START', 'BRONZE', 'ARGENT', 'OR', 'SAPHIR', 'DIAMANT'] as const
export type PortailGrade = typeof PORTAIL_GRADES[number]

export const GRADE_COLORS: Record<PortailGrade, string> = {
  START:   '#888888',
  BRONZE:  '#CD7F32',
  ARGENT:  '#A8A9AD',
  OR:      '#C9A84C',
  SAPHIR:  '#0F52BA',
  DIAMANT: '#B9F2FF',
}

export const GRADE_LABELS: Record<PortailGrade, string> = {
  START:   'Débutant',
  BRONZE:  'Bronze',
  ARGENT:  'Argent',
  OR:      'Or',
  SAPHIR:  'Saphir',
  DIAMANT: 'Diamant',
}

// Seuils REV lifetime pour accéder à chaque grade (définis dans calculatePayout.ts)
export const GRADE_THRESHOLDS: Record<PortailGrade, number> = {
  START:   0,
  BRONZE:  5001,
  ARGENT:  15001,
  OR:      35001,
  SAPHIR:  75001,
  DIAMANT: 150001,
}

// Note : les packs mariage (PERLE/SAPHIR/ÉMERAUDE/DIAMANT dans devisDefaults.ts)
// sont des noms de produits indépendants du système de grades portail.
