import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { AccommodationType, PaymentMethod, PaymentStatus, ReservationStatus } from './types'

// ============================================================
// Styles
// ============================================================
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// Dates
// ============================================================
export function formatDate(date: string | Date, fmt = 'dd MMMM yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: fr })
}

export function formatDateShort(date: string | Date) {
  return formatDate(date, 'dd/MM/yyyy')
}

export function countNights(checkIn: string, checkOut: string): number {
  return differenceInDays(parseISO(checkOut), parseISO(checkIn))
}

export function formatDateRange(checkIn: string, checkOut: string) {
  const nights = countNights(checkIn, checkOut)
  return `${formatDate(checkIn)} → ${formatDate(checkOut)} (${nights} nuit${nights > 1 ? 's' : ''})`
}

// ============================================================
// Prix
// ============================================================
export function formatPrice(amount: number, currency = 'FCFA'): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' ' + currency
}

export function calculateReservation(
  pricePerNight: number,
  checkIn: string,
  checkOut: string,
  commissionRate: number
) {
  const nights = countNights(checkIn, checkOut)
  const subtotal = pricePerNight * nights
  const commissionAmount = (subtotal * commissionRate) / 100
  return {
    nights,
    subtotal,
    commissionAmount,
    totalPrice: subtotal,
  }
}

// ============================================================
// Labels & badges
// ============================================================
export function getTypeLabel(type: AccommodationType): string {
  const labels: Record<AccommodationType, string> = {
    villa: 'Villa',
    appartement: 'Appartement',
    chambre: 'Chambre',
  }
  return labels[type]
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    orange_money: 'Orange Money',
    virement: 'Virement bancaire',
    especes: 'Espèces',
  }
  return labels[method]
}

export function getReservationStatusLabel(status: ReservationStatus): string {
  const labels: Record<ReservationStatus, string> = {
    en_attente: 'En attente',
    confirmee: 'Confirmée',
    annulee: 'Annulée',
  }
  return labels[status]
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    en_attente: 'En attente',
    paye: 'Payé',
    annule: 'Annulé',
  }
  return labels[status]
}

export function getReservationStatusColor(status: ReservationStatus): string {
  const colors: Record<ReservationStatus, string> = {
    en_attente: 'bg-amber-100 text-amber-800 border-amber-200',
    confirmee: 'bg-green-100 text-green-800 border-green-200',
    annulee: 'bg-red-100 text-red-800 border-red-200',
  }
  return colors[status]
}

export function getPaymentStatusColor(status: PaymentStatus): string {
  const colors: Record<PaymentStatus, string> = {
    en_attente: 'bg-amber-100 text-amber-800 border-amber-200',
    paye: 'bg-green-100 text-green-800 border-green-200',
    annule: 'bg-red-100 text-red-800 border-red-200',
  }
  return colors[status]
}

// ============================================================
// Slug
// ============================================================
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// ============================================================
// Truncate
// ============================================================
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '…'
}
