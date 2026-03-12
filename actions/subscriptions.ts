'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import type { PlanId, SubscriptionStatus, BillingCycle } from '@/lib/plans'
import { PLANS, getPermissions } from '@/lib/plans'

type ActionResult = { success: true } | { success: false; error: string }

/** Retourne les données d'abonnement d'un partenaire */
export async function getPartnerSubscription(partnerId: string) {
  const doc = await db.collection('partenaires').doc(partnerId).get()
  if (!doc.exists) return null
  const d = doc.data()!
  return {
    partnerId,
    name: d.name as string,
    whatsapp_number: (d.whatsapp_number as string) || null,
    subscriptionPlan: (d.subscriptionPlan as PlanId) || 'essentiel',
    subscriptionStatus: (d.subscriptionStatus as SubscriptionStatus) || 'active',
    subscriptionStartDate: (d.subscriptionStartDate as string) || null,
    subscriptionEndDate: (d.subscriptionEndDate as string) || null,
    trialEndsAt: (d.trialEndsAt as string) || null,
    billingCycle: (d.billingCycle as BillingCycle) || 'monthly',
    maxAccommodations: d.maxAccommodations as number | undefined,
    commissionRate: d.commissionRate as number | undefined,
    customFeatures: (d.customFeatures as Record<string, boolean>) || {},
  }
}

/** Met à jour l'abonnement d'un partenaire */
export async function updatePartnerSubscription(
  partnerId: string,
  data: {
    subscriptionPlan: PlanId
    subscriptionStatus: SubscriptionStatus
    billingCycle: BillingCycle
    subscriptionStartDate: string
    subscriptionEndDate: string
    trialEndsAt?: string
    maxAccommodations?: number
    commissionRate?: number
  }
): Promise<ActionResult> {
  try {
    await db.collection('partenaires').doc(partnerId).update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/partenaires')
    revalidatePath(`/admin/partenaires/${partnerId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/** Vérifie et met à jour le statut si l'abonnement a expiré */
export async function checkAndUpdateExpiredSubscriptions(): Promise<number> {
  const now = new Date().toISOString()
  const snap = await db.collection('partenaires')
    .where('subscriptionStatus', 'in', ['active', 'trial'])
    .get()

  let count = 0
  for (const doc of snap.docs) {
    const d = doc.data()
    const endDate = d.subscriptionEndDate || d.trialEndsAt
    if (endDate && endDate < now) {
      await doc.ref.update({ subscriptionStatus: 'expired', updated_at: now })
      count++
    }
  }
  return count
}

/** Liste les partenaires dont l'abonnement expire dans les 7 prochains jours */
export async function getExpiringSubscriptions() {
  const now = new Date()
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const nowIso = now.toISOString()

  const snap = await db.collection('partenaires')
    .where('subscriptionStatus', 'in', ['active', 'trial'])
    .get()

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p: any) => {
      const endDate = p.subscriptionEndDate || p.trialEndsAt
      return endDate && endDate >= nowIso && endDate <= in7days
    })
    .map((p: any) => ({
      id: p.id,
      name: p.name as string,
      whatsapp_number: (p.whatsapp_number as string) || null,
      subscriptionPlan: (p.subscriptionPlan as PlanId) || 'essentiel',
      subscriptionEndDate: (p.subscriptionEndDate || p.trialEndsAt) as string,
    }))
}

/** Permissions effectives d'un partenaire.
 *  Priorité : Firestore /settings/subscriptionPlans/plans/{plan}.features
 *             → customFeatures du partenaire
 *             → PLANS[plan].permissions (lib/plans.ts)
 */
export async function getEffectivePermissions(partnerId: string) {
  const sub = await getPartnerSubscription(partnerId)
  if (!sub) return getPermissions('essentiel', 'active')

  // Base depuis lib/plans.ts selon statut
  const base = getPermissions(sub.subscriptionPlan, sub.subscriptionStatus)

  // Tentative de chargement des features depuis Firestore
  try {
    const snap = await db.collection('settings').doc('subscriptionPlans')
      .collection('plans').doc(sub.subscriptionPlan).get()
    if (snap.exists) {
      const data = snap.data()!
      if (data.features && typeof data.features === 'object') {
        const firestoreFeatures = data.features as Record<string, boolean>
        const merged = { ...base, ...firestoreFeatures }
        // Appliquer les overrides custom du partenaire par-dessus
        return sub.customFeatures ? { ...merged, ...sub.customFeatures } : merged
      }
    }
  } catch {
    // Firestore indisponible → fallback silencieux
  }

  // Fallback lib/plans.ts + overrides custom
  if (sub.customFeatures) {
    return { ...base, ...sub.customFeatures }
  }
  return base
}
