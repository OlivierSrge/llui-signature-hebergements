'use server'

import { db } from '@/lib/firebase'
import { calculateReservation } from '@/lib/utils'
import { validatePromoCode } from '@/actions/promo-codes'
import { revalidatePath } from 'next/cache'
import { syncClientFromReservation } from '@/actions/clients'

type ActionResult =
  | { success: true; reservationId: string }
  | { success: false; error: string }

export async function createAdminReservation(formData: FormData): Promise<ActionResult> {
  try {
    const accommodationId = formData.get('accommodation_id') as string
    const checkIn = formData.get('check_in') as string
    const checkOut = formData.get('check_out') as string
    const guests = Number(formData.get('guests')) || 1
    const paymentMethod = (formData.get('payment_method') as string) || 'especes'
    const paymentStatus = (formData.get('payment_status') as string) || 'en_attente'
    const reservationStatus = (formData.get('reservation_status') as string) || 'confirmee'
    const promoCodeRaw = ((formData.get('promo_code') as string) || '').toUpperCase().trim()
    const notes = (formData.get('notes') as string) || null

    const accDoc = await db.collection('hebergements').doc(accommodationId).get()
    if (!accDoc.exists) return { success: false, error: 'Hébergement introuvable' }
    const acc = accDoc.data()!

    const { nights, subtotal, commissionAmount } = calculateReservation(
      acc.price_per_night,
      checkIn,
      checkOut,
      acc.commission_rate
    )
    if (nights <= 0) return { success: false, error: 'Dates invalides' }

    // Vérifier conflits
    const existingSnap = await db.collection('reservations')
      .where('accommodation_id', '==', accommodationId)
      .where('reservation_status', '==', 'confirmee')
      .get()
    for (const doc of existingSnap.docs) {
      const r = doc.data()
      if (checkIn < r.check_out && checkOut > r.check_in) {
        return { success: false, error: 'Ces dates sont déjà réservées.' }
      }
    }

    // Code promo
    let discountAmount = 0
    let validPromoCode: string | null = null
    if (promoCodeRaw) {
      const promoResult = await validatePromoCode(promoCodeRaw, subtotal)
      if (promoResult.valid) {
        discountAmount = promoResult.discount_amount
        validPromoCode = promoResult.code
      }
    }
    const totalPrice = subtotal - discountAmount

    const now = new Date().toISOString()
    const docRef = db.collection('reservations').doc()

    await docRef.set({
      accommodation_id: accommodationId,
      accommodation: {
        name: acc.name,
        images: acc.images ?? [],
        slug: acc.slug,
        location: acc.location ?? null,
        partner: { name: acc.partner?.name || '' },
      },
      user_id: null,
      guest_first_name: formData.get('guest_first_name') as string,
      guest_last_name: formData.get('guest_last_name') as string,
      guest_email: (formData.get('guest_email') as string) || '',
      guest_phone: (formData.get('guest_phone') as string) || '',
      check_in: checkIn,
      check_out: checkOut,
      guests,
      nights,
      price_per_night: acc.price_per_night,
      subtotal,
      commission_rate: acc.commission_rate,
      commission_amount: commissionAmount,
      promo_code: validPromoCode,
      discount_amount: discountAmount || null,
      total_price: totalPrice,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      payment_reference: null,
      payment_date: paymentStatus === 'paye' ? now : null,
      reservation_status: reservationStatus,
      confirmed_at: reservationStatus === 'confirmee' ? now : null,
      cancelled_at: null,
      cancellation_reason: null,
      notes,
      admin_notes: null,
      source: 'direct',
      partner_id: null,
      partner_name: null,
      confirmation_code: null,
      qr_code_data: null,
      check_in_confirmed: false,
      check_in_date: null,
      checked_in_by: null,
      usage_commission_amount: null,
      created_at: now,
      updated_at: now,
    })

    if (validPromoCode) {
      const promoSnap = await db.collection('promo_codes').where('code', '==', validPromoCode).limit(1).get()
      if (!promoSnap.empty) {
        await promoSnap.docs[0].ref.update({ used_count: (promoSnap.docs[0].data().used_count || 0) + 1 })
      }
    }

    // Créer le profil L&Lui Stars si la réservation est directement confirmée
    const guestEmail = (formData.get('guest_email') as string || '').trim()
    if (reservationStatus === 'confirmee' && guestEmail) {
      await syncClientFromReservation({
        email: guestEmail,
        firstName: formData.get('guest_first_name') as string || '',
        lastName: formData.get('guest_last_name') as string || '',
        phone: formData.get('guest_phone') as string || '',
        reservationDate: now,
      }).catch(() => {})
    }

    revalidatePath('/admin/reservations')
    return { success: true, reservationId: docRef.id }
  } catch (e: any) {
    return { success: false, error: e.message || 'Une erreur est survenue' }
  }
}
