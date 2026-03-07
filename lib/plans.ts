// ============================================================
// Plans d'abonnement partenaire — L&Lui Signature
// ============================================================

export type PlanId = 'essentiel' | 'starter' | 'pro' | 'premium'
export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'expired'
export type BillingCycle = 'monthly' | 'quarterly' | 'annual'

export interface PlanPermissions {
  // Réservations
  canViewReservations: boolean
  canCreateReservations: boolean
  // Calendrier
  canViewCalendar: boolean
  canBlockDates: boolean
  // QR Codes
  canAccessQrChambre: boolean
  canAccessQrReception: boolean
  // Mini-site
  canAccessMiniSite: boolean
  canCustomizeMiniSite: boolean
  // Logements
  canAddAccommodations: boolean
  maxAccommodations: number          // -1 = illimité
  // Messagerie
  canAccessMessaging: boolean
  // Stats
  canViewBasicStats: boolean
  canViewAdvancedStats: boolean
  // Tarification
  canAccessSeasonalPricing: boolean
  // Rapports
  weeklyWhatsAppReport: boolean
  // Packs
  canAccessPacks: boolean
  // Listing
  priorityListing: boolean
  badgeExcellence: boolean
  // WhatsApp notifications
  canReceiveWhatsAppNotifications: boolean
}

export interface PlanDefinition {
  id: PlanId
  name: string
  price: number          // FCFA/mois
  commissionRate: number // %
  color: string
  badge?: string
  description: string
  permissions: PlanPermissions
}

const BASE_PERMISSIONS: PlanPermissions = {
  canViewReservations: false,
  canCreateReservations: false,
  canViewCalendar: false,
  canBlockDates: false,
  canAccessQrChambre: false,
  canAccessQrReception: false,
  canAccessMiniSite: false,
  canCustomizeMiniSite: false,
  canAddAccommodations: false,
  maxAccommodations: 0,
  canAccessMessaging: false,
  canViewBasicStats: false,
  canViewAdvancedStats: false,
  canAccessSeasonalPricing: false,
  weeklyWhatsAppReport: false,
  canAccessPacks: false,
  priorityListing: false,
  badgeExcellence: false,
  canReceiveWhatsAppNotifications: false,
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  essentiel: {
    id: 'essentiel',
    name: 'Essentiel',
    price: 0,
    commissionRate: 15,
    color: '#6B7280',
    description: 'Pour démarrer et suivre vos réservations',
    permissions: {
      ...BASE_PERMISSIONS,
      canViewReservations: true,
      canViewCalendar: true,
      canViewBasicStats: true,
      canReceiveWhatsAppNotifications: true,
      maxAccommodations: 3,
    },
  },

  starter: {
    id: 'starter',
    name: 'Starter',
    price: 15000,
    commissionRate: 12,
    color: '#C9A84C',
    description: 'Pour gérer activement vos logements',
    permissions: {
      ...BASE_PERMISSIONS,
      canViewReservations: true,
      canCreateReservations: true,
      canViewCalendar: true,
      canBlockDates: true,
      canAccessQrChambre: true,
      canAccessMessaging: true,
      canViewBasicStats: true,
      canReceiveWhatsAppNotifications: true,
      maxAccommodations: 10,
    },
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    price: 35000,
    commissionRate: 10,
    color: '#7C3AED',
    badge: 'Populaire',
    description: 'Pour développer votre activité',
    permissions: {
      ...BASE_PERMISSIONS,
      canViewReservations: true,
      canCreateReservations: true,
      canViewCalendar: true,
      canBlockDates: true,
      canAccessQrChambre: true,
      canAccessQrReception: true,
      canAccessMiniSite: true,
      canAddAccommodations: true,
      canAccessMessaging: true,
      canViewBasicStats: true,
      canViewAdvancedStats: true,
      canAccessSeasonalPricing: true,
      weeklyWhatsAppReport: true,
      canReceiveWhatsAppNotifications: true,
      maxAccommodations: 30,
    },
  },

  premium: {
    id: 'premium',
    name: 'Premium',
    price: 60000,
    commissionRate: 8,
    color: '#C9A84C',
    badge: 'Excellence',
    description: 'Pour les partenaires leaders',
    permissions: {
      ...BASE_PERMISSIONS,
      canViewReservations: true,
      canCreateReservations: true,
      canViewCalendar: true,
      canBlockDates: true,
      canAccessQrChambre: true,
      canAccessQrReception: true,
      canAccessMiniSite: true,
      canCustomizeMiniSite: true,
      canAddAccommodations: true,
      canAccessMessaging: true,
      canViewBasicStats: true,
      canViewAdvancedStats: true,
      canAccessSeasonalPricing: true,
      weeklyWhatsAppReport: true,
      canAccessPacks: true,
      priorityListing: true,
      badgeExcellence: true,
      canReceiveWhatsAppNotifications: true,
      maxAccommodations: -1,
    },
  },
}

export const PLAN_ORDER: PlanId[] = ['essentiel', 'starter', 'pro', 'premium']

/** Retourne les permissions effectives selon le plan et le statut */
export function getPermissions(
  plan: PlanId | undefined,
  status: SubscriptionStatus | undefined
): PlanPermissions {
  // Abonnement expiré ou suspendu → aucune permission
  if (status === 'suspended' || status === 'expired') {
    return { ...BASE_PERMISSIONS }
  }
  const planDef = PLANS[plan ?? 'essentiel']
  return planDef.permissions
}

/** Nom du plan minimum requis pour une fonctionnalité */
export function getMinimumPlanForFeature(feature: keyof PlanPermissions): PlanId | null {
  for (const planId of PLAN_ORDER) {
    const permissions = PLANS[planId].permissions
    const value = permissions[feature]
    if (value === true || (typeof value === 'number' && value > 0)) {
      return planId
    }
  }
  return null
}

export function getPlanLabel(planId: PlanId): string {
  return PLANS[planId]?.name ?? planId
}

export function formatBillingCycle(cycle: BillingCycle): string {
  return { monthly: 'Mensuel', quarterly: 'Trimestriel', annual: 'Annuel' }[cycle]
}
