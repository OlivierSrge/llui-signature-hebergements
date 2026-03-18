// ============================================================
// Types TypeScript – L&Lui Signature
// ============================================================

export type UserRole = 'client' | 'admin'

// Compatibilité anciens types + nouveaux ids enrichis (voir lib/accommodationTypes.ts)
export type AccommodationType = string

export type ReservationStatus = 'demande' | 'en_attente' | 'confirmee' | 'annulee'

export type PaymentStatus = 'en_attente' | 'paye' | 'annule'

export type PaymentMethod = 'orange_money' | 'virement' | 'especes'

export type DiscountType = 'percent' | 'fixed'

// ============================================================
// Subscription
// ============================================================
export type { PlanId, SubscriptionStatus, BillingCycle } from '@/lib/plans'

// ============================================================
// Partner
// ============================================================
export interface Partner {
  id: string
  name: string
  email: string | null
  phone: string | null
  whatsapp_number: string | null       // numéro WhatsApp (format international, ex: 237612345678)
  description: string | null
  address: string | null
  iban: string | null
  logo_url: string | null
  promo_code: string | null            // code promo dédié à ce partenaire
  promo_discount_type: DiscountType | null
  promo_discount_value: number | null
  access_code: string                  // identifiant unique portail (ex: PART-AB12CD)
  access_pin: string | null            // PIN 4-6 chiffres pour le portail
  commission_usage_type: DiscountType | null   // 'percent' ou 'fixed'
  commission_usage_value: number | null         // valeur de la commission à l'usage
  reliability_score: number | null              // score fiabilité 0–100
  is_active: boolean
  created_at: string
  updated_at: string
  // Abonnement SaaS
  subscriptionPlan?: import('@/lib/plans').PlanId
  subscriptionStatus?: import('@/lib/plans').SubscriptionStatus
  subscriptionStartDate?: string
  subscriptionEndDate?: string
  trialEndsAt?: string
  billingCycle?: import('@/lib/plans').BillingCycle
  maxAccommodations?: number       // override du plan
  commissionRate?: number          // override du plan
  customFeatures?: Record<string, boolean>
}

// ============================================================
// Accommodation
// ============================================================
export interface AccommodationRatings {
  overall: number
  count: number
  cleanliness: number
  accuracy: number
  checkin: number
  communication: number
  location: number
  value: number
}

export interface Accommodation {
  id: string
  partner_id: string
  name: string
  slug: string
  type: AccommodationType
  description: string | null
  short_description: string | null
  capacity: number
  bedrooms: number
  bathrooms: number
  price_per_night: number
  commission_rate: number
  location: string | null
  latitude: number | null
  longitude: number | null
  images: string[]
  amenities: string[]
  ratings?: AccommodationRatings | null
  status: 'active' | 'inactive'
  featured: boolean
  created_at: string
  updated_at: string
  // Relations
  partner?: Partner
}

// ============================================================
// Availability
// ============================================================
export interface Availability {
  id: string
  accommodation_id: string
  date: string
  is_available: boolean
}

// ============================================================
// Profile
// ============================================================
export interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

// ============================================================
// Reservation
// ============================================================
export interface Reservation {
  id: string
  accommodation_id: string
  user_id: string | null

  guest_first_name: string
  guest_last_name: string
  guest_email: string
  guest_phone: string

  check_in: string
  check_out: string
  guests: number
  nights: number

  price_per_night: number
  subtotal: number
  commission_rate: number
  commission_amount: number
  total_price: number

  payment_method: PaymentMethod
  payment_status: PaymentStatus
  payment_reference: string | null
  payment_date: string | null

  reservation_status: ReservationStatus
  confirmed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null

  notes: string | null
  admin_notes: string | null

  promo_code: string | null
  discount_amount: number | null

  // ── Source & flux de trésorerie ──────────────────────────────────────────
  // source métier (remplace l'ancien 'direct' | 'partenaire')
  // 'llui_site'   → réservation venue du catalogue web L&Lui (admin uniquement)
  // 'partner_qr'  → réservation venue du QR Code partenaire
  // Anciens: 'direct' | 'partenaire' conservés pour compatibilité
  source: 'llui_site' | 'partner_qr' | 'direct' | 'partenaire' | null
  sourcePartnerId: string | null
  sourcePartnerName: string | null
  handledBy: 'admin' | 'partner' | null
  adminCanOverride: boolean | null
  visiblePartenaire: boolean | null

  // Protection trésorerie — acompte L&Lui
  acompteRequired: boolean | null
  acompteAmount: number | null
  acompteStatus: 'pending' | 'confirmed' | 'waived' | null
  acompteConfirmedAt: string | null
  acompteConfirmedBy: string | null

  // Escalade automatique (seuil montant)
  autoEscalated: boolean | null
  autoEscalatedReason: string | null

  // Fenêtre admin prioritaire
  adminWindowStart: string | null
  adminWindowEnd: string | null
  adminWindowUsed: boolean | null

