import { PLANS, type PlanId, type PlanPermissions } from './plans'

/**
 * Fallback : retourne les permissions depuis lib/plans.ts si Firestore est indisponible
 */
export function getDefaultPermissions(plan: PlanId): PlanPermissions {
  return PLANS[plan]?.permissions ?? PLANS['essentiel'].permissions
}
