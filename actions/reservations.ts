'use server'

import { db } from '@/lib/firebase'
import { calculateReservation } from '@/lib/utils'
import { sendReservationEmails } from '@/lib/email'
import { validatePromoCode } from '@/actions/promo-codes'
import type { ReservationFormData } from '@/lib/types'
import { revalidatePath } from 'next/cache'

type ActionResult = { success: true; reservationId?: string } | { success: false; error: string }

export async function createReservation(
  accommodationId: string,
  formData: ReservationFormData
): Promise<ActionResult> {
  try {
    const accDoc = await db.collection('hebergements').doc(accommodationId).get()
    if (!accDoc.exists) return { success: false, error: 'Hébergement introuvable' }

    const accommodation = { id: accDoc.id, ...accDoc.data() } as any
    const { nights, subtotal, commissionAmount } = calculateReservation(
      accommodation.price_per_night,
      formData.check_in,
      formData.check_out,
      accommodation.commission_rate
    )

    if (nights <= 0) return { success: false, error: 'Les dates sélectionnées sont invalides' }

    const blockedSnap = await db.collection('disponibilites')
      .where('accommodation_id', '==', accommodationId)
      .get()
    const blockedDates = blockedSnap.docs.map((d) => d.data().date as string)

    for (let d = new Date(formData.check_in); d < new Date(formData.check_out); d.setDate(d.getDate() + 1)) {
      if (blockedDates.includes(d.toISOString().split('T')[0])) {
        return { success: false, error: 'Ces dates ne sont plus disponibles.' }
      }
    }

    const existingSnap = await db.collection('reservations')
      .where('accommodation_id', '==', accommodationId)
      .where('reservation_status', '==', 'confirmee')
      .get()

    for (const doc of existingSnap.docs) {
      const res = doc.data()
      if (formData.check_in < res.check_out && formData.check_out > res.check_in) {
        return { success: false, error: 'Ces dates sont déjà réservées.' }
      }
    }

    // Validate promo code server-side if provided
    let discountAmount = 0
    let validPromoCode: string | null = null
    if (formData.promo_code) {
      const promoResult = await validatePromoCode(formData.promo_code, subtotal)
      if (promoResult.valid) {
        discountAmount = promoResult.discount_amount
        validPromoCode = promoResult.code
      }
    }
    const totalPrice = subtotal - discountAmount

    const docRef = db.collection('reservations').doc()
    await docRef.set({
      accommodation_id: accommodationId,
      accommodation: {
        name: accommodation.name,
        images: accommodation.images,
        slug: accommodation.slug,
        location: accommodation.location,
        partner: { name: accommodation.partner?.name || '' },
      },
      guest_first_name: formData.guest_first_name,
      guest_last_name: formData.guest_last_name,
      guest_email: formData.guest_email,
      guest_phone: formData.guest_phone,
      check_in: formData.check_in,
      check_out: formData.check_out,
      guests: formData.guests,
      nights,
      price_per_night: accommodation.price_per_night,
      subtotal,
      commission_rate: accommodation.commission_rate,
      commission_amount: commissionAmount,
      promo_code: validPromoCode,
      discount_amount: discountAmount || null,
      total_price: totalPrice,
      payment_method: formData.payment_method,
      payment_status: 'en_attente',
      payment_reference: null,
      payment_date: null,
      reservation_status: 'en_attente',
      confirmed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
      notes: formData.notes || null,
      admin_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Increment used_count on the promo code
    if (validPromoCode) {
      const promoSnap = await db.collection('promo_codes')
        .where('code', '==', validPromoCode)
        .limit(1)
        .get()
      if (!promoSnap.empty) {
        await promoSnap.docs[0].ref.update({ used_count: (promoSnap.docs[0].data().used_count || 0) + 1 })
      }
    }

    revalidatePath('/admin/reservations')

    // Send email notifications (non-blocking)
    sendReservationEmails({
      id: docRef.id,
      accommodation: {
        name: accommodation.name,
        slug: accommodation.slug,
        location: accommodation.location,
      },
      guest_first_name: formData.guest_first_name,
      guest_last_name: formData.guest_last_name,
      guest_email: formData.guest_email,
      guest_phone: formData.guest_phone,
      check_in: formData.check_in,
      check_out: formData.check_out,
      nights,
      guests: formData.guests,
      total_price: subtotal,
      payment_method: formData.payment_method,
      notes: formData.notes,
    }).catch((err) => console.error('[email] sendReservationEmails failed:', err))

    return { success: true, reservationId: docRef.id }
  } catch (e: any) {
    return { success: false, error: e.message || 'Une erreur est survenue' }
  }
}

export async function updateReservationStatus(
  reservationId: string,
  status: 'confirmee' | 'annulee',
  adminNotes?: string,
  cancellationReason?: string
): Promise<ActionResult> {
  try {
    const updateData: Record<string, unknown> = {
      reservation_status: status,
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString(),
    }
    if (status === 'confirmee') updateData.confirmed_at = new Date().toISOString()
    if (status === 'annulee') {
      updateData.cancelled_at = new Date().toISOString()
      if (cancellationReason) updateData.cancellation_reason = cancellationReason
    }

    await db.collection('reservations').doc(reservationId).update(updateData)
    revalidatePath('/admin/reservations')
    revalidatePath(`/admin/reservations/${reservationId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la mise à jour' }
  }
}

export async function updatePaymentStatus(
  reservationId: string,
  paymentStatus: 'en_attente' | 'paye' | 'annule',
  paymentReference?: string
): Promise<ActionResult> {
  try {
    const updateData: Record<string, unknown> = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    }
    if (paymentStatus === 'paye') {
      updateData.payment_date = new Date().toISOString()
      if (paymentReference) updateData.payment_reference = paymentReference
    }

    await db.collection('reservations').doc(reservationId).update(updateData)
    revalidatePath('/admin/reservations')
    revalidatePath(`/admin/reservations/${reservationId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la mise à jour du paiement' }
  }
}
