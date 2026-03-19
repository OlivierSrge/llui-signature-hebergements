// ============================================================
// Fonctions utilitaires fidélité — avec Firestore + fallback
// ============================================================
import { db } from '@/lib/firebase'
import { LOYALTY_LEVELS, PROMO_CODE_DEFAULTS, LOYALTY_DEFAULTS } from './loyaltyDefaults'

// Calcule le niveau selon le nombre de séjours.
// Charge depuis Firestore /settings/loyaltyLevels avec fallback LOYALTY_LEVELS.
export async function calculateLoyaltyLevel(staysCount: number): Promise<string> {
  try {
    const doc = await db.collection('settings').doc('loyaltyLevels').get()
    const levels = doc.exists ? (doc.data() as any) : LOYALTY_LEVELS
    if (staysCount >= (levels.excellence?.minStays ?? 13)) return 'excellence'
    if (staysCount >= (levels.ambassadeur?.minStays ?? 7)) return 'ambassadeur'
    if (staysCount >= (levels.explorateur?.minStays ?? 3)) return 'explorateur'
    return 'novice'
  } catch {
    if (staysCount >= 13) return 'excellence'
    if (staysCount >= 7) return 'ambassadeur'
    if (staysCount >= 3) return 'explorateur'
    return 'novice'
  }
}

// Génère un code promo unique au format STARS-[PREFIX]-[5 chiffres].
// Vérifie l'unicité dans la collection clients avant d'enregistrer.
export async function generatePromoCode(clientId: string, level: string): Promise<string> {
  const configDoc = await db.collection('settings').doc('loyaltyConfig').get()
  const config = configDoc.exists
    ? { ...PROMO_CODE_DEFAULTS, ...(configDoc.data() as any) }
    : PROMO_CODE_DEFAULTS

  const levelKey = level as keyof typeof PROMO_CODE_DEFAULTS.prefixes
  const prefix = config.prefixes?.[levelKey] ?? `STARS-${level.toUpperCase().slice(0, 3)}-`

  let code = ''
  let isUnique = false
  let attempts = 0

  while (!isUnique && attempts < 10) {
    const randomPart = Math.floor(10000 + Math.random() * 90000).toString()
    code = `${prefix}${randomPart}`
    const existing = await db.collection('clients')
      .where('boutiquePromoCode', '==', code)
      .limit(1)
      .get()
    isUnique = existing.empty
    attempts++
  }

  const levelData = LOYALTY_LEVELS[levelKey]
  const validityDays = levelData?.promoValidityDays ?? config.validityDays ?? 90
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + validityDays)

  await db.collection('clients').doc(clientId).update({
    boutiquePromoCode: code,
    boutiquePromoCodeExpiry: expiresAt.toISOString(),
    boutiquePromoCodeGeneratedAt: new Date().toISOString(),
    boutiquePromoCodeSentAt: null,
    updated_at: new Date().toISOString(),
  })

  return code
}

// Ajoute (ou retire si points < 0) des points avec historique sous-collection.
export async function addLoyaltyPoints(
  clientId: string,
  points: number,
  action: string,
  description: string,
  referenceId?: string
): Promise<void> {
  const clientDoc = await db.collection('clients').doc(clientId).get()
  if (!clientDoc.exists) throw new Error('Client introuvable')

  const client = clientDoc.data()!
  const currentPoints = client.totalPoints || 0
  const newTotal = Math.max(0, currentPoints + points)

  await db.collection('clients').doc(clientId).collection('pointsHistory').add({
    points,
    action,
    description,
    reference_id: referenceId || null,
    balance_before: currentPoints,
    balance_after: newTotal,
    created_at: new Date().toISOString(),
  })

  await db.collection('clients').doc(clientId).update({
    totalPoints: newTotal,
    updated_at: new Date().toISOString(),
  })
}

// Initialise les documents Firestore du programme s'ils n'existent pas.
export async function initLoyaltyFirestore(): Promise<void> {
  const configRef = db.collection('settings').doc('loyaltyConfig')
  const levelsRef = db.collection('settings').doc('loyaltyLevels')

  const [configDoc, levelsDoc] = await Promise.all([configRef.get(), levelsRef.get()])

  if (!configDoc.exists) {
    await configRef.set({ ...LOYALTY_DEFAULTS, initialized_at: new Date().toISOString() })
  }
  if (!levelsDoc.exists) {
    await levelsRef.set({ ...LOYALTY_LEVELS, initialized_at: new Date().toISOString() })
  }
}
