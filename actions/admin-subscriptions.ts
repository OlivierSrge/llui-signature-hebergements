'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import { PLANS, type PlanId } from '@/lib/plans'

export interface PlanConfig {
  id: string
  name: string
  description: string
  color: string
  badge?: string
  price_monthly: number
  price_quarterly: number
  price_annual: number
  commission_rate: number
  reversement_delay_days: number
  max_accommodations: number
  max_concurrent_reservations: number
  is_active: boolean
  is_recommended: boolean
  features: Record<string, boolean>
}

/** Retourne la config d'un plan depuis Firestore, avec fallback vers lib/plans.ts */
export async function getPlanConfig(planId: PlanId): Promise<PlanConfig> {
  const snap = await db.collection('settings').doc('subscriptionPlans').collection('plans').doc(planId).get()
  const plan = PLANS[planId]
  const defaults: PlanConfig = {
    id: planId,
    name: plan.name,
    description: plan.description,
    color: plan.color,
    badge: plan.badge,
    price_monthly: plan.price,
    price_quarterly: Math.round(plan.price * 3 * 0.9),
    price_annual: Math.round(plan.price * 12 * 0.8),
    commission_rate: plan.commissionRate,
    reversement_delay_days: 5,
    max_accommodations: plan.permissions.maxAccommodations === -1 ? 999 : plan.permissions.maxAccommodations,
    max_concurrent_reservations: -1,
    is_active: true,
    is_recommended: plan.badge === 'Populaire',
    features: plan.permissions as unknown as Record<string, boolean>,
  }
  if (!snap.exists) return defaults
  return { ...defaults, ...(snap.data() as Partial<PlanConfig>) }
}

export async function getAllPlanConfigs(): Promise<PlanConfig[]> {
  const planIds: PlanId[] = ['essentiel', 'starter', 'pro', 'premium']
  return Promise.all(planIds.map(getPlanConfig))
}

/** Sauvegarde les paramètres financiers/capacité d'un plan */
export async function savePlanConfig(
  planId: string,
  data: Partial<PlanConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString()
    // Log historique
    await db.collection('settings').doc('subscriptionPlans')
      .collection('history').add({
        planId,
        changes: data,
        changedAt: now,
        changedBy: 'admin',
      })
    await db.collection('settings').doc('subscriptionPlans')
      .collection('plans').doc(planId).set(
        { ...data, updatedAt: now },
        { merge: true }
      )
    revalidatePath('/admin/abonnements')
    revalidatePath('/partenaire/upgrade')
    revalidatePath('/partenaire/dashboard')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/** Sauvegarde les features (permissions) d'un plan */
export async function savePlanFeatures(
  planId: string,
  features: Record<string, boolean | number>
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString()
    await db.collection('settings').doc('subscriptionPlans')
      .collection('history').add({
        planId,
        changes: { features },
        changedAt: now,
        changedBy: 'admin',
      })
    await db.collection('settings').doc('subscriptionPlans')
      .collection('plans').doc(planId).set(
        { features, updatedAt: now },
        { merge: true }
      )
    revalidatePath('/admin/abonnements')
    revalidatePath('/partenaire/upgrade')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/** Crée une nouvelle formule */
export async function createPlan(
  data: Omit<PlanConfig, 'id'> & { id: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString()
    await db.collection('settings').doc('subscriptionPlans')
      .collection('plans').doc(data.id).set({ ...data, createdAt: now, updatedAt: now })
    revalidatePath('/admin/abonnements')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/** Récupère l'historique des modifications */
export async function getPlanHistory() {
  const snap = await db.collection('settings').doc('subscriptionPlans')
    .collection('history')
    .orderBy('changedAt', 'desc')
    .limit(50)
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
}