  // Partenaire
  partner_id: string | null                  // partenaire ayant créé la réservation
  partner_name: string | null
  confirmation_code: string | null           // LLS-YYYY-XXXXX
  qr_code_data: string | null               // URL du QR code
  check_in_confirmed: boolean | null        // arrivée confirmée via scan
  check_in_date: string | null
  checked_in_by: string | null             // access_code du partenaire ayant scanné

  // Commission à l'usage
  usage_commission_amount: number | null

  // Partenaire (legacy)
  partner_id_legacy?: string | null

  // WhatsApp pipeline
  product_type: 'hebergement' | 'pack' | 'autre' | null
  handled_by: string | null
  confirmed_by: string | null
  whatsapp_proposal_sent_at: string | null
  whatsapp_payment_request_sent_at: string | null
  whatsapp_confirmation_sent_at: string | null

  created_at: string
  updated_at: string

  // Relations
  accommodation?: Accommodation
}

// ============================================================
// Demande de disponibilité (client public)
// ============================================================
export interface AvailabilityRequest {
  id: string
  product_type: 'hebergement' | 'pack'
  product_id: string
  product_name: string
  guest_first_name: string
  guest_last_name: string
  guest_phone: string
  guest_email: string
  check_in: string
  check_out: string
  guests: number
  message: string | null
  status: 'en_attente' | 'traitee' | 'annulee'
  reservation_id: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// Templates WhatsApp
// ============================================================
export interface WhatsAppTemplates {
  template1_proposal: string
  template2_payment: string
  template3_confirmation: string
  template4_fiche: string
  updated_at: string
}

// ============================================================
// Tarification saisonnière
// ============================================================
export interface SeasonalPricing {
  id: string
  accommodation_id: string
  label: string
  start_date: string
  end_date: string
  price_per_night: number
}

// ============================================================
// Historique des communications WhatsApp
// ============================================================
export interface WhatsAppLog {
  id: string
  reservation_id: string
  button: 1 | 2 | 3 | 4
  button_label: string
  sent_by: string
  sent_at: string
  phone: string
}

// ============================================================
// Forms
// ============================================================
export interface ReservationFormData {
  guest_first_name: string
  guest_last_name: string
  guest_email: string
  guest_phone: string
  check_in: string
  check_out: string
  guests: number
  payment_method: PaymentMethod
  notes?: string
  promo_code?: string
  discount_amount?: number
}

// ============================================================
// Promo Codes
// ============================================================
export interface PromoCode {
  id: string
  code: string
  discount_type: DiscountType
  discount_value: number
  active: boolean
  expires_at: string | null
  max_uses: number | null
  used_count: number
  created_at: string
}

export interface AccommodationFilters {
  type?: AccommodationType | ''
  check_in?: string
  check_out?: string
  capacity?: number
  min_price?: number
  max_price?: number
  partner_id?: string
}

// ============================================================
// Packs
// ============================================================
export type PackType = 'f3' | 'vip' | 'signature'

export interface Pack {
  id: string
  name: string
  slug: string
  pack_type: PackType
  short_description: string
  description: string | null
  accommodation_ids: string[]
  total_price: number | null       // prix global unique du pack
  capacity: number | null          // capacité totale
  images: string[]
  featured: boolean
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  accommodations?: Accommodation[]
}

// ============================================================
// Commission à l'usage (partenaire)
// ============================================================
export interface CommissionUsage {
  id: string
  reservation_id: string
  partner_id: string
  partner_name: string
  accommodation_id: string
  accommodation_name: string
  amount: number                // montant de la commission
  commission_type: DiscountType // 'percent' ou 'fixed'
  commission_value: number      // taux ou montant paramétré
  paid: boolean
  paid_at: string | null
  created_at: string
}

// ============================================================
// Fidélité client (L&Lui Stars)
// ============================================================
export type { NiveauId } from '@/lib/loyalty'

export interface BoutiqueAchat {
  id: string
  montant: number       // FCFA
  articles: string
  date: string          // YYYY-MM-DD
  points: number
  created_at: string
}

export interface LoyaltyClient {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  birthDate: string | null       // YYYY-MM-DD
  memberCode: string             // LLS-XXXXXX
  joinedAt: string               // ISO date premier séjour
  niveau: import('@/lib/loyalty').NiveauId
  totalSejours: number
  totalPoints: number
  boutiqueDiscount: number       // 5/10/15/20 %
  boutiquePromoCode: string      // BOUTIQUE-XXXXX
  boutiquePointsEarned: number   // points gagnés via boutique
  boutiqueAchats: BoutiqueAchat[]
  // Authentification PIN
  accessPin?: string           // Hash du PIN (temporaire ou permanent)
  accessPinExpiry?: string     // ISO date — uniquement pour les PINs temporaires
  accessPinPermanent?: boolean // true si le client a défini un PIN mémorisable
  created_at: string
  updated_at: string
}

// ============================================================
// Admin Stats
// ============================================================
export interface AdminStats {
  total_reservations: number
  pending_reservations: number
  confirmed_reservations: number
  cancelled_reservations: number
  total_revenue: number
  total_commission: number
  pending_payment: number
}
