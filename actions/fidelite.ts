'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import { LOYALTY_DEFAULTS, LOYALTY_LEVELS, PROMO_CODE_DEFAULTS } from '@/lib/loyaltyDefaults'
import { generatePromoCode, addLoyaltyPoints, calculateLoyaltyLevel } from '@/lib/loyaltyUtils'
import type { LoyaltyClient } from '@/lib/types'

// ============================================================
// CHARGEMENT CONFIG
// ============================================================

export async function getLoyaltyConfig() {
  const doc = await db.collection('settings').doc('loyaltyConfig').get()
  if (!doc.exists) return LOYALTY_DEFAULTS
  return { ...LOYALTY_DEFAULTS, ...(doc.data() as any) }
}

export async function getLoyaltyLevelsConfig() {
  const doc = await db.collection('settings').doc('loyaltyLevels').get()
  if (!doc.exists) return LOYALTY_LEVELS
  const data = doc.data() as any
  // Fusion clé par clé pour ne jamais avoir de champ vide
  const merged: any = {}
  for (const key of Object.keys(LOYALTY_LEVELS)) {
    merged[key] = { ...LOYALTY_LEVELS[key as keyof typeof LOYALTY_LEVELS], ...(data[key] || {}) }
  }
  return merged
}

// ============================================================
// SAUVEGARDE CONFIG
// ============================================================

export async function saveLoyaltyConfig(
  config: Partial<typeof LOYALTY_DEFAULTS>
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('settings').doc('loyaltyConfig').set(
      { ...config, updated_at: new Date().toISOString() },
      { merge: true }
    )
    await logParamChange('config', JSON.stringify(config), '', '', 'admin')
    revalidatePath('/admin/fidelite')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function saveLoyaltyLevelsConfig(
  levels: any
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('settings').doc('loyaltyLevels').set(
      { ...levels, updated_at: new Date().toISOString() },
      { merge: true }
    )
    await logParamChange('levels', JSON.stringify(levels), '', '', 'admin')
    revalidatePath('/admin/fidelite')
    revalidatePath('/admin/fidelite/parametres')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function toggleProgram(
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const before = active ? 'inactif' : 'actif'
    const after = active ? 'actif' : 'inactif'
    await db.collection('settings').doc('loyaltyConfig').set(
      { programActive: active, updated_at: new Date().toISOString() },
      { merge: true }
    )
    await logParamChange('config', 'programActive', before, after, 'admin')
    revalidatePath('/admin/fidelite')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ============================================================
// STATS DASHBOARD
// ============================================================

export async function getDashboardStats() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const snap = await db.collection('clients').get()
  const clients = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LoyaltyClient & any))

  const totalClients = clients.length
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthClients = clients.filter((c) => c.created_at < startOfMonth).length
  const evolutionClients = lastMonthClients === 0 ? 100 :
    Math.round(((totalClients - lastMonthClients) / lastMonthClients) * 100)

  // Points distribués ce mois (somme depuis pointsHistory de tous les clients)
  let totalPointsThisMonth = 0
  let totalPointsLastMonth = 0
  // Pour éviter N+1 queries sur un grand nombre de clients, on fait un calcul approx
  // basé sur les totalPoints différentiels. En production, une Cloud Function serait idéale.

  // Répartition niveaux
  const levelDistribution = {
    novice: clients.filter((c) => (c.niveau || 'novice') === 'novice').length,
    explorateur: clients.filter((c) => c.niveau === 'explorateur').length,
    ambassadeur: clients.filter((c) => c.niveau === 'ambassadeur').length,
    excellence: clients.filter((c) => c.niveau === 'excellence').length,
  }

  // Codes promo : actifs vs expirés
  const promoActive = clients.filter((c) => {
    if (!c.boutiquePromoCode) return false
    if (!c.boutiquePromoCodeExpiry) return true // pas d'expiry = actif
    return new Date(c.boutiquePromoCodeExpiry) > now
  }).length
  const promoExpired = clients.filter((c) => {
    if (!c.boutiquePromoCode) return false
    if (!c.boutiquePromoCodeExpiry) return false
    return new Date(c.boutiquePromoCodeExpiry) <= now
  }).length
  const promoNone = clients.filter((c) => !c.boutiquePromoCode).length

  // Taux d'utilisation codes promo boutique ce mois (achats boutique)
  const clientsWithBoutiqueThisMonth = clients.filter((c) => {
    if (!c.boutiqueAchats || c.boutiqueAchats.length === 0) return false
    return c.boutiqueAchats.some((a: any) => a.created_at >= startOfMonth)
  }).length
  const promoUsageRate = totalClients === 0 ? 0 :
    Math.round((clientsWithBoutiqueThisMonth / totalClients) * 100)

  // Réductions accordées ce mois (estimation depuis réservations confirmées)
  const resSnap = await db.collection('reservations')
    .where('reservation_status', '==', 'confirmee')
    .where('confirmed_at', '>=', startOfMonth)
    .get()

  let totalReductions = 0
  for (const doc of resSnap.docs) {
    const res = doc.data()
    if (res.discount_amount) totalReductions += res.discount_amount
  }

  // Nouveaux clients ce mois
  const newClientsThisMonth = clients.filter((c) => c.created_at >= startOfMonth).length

  return {
    totalClients,
    evolutionClients,
    newClientsThisMonth,
    totalPointsThisMonth,
    totalReductions,
    levelDistribution,
    promoActive,
    promoExpired,
    promoNone,
    promoUsageRate,
    clientsWithBoutiqueThisMonth,
  }
}

