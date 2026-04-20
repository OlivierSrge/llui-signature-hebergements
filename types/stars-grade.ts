export type StarsGrade =
  | 'START'
  | 'BRONZE'
  | 'ARGENT'
  | 'OR'
  | 'SAPHIR'
  | 'DIAMANT'

export interface GradeConfig {
  label: string
  emoji: string
  minStars: number
  maxStars: number | null
  color: string
  bgGradient: string
  textColor: string
  textSecondary: string
  borderColor: string
  qrFgColor: string
  qrBgColor: string
  welcomeMessage: string
  specialEffect: string
  nextGrade: StarsGrade | null
  nextThreshold: number | null
}

export const GRADE_CONFIGS: Record<StarsGrade, GradeConfig> = {
  START: {
    label: 'Membre',
    emoji: '🌟',
    minStars: 0,
    maxStars: 99,
    color: '#888888',
    bgGradient: 'linear-gradient(135deg, #F5F0E8 0%, #E8E0D0 100%)',
    textColor: '#1A1A1A',
    textSecondary: '#6B7280',
    borderColor: '#D1C4A8',
    qrFgColor: '#1A1A1A',
    qrBgColor: '#FFFFFF',
    welcomeMessage: 'Bienvenue dans le programme L&Lui Stars',
    specialEffect: '',
    nextGrade: 'BRONZE',
    nextThreshold: 100,
  },
  BRONZE: {
    label: 'Bronze',
    emoji: '🥉',
    minStars: 100,
    maxStars: 499,
    color: '#CD7F32',
    bgGradient: 'linear-gradient(135deg, #CD7F32 0%, #A0522D 50%, #CD7F32 100%)',
    textColor: '#FFFFFF',
    textSecondary: '#FFE4CC',
    borderColor: '#A0522D',
    qrFgColor: '#3D1A00',
    qrBgColor: '#FFF5EC',
    welcomeMessage: 'Membre Bronze — Vous progressez !',
    specialEffect: 'bronze-shimmer',
    nextGrade: 'ARGENT',
    nextThreshold: 500,
  },
  ARGENT: {
    label: 'Argent',
    emoji: '🥈',
    minStars: 500,
    maxStars: 1999,
    color: '#A8A9AD',
    bgGradient: 'linear-gradient(135deg, #E8E8E8 0%, #A8A9AD 50%, #E8E8E8 100%)',
    textColor: '#1A1A1A',
    textSecondary: '#4A4A4A',
    borderColor: '#909090',
    qrFgColor: '#1A1A1A',
    qrBgColor: '#F8F8F8',
    welcomeMessage: 'Membre Argent — Statut reconnu ✦',
    specialEffect: 'silver-shine',
    nextGrade: 'OR',
    nextThreshold: 2000,
  },
  OR: {
    label: 'Or',
    emoji: '✦',
    minStars: 2000,
    maxStars: 4999,
    color: '#C9A84C',
    bgGradient: 'linear-gradient(135deg, #C9A84C 0%, #F5D17A 40%, #C9A84C 70%, #A07830 100%)',
    textColor: '#FFFFFF',
    textSecondary: '#FFF5CC',
    borderColor: '#C9A84C',
    qrFgColor: '#3D2800',
    qrBgColor: '#FFFBF0',
    welcomeMessage: 'Membre Or — Excellence reconnue ✦',
    specialEffect: 'gold-glow',
    nextGrade: 'SAPHIR',
    nextThreshold: 5000,
  },
  SAPHIR: {
    label: 'Saphir',
    emoji: '💎',
    minStars: 5000,
    maxStars: 9999,
    color: '#0F52BA',
    bgGradient: 'linear-gradient(135deg, #0F3460 0%, #0F52BA 50%, #0F3460 100%)',
    textColor: '#FFFFFF',
    textSecondary: '#B8D4FF',
    borderColor: '#0F52BA',
    qrFgColor: '#001A3D',
    qrBgColor: '#F0F5FF',
    welcomeMessage: 'Membre Saphir — Prestige & Privilèges 💎',
    specialEffect: 'sapphire-stars',
    nextGrade: 'DIAMANT',
    nextThreshold: 10000,
  },
  DIAMANT: {
    label: 'Diamant',
    emoji: '👑',
    minStars: 10000,
    maxStars: null,
    color: '#B9F2FF',
    bgGradient: 'linear-gradient(135deg, #1A1A2E 0%, #4A0E8F 40%, #1A1A2E 70%, #6C3483 100%)',
    textColor: '#FFFFFF',
    textSecondary: '#B9F2FF',
    borderColor: '#B9F2FF',
    qrFgColor: '#1A1A1A',
    qrBgColor: '#FAF5FF',
    welcomeMessage: '👑 Membre Diamant — L\'Excellence Absolue',
    specialEffect: 'diamond-prism',
    nextGrade: null,
    nextThreshold: null,
  },
}

export function getGradeFromStars(totalStars: number): StarsGrade {
  if (totalStars >= 10000) return 'DIAMANT'
  if (totalStars >= 5000) return 'SAPHIR'
  if (totalStars >= 2000) return 'OR'
  if (totalStars >= 500) return 'ARGENT'
  if (totalStars >= 100) return 'BRONZE'
  return 'START'
}

export function getProgressToNextGrade(totalStars: number): number {
  const grade = getGradeFromStars(totalStars)
  const config = GRADE_CONFIGS[grade]
  if (!config.nextThreshold) return 100
  const progress =
    ((totalStars - config.minStars) / (config.nextThreshold - config.minStars)) * 100
  return Math.min(Math.round(progress), 100)
}
