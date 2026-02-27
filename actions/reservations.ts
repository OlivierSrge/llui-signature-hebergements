'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateReservation } from '@/lib/utils'
import type { ReservationFormData } from '@/lib/types'
import { revalidatePath } from 'next/cache'

export async function createReservation(
  accommodationId: string,
  formData: ReservationFormData
) {
  const supabase = await createClient()

  // Récupérer l'hébergement
  const { data: accommodation, error: accError } = await supabase
    .from('accommodations')
    .select('*, partner:partners(*)')
    .eq('id', accommodationId)
    .single()

  if (accError || !accommodation) {
    return { error: 'Hébergement introuvable' }
  }

  // Calculer les montants
  const { nights, subtotal, commissionAmount } = calculateReservation(
    accommodation.price_per_night,
    formData.check_in,
    formData.check_out,
    accommodation.commission_rate
  )

  if (nights <= 0) {
    return { error: 'Les dates sélectionnées sont invalides' }
  }

  // Vérifier la disponibilité
  const { data: blockedDates } = await supabase
    .from('availability')
    .select('date')
    .eq('accommodation_id', accommodationId)
    .eq('is_available', false)
    .gte('date', formData.check_in)
    .lt('date', formData.check_out)

  if (blockedDates && blockedDates.length > 0) {
    return { error: 'Ces dates ne sont plus disponibles. Veuillez choisir d\'autres dates.' }
  }

  // Vérifier les réservations confirmées existantes
  const { data: existingRes } = await supabase
    .from('reservations')
    .select('id')
    .eq('accommodation_id', accommodationId)
    .eq('reservation_status', 'confirmee')
    .or(`check_in.lt.${formData.check_out},check_out.gt.${formData.check_in}`)

  if (existingRes && existingRes.length > 0) {
    return { error: 'Ces dates sont déjà réservées. Veuillez choisir d\'autres dates.' }
  }

  // Récupérer l'utilisateur connecté
  const { data: { user } } = await supabase.auth.getUser()

  // Créer la réservation
  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      accommodation_id: accommodationId,
      user_id: user?.id || null,
      guest_first_name: formData.guest_first_name,
      guest_last_name: formData.guest_last_name,
      guest_email: formData.guest_email,
      guest_phone: formData.guest_phone,
      check_in: formData.check_in,
      check_out: formData.check_out,
      guests: formData.guests,
      price_per_night: accommodation.price_per_night,
      subtotal,
      commission_rate: accommodation.commission_rate,
      commission_amount: commissionAmount,
      total_price: subtotal,
      payment_method: formData.payment_method,
      notes: formData.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Reservation error:', error)
    return { error: 'Une erreur est survenue lors de la création de la réservation' }
  }

  revalidatePath('/espace-client')
  revalidatePath('/admin/reservations')

  return { success: true, reservationId: reservation.id }
}

export async function updateReservationStatus(
  reservationId: string,
  status: 'confirmee' | 'annulee',
  adminNotes?: string,
  cancellationReason?: string
) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {
    reservation_status: status,
    admin_notes: adminNotes,
  }

  if (status === 'confirmee') updateData.confirmed_at = new Date().toISOString()
  if (status === 'annulee') {
    updateData.cancelled_at = new Date().toISOString()
    if (cancellationReason) updateData.cancellation_reason = cancellationReason
  }

  const { error } = await supabase
    .from('reservations')
    .update(updateData)
    .eq('id', reservationId)

  if (error) return { error: 'Erreur lors de la mise à jour' }

  revalidatePath('/admin/reservations')
  revalidatePath(`/admin/reservations/${reservationId}`)

  return { success: true }
}

export async function updatePaymentStatus(
  reservationId: string,
  paymentStatus: 'en_attente' | 'paye' | 'annule',
  paymentReference?: string
) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { payment_status: paymentStatus }
  if (paymentStatus === 'paye') {
    updateData.payment_date = new Date().toISOString()
    if (paymentReference) updateData.payment_reference = paymentReference
  }

  const { error } = await supabase
    .from('reservations')
    .update(updateData)
    .eq('id', reservationId)

  if (error) return { error: 'Erreur lors de la mise à jour du paiement' }

  revalidatePath('/admin/reservations')
  revalidatePath(`/admin/reservations/${reservationId}`)

  return { success: true }
}