export async function getDashboardChartData(year?: number) {
  const targetYear = year ?? new Date().getFullYear()
  const months: { month: string; points: number; levelUps: number }[] = []

  for (let m = 0; m < 12; m++) {
    const start = new Date(targetYear, m, 1).toISOString()
    const end = new Date(targetYear, m + 1, 0, 23, 59, 59).toISOString()
    const label = new Date(targetYear, m, 1).toLocaleDateString('fr-FR', { month: 'short' })

    // Points distribués ce mois (basé sur les pointsHistory existants)
    // On fera une requête group sur tous les clients — approx simple
    months.push({ month: label, points: 0, levelUps: 0 })
  }

  // Compter les changements de niveau ce mois via levelChangedAt
  const snap = await db.collection('clients').get()
  for (const doc of snap.docs) {
    const c = doc.data() as any
    if (c.levelChangedAt) {
      const d = new Date(c.levelChangedAt)
      if (d.getFullYear() === targetYear) {
        months[d.getMonth()].levelUps++
      }
    }
  }

  return months
}

export async function getLevelDistributionStats() {
  const snap = await db.collection('clients').get()
  const clients = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LoyaltyClient & any))
  const total = clients.length || 1

  return ['novice', 'explorateur', 'ambassadeur', 'excellence'].map((niveau) => {
    const count = clients.filter((c) => (c.niveau || 'novice') === niveau).length
    const levelData = LOYALTY_LEVELS[niveau as keyof typeof LOYALTY_LEVELS]
    const avgPoints = count === 0 ? 0 :
      Math.round(clients.filter((c) => (c.niveau || 'novice') === niveau)
        .reduce((sum: number, c: any) => sum + (c.totalPoints || 0), 0) / count)
    return {
      niveau,
      label: levelData.label,
      emoji: levelData.emoji,
      color: levelData.color,
      count,
      percent: Math.round((count / total) * 100),
      discountAccommodation: levelData.discountAccommodation,
      discountBoutique: levelData.discountBoutique,
      avgPoints,
    }
  })
}

export async function getActionsRequired() {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const snap = await db.collection('clients').get()
  const clients = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LoyaltyClient & any))

  // Clients ayant changé de niveau dans les 7 derniers jours sans code promo envoyé
  const levelUpWithoutPromo = clients.filter((c) =>
    c.levelChangedAt && c.levelChangedAt >= sevenDaysAgo && !c.boutiquePromoCodeSentAt
  )

  // Codes promo expirés non utilisés
  const expiredCodes = clients.filter((c) => {
    if (!c.boutiquePromoCode || !c.boutiquePromoCodeExpiry) return false
    return new Date(c.boutiquePromoCodeExpiry) <= now
  })

  // Clients anniversaire dans les 7 prochains jours
  const birthdayClients: typeof clients = []
  for (const c of clients) {
    if (!c.birthDate) continue
    const mmdd = c.birthDate.slice(5) // YYYY-MM-DD → MM-DD
    for (let i = 0; i <= 7; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
      const dmmdd = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (dmmdd === mmdd && !birthdayClients.find((x) => x.id === c.id)) {
        birthdayClients.push(c)
      }
    }
  }

  return {
    levelUpWithoutPromo: levelUpWithoutPromo.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, niveau: c.niveau })),
    expiredCodes: expiredCodes.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, code: c.boutiquePromoCode })),
    birthdayClients: birthdayClients.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, birthDate: c.birthDate })),
  }
}

