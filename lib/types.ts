// ============================================================
// Types TypeScript – L&Lui Signature
// ============================================================

export type UserRole = 'client' | 'admin'

export type AccommodationType = 'villa' | 'appartement' | 'chambre'

export type ReservationStatus = 'en_attente' | 'confirmee' | 'annulee'

export type PaymentStatus = 'en_attente' | 'paye' | 'annule'

export type PaymentMethod = 'orange_money' | 'virement' | 'especes'

// ============================================================
// Partner
// ============================================================
export interface Partner {
  id: string
  name: string
  email: string | null
  phone: string | null
  description: string | null
  address: string | null
  iban: string | null
  logo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// Accommodation
// ============================================================
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

  created_at: string
  updated_at: string

  // Relations
  accommodation?: Accommodation
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
