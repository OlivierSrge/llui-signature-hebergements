// lib/alliance-privee-matching.ts — Moteur de compatibilité Alliance Privée

import { db } from '@/lib/firebase'

// ─── Types locaux matching ────────────────────────────────────────────────────

export interface AlliancePiliers {
  vision_geographique: 'EUROPE' | 'CAMEROUN' | 'FLEXIBLE'
  engagement: 'MARIAGE_RAPIDE' | 'MARIAGE_MOYEN_TERME' | 'CONNAITRE_DABORD' | 'PAS_PRESSE'
  style_vie: 'SPORTIF' | 'CULTUREL' | 'EQUILIBRE' | 'HOMEBODY' | 'VOYAGEUR'
  valeurs: 'FAMILLE' | 'CARRIERE' | 'EQUILIBRE' | 'LIBERTE' | 'TRADITION'
  ambition: 'ENTREPRENEURIAT' | 'CARRIERE_CORPORATIVE' | 'MULTIPLE' | 'EPANOUISSEMENT' | 'SERVICE'
}

export interface AlliancePortrait {
  id: string
  prenom: string
  age: number
  ville: string
  profession: string
  gender: 'HOMME' | 'FEMME'
  location: 'DIASPORA' | 'LOCAL'
  tier: 'PRESTIGE' | 'EXCELLENCE' | 'ELITE'
  piliers: AlliancePiliers
  photo_principale_floutee?: string
  titre_portrait?: string
  telephone?: string
  email?: string
  is_demo?: boolean
  actif?: boolean
}

export interface CompatibilityMatch {
  profile: AlliancePortrait
  score: number
  level: CompatibilityLevel
  details: CompatibilityDetails
}

export interface CompatibilityLevel {
  label: 'FAIBLE' | 'MOYEN' | 'BON' | 'EXCELLENT' | 'PARFAIT'
  color: string
  emoji: string
  tailwindColor: string
}

export interface CompatibilityDetails {
  vision_geographique: number
  engagement: number
  style_vie: number
  valeurs: number
  ambition: number
}

const COL_PORTRAITS = 'alliance_privee_portraits_verified'

// ─── Calcul de compatibilité ──────────────────────────────────────────────────

export function calculateCompatibility(
  profileA: AlliancePortrait,
  profileB: AlliancePortrait
): { score: number; details: CompatibilityDetails } {
  const details: CompatibilityDetails = {
    vision_geographique: 0,
    engagement: 0,
    style_vie: 0,
    valeurs: 0,
    ambition: 0,
  }

  // 1. VISION GÉOGRAPHIQUE (20 points)
  if (profileA.piliers.vision_geographique === profileB.piliers.vision_geographique) {
    details.vision_geographique = 20
  } else if (
    profileA.piliers.vision_geographique === 'FLEXIBLE' ||
    profileB.piliers.vision_geographique === 'FLEXIBLE'
  ) {
    details.vision_geographique = 15
  } else {
    // Europe vs Cameroun — incompatible
    details.vision_geographique = 5
  }

  // 2. NIVEAU D'ENGAGEMENT (20 points)
  const engagementMap: Record<string, number> = {
    MARIAGE_RAPIDE: 3,
    MARIAGE_MOYEN_TERME: 2,
    CONNAITRE_DABORD: 1,
    PAS_PRESSE: 0,
  }
  const diffEngagement = Math.abs(
    (engagementMap[profileA.piliers.engagement] ?? 0) -
    (engagementMap[profileB.piliers.engagement] ?? 0)
  )
  details.engagement = Math.max(0, 20 - diffEngagement * 6)

  // 3. STYLE DE VIE (20 points)
  if (profileA.piliers.style_vie === profileB.piliers.style_vie) {
    details.style_vie = 20
  } else if (
    profileA.piliers.style_vie === 'EQUILIBRE' ||
    profileB.piliers.style_vie === 'EQUILIBRE'
  ) {
    details.style_vie = 15
  } else {
    details.style_vie = 10
  }

  // 4. VALEURS (20 points)
  if (profileA.piliers.valeurs === profileB.piliers.valeurs) {
    details.valeurs = 20
  } else if (
    profileA.piliers.valeurs === 'EQUILIBRE' ||
    profileB.piliers.valeurs === 'EQUILIBRE'
  ) {
    details.valeurs = 15
  } else {
    details.valeurs = 10
  }

  // 5. AMBITION (20 points)
  if (profileA.piliers.ambition === profileB.piliers.ambition) {
    details.ambition = 20
  } else if (
    profileA.piliers.ambition === 'MULTIPLE' ||
    profileB.piliers.ambition === 'MULTIPLE'
  ) {
    details.ambition = 15
  } else {
    details.ambition = 10
  }

  const score = Math.min(
    100,
    Math.max(
      0,
      details.vision_geographique +
        details.engagement +
        details.style_vie +
        details.valeurs +
        details.ambition
    )
  )

  return { score, details }
}

export function getCompatibilityLevel(score: number): CompatibilityLevel {
  if (score >= 85)
    return {
      label: 'PARFAIT',
      color: '#C9A84C',
      emoji: '💎',
      tailwindColor: 'text-amber-400',
    }
  if (score >= 75)
    return {
      label: 'EXCELLENT',
      color: '#10B981',
      emoji: '✨',
      tailwindColor: 'text-emerald-400',
    }
  if (score >= 60)
    return {
      label: 'BON',
      color: '#3B82F6',
      emoji: '💫',
      tailwindColor: 'text-blue-400',
    }
  if (score >= 40)
    return {
      label: 'MOYEN',
      color: '#F59E0B',
      emoji: '⭐',
      tailwindColor: 'text-yellow-400',
    }
  return {
    label: 'FAIBLE',
    color: '#6B7280',
    emoji: '○',
    tailwindColor: 'text-gray-500',
  }
}

// ─── Lecture Firestore ────────────────────────────────────────────────────────

export async function getPortraitById(portraitId: string): Promise<AlliancePortrait | null> {
  const snap = await db.collection(COL_PORTRAITS).doc(portraitId).get()
  if (!snap.exists) return null
  return { id: snap.id, ...snap.data() } as AlliancePortrait
}

export async function getPortraitsByGender(
  gender: 'HOMME' | 'FEMME'
): Promise<AlliancePortrait[]> {
  const snap = await db
    .collection(COL_PORTRAITS)
    .where('gender', '==', gender)
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AlliancePortrait)
}

// ─── Algorithme de matching ───────────────────────────────────────────────────

export async function findCompatibleProfiles(
  memberId: string,
  limit: number = 10
): Promise<CompatibilityMatch[]> {
  const memberProfile = await getPortraitById(memberId)
  if (!memberProfile) throw new Error('Profil introuvable')

  const oppositeGender = memberProfile.gender === 'HOMME' ? 'FEMME' : 'HOMME'
  const allProfiles = await getPortraitsByGender(oppositeGender)

  // Exclure le membre lui-même et les profils inactifs
  const candidates = allProfiles.filter(
    (p) => p.id !== memberId && p.actif !== false
  )

  const matches: CompatibilityMatch[] = candidates
    .map((profile) => {
      const { score, details } = calculateCompatibility(memberProfile, profile)
      return {
        profile,
        score,
        level: getCompatibilityLevel(score),
        details,
      }
    })
    .filter((m) => m.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return matches
}