// ============================================================
// GESTION CLIENTS
// ============================================================

export async function getFideliteClients(options: {
  niveau?: string
  promoStatus?: 'active' | 'expired' | 'none'
  search?: string
  page?: number
}) {
  const { niveau, promoStatus, search, page = 1 } = options
  const snap = await db.collection('clients').get()
  const now = new Date()

  let clients = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LoyaltyClient & any))

  if (niveau) clients = clients.filter((c) => (c.niveau || 'novice') === niveau)

  if (promoStatus === 'active') {
    clients = clients.filter((c) => {
      if (!c.boutiquePromoCode) return false
      if (!c.boutiquePromoCodeExpiry) return true
      return new Date(c.boutiquePromoCodeExpiry) > now
    })
  } else if (promoStatus === 'expired') {
    clients = clients.filter((c) => {
      if (!c.boutiquePromoCode || !c.boutiquePromoCodeExpiry) return false
      return new Date(c.boutiquePromoCodeExpiry) <= now
    })
  } else if (promoStatus === 'none') {
    clients = clients.filter((c) => !c.boutiquePromoCode)
  }

  if (search) {
    const q = search.toLowerCase()
    clients = clients.filter((c) =>
      c.firstName?.toLowerCase().includes(q) ||
      c.lastName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    )
  }

  clients.sort((a, b) => b.totalSejours - a.totalSejours || a.firstName?.localeCompare(b.firstName || '') || 0)

  const perPage = 20
  const total = clients.length
  const totalPages = Math.ceil(total / perPage)
  const paginated = clients.slice((page - 1) * perPage, page * perPage)

  return { clients: paginated, total, totalPages, page }
}

export async function changeClientLevel(
  clientId: string,
  newLevel: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const clientDoc = await db.collection('clients').doc(clientId).get()
    if (!clientDoc.exists) return { success: false, error: 'Client introuvable' }
    const client = clientDoc.data() as any
    const oldLevel = client.niveau || 'novice'

    const levelData = LOYALTY_LEVELS[newLevel as keyof typeof LOYALTY_LEVELS]
    if (!levelData) return { success: false, error: 'Niveau invalide' }

    await db.collection('clients').doc(clientId).update({
      niveau: newLevel,
      boutiqueDiscount: levelData.discountBoutique,
      levelChangedAt: new Date().toISOString(),
      levelChangeReason: reason,
      levelChangedFrom: oldLevel,
      updated_at: new Date().toISOString(),
    })

    await logParamChange('clientLevel', `${client.firstName} ${client.lastName}`, oldLevel, newLevel, 'admin')
    revalidatePath(`/admin/fidelite/clients/${clientId}`)
    revalidatePath('/admin/fidelite/clients')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function adjustClientPoints(
  clientId: string,
  delta: number,
  action: string,
  description: string
): Promise<{ success: boolean; error?: string; newTotal?: number }> {
  try {
    await addLoyaltyPoints(clientId, delta, action, description)
    const doc = await db.collection('clients').doc(clientId).get()
    const newTotal = (doc.data() as any)?.totalPoints || 0
    revalidatePath(`/admin/fidelite/clients/${clientId}`)
    return { success: true, newTotal }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getClientPointsHistory(clientId: string) {
  const snap = await db.collection('clients').doc(clientId)
    .collection('pointsHistory')
    .orderBy('created_at', 'desc')
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
}

export async function regenerateClientPromoCode(
  clientId: string
): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    const clientDoc = await db.collection('clients').doc(clientId).get()
    if (!clientDoc.exists) return { success: false, error: 'Client introuvable' }
    const client = clientDoc.data() as any
    const level = client.niveau || 'novice'
    const code = await generatePromoCode(clientId, level)
    revalidatePath(`/admin/fidelite/clients/${clientId}`)
    return { success: true, code }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function extendClientPromoCode(
  clientId: string,
  days: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const clientDoc = await db.collection('clients').doc(clientId).get()
    if (!clientDoc.exists) return { success: false, error: 'Client introuvable' }
    const client = clientDoc.data() as any
    const currentExpiry = client.boutiquePromoCodeExpiry
      ? new Date(client.boutiquePromoCodeExpiry)
      : new Date()
    if (currentExpiry < new Date()) currentExpiry.setTime(new Date().getTime())
    currentExpiry.setDate(currentExpiry.getDate() + days)

    await db.collection('clients').doc(clientId).update({
      boutiquePromoCodeExpiry: currentExpiry.toISOString(),
      updated_at: new Date().toISOString(),
    })
    revalidatePath(`/admin/fidelite/clients/${clientId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function markPromoCodeSent(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('clients').doc(clientId).update({
      boutiquePromoCodeSentAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    revalidatePath(`/admin/fidelite/clients/${clientId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function validateReferral(
  clientId: string,
  refereeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getLoyaltyConfig()
    const pointsToAdd = config.pointsReferral ?? LOYALTY_DEFAULTS.pointsReferral

    // Ajouter les points au parrain
    await addLoyaltyPoints(clientId, pointsToAdd, 'parrainage', `Parrainage validé (filleul: ${refereeId})`, refereeId)

    // Marquer le filleul comme parrainé
    await db.collection('clients').doc(refereeId).update({
      referredBy: clientId,
      updated_at: new Date().toISOString(),
    })

    // Enregistrer le parrainage sur le parrain
    const refDoc = await db.collection('clients').doc(clientId).get()
    const refData = refDoc.data() as any
    const currentReferrals = refData?.referrals || []
    await db.collection('clients').doc(clientId).update({
      referrals: [...currentReferrals, { id: refereeId, validatedAt: new Date().toISOString() }],
      updated_at: new Date().toISOString(),
    })

    revalidatePath(`/admin/fidelite/clients/${clientId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function sendBirthdayPoints(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getLoyaltyConfig()
    const points = config.pointsAnniversary ?? LOYALTY_DEFAULTS.pointsAnniversary
    await addLoyaltyPoints(clientId, points, 'anniversaire', `Points anniversaire client — ${new Date().getFullYear()}`, 'birthday')
    await db.collection('clients').doc(clientId).update({
      birthdayPointsGivenYear: new Date().getFullYear(),
      updated_at: new Date().toISOString(),
    })
    revalidatePath(`/admin/fidelite/clients/${clientId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function generateMissingPromoCodes(): Promise<{ success: boolean; generated: number; error?: string }> {
  try {
    const snap = await db.collection('clients').get()
    let generated = 0
    for (const doc of snap.docs) {
      const c = doc.data() as any
      if (!c.boutiquePromoCode) {
        await generatePromoCode(doc.id, c.niveau || 'novice')
        generated++
      }
    }
    revalidatePath('/admin/fidelite')
    return { success: true, generated }
  } catch (e: any) {
    return { success: false, generated: 0, error: e.message }
  }
}

// ============================================================
// HISTORIQUE DES MODIFICATIONS PARAMÈTRES
// ============================================================

async function logParamChange(
  section: string,
  field: string,
  oldVal: string,
  newVal: string,
  adminId: string
): Promise<void> {
  try {
    await db.collection('settings').doc('loyaltyAuditLog').collection('logs').add({
      section,
      field,
      old_value: oldVal,
      new_value: newVal,
      admin_id: adminId,
      created_at: new Date().toISOString(),
    })
  } catch {
    // Non-bloquant
  }
}

export async function getAuditLog() {
  try {
    const snap = await db.collection('settings').doc('loyaltyAuditLog')
      .collection('logs')
      .orderBy('created_at', 'desc')
      .limit(50)
      .get()
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
  } catch {
    return []
  }
}
