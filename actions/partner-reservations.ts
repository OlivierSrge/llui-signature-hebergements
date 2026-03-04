'use server'

import { db } from '@/lib/firebase'
import { cookies } from 'next/headers'
import { calculateReservation } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

type ActionResult = { success: true; reservationId: string; confirmationCode: string } | { success: false; error: string }

function generateConfirmationCode(): string {
  const year = new Date().getFullYear()
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 5; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return `LLS-${year}-${suffix}`
}

function buildQrCodeUrl(confirmationCode: string, baseUrl: string): string {
  const data = encodeURIComponent(`${baseUrl}/partenaire/scanner?code=${confirmationCode}`)
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${data}&bgcolor=FFFFFF&color=1A1A1A&margin=10`
}

export async function createPartnerReservation(formData: FormData): Promise<ActionResult> {
  try {
    // Récupérer la session partenaire
    const cookieStore = cookies()
    const partnerId = cookieStore.get('partner_session')?.value
    if (!partnerId) return { success: false, error: 'Session expirée. Veuillez vous reconnecter.' }

    const partnerDoc = await db.collection('partenaires').doc(partnerId).get()
    if (!partnerDoc.exists) return { success: false, error: 'Partenaire introuvable' }
    const partnerData = partnerDoc.data()!
    if (!partnerData.is_active) return { success: false, error: 'Compte partenaire inactif' }

    const accommodationId = formData.get('accommodation_id') as string
    const checkIn = formData.get('check_in') as string
    const checkOut = formData.get('check_out') as string
    const guests = Number(formData.get('guests')) || 1
    const paymentMethod = formData.get('payment_method') as string
    const notes = (formData.get('notes') as string) || null

    const guestFirstName = formData.get('guest_first_name') as string
    const guestLastName = formData.get('guest_last_name') as string
    const guestEmail = (formData.get('guest_email') as string) || ''
    const guestPhone = (formData.get('guest_phone') as string) || ''

    // Vérifier que l'hébergement appartient bien à ce partenaire
    const accDoc = await db.collection('hebergements').doc(accommodationId).get()
    if (!accDoc.exists) return { success: false, error: 'Hébergement introuvable' }
    const accommodation = accDoc.data()!
    if (accommodation.partner_id !== partnerId) return { success: false, error: 'Hébergement non autorisé' }

    const { nights, subtotal, commissionAmount } = calculateReservation(
      accommodation.price_per_night,
      checkIn,
      checkOut,
      accommodation.commission_rate
    )
    if (nights <= 0) return { success: false, error: 'Dates invalides' }

    // Vérifier disponibilité
    const blockedSnap = await db.collection('disponibilites')
      .where('accommodation_id', '==', accommodationId)
      .get()
    const blockedDates = blockedSnap.docs.map((d) => d.data().date as string)
    for (let d = new Date(checkIn); d < new Date(checkOut); d.setDate(d.getDate() + 1)) {
      if (blockedDates.includes(d.toISOString().split('T')[0])) {
        return { success: false, error: 'Ces dates ne sont plus disponibles.' }
      }
    }

    // Vérifier conflits de réservations confirmées
    const existingSnap = await db.collection('reservations')
      .where('accommodation_id', '==', accommodationId)
      .where('reservation_status', '==', 'confirmee')
      .get()
    for (const doc of existingSnap.docs) {
      const res = doc.data()
      if (checkIn < res.check_out && checkOut > res.check_in) {
        return { success: false, error: 'Ces dates sont déjà réservées.' }
      }
    }

    // Générer code confirmation + QR
    const confirmationCode = generateConfirmationCode()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://llui-signature.cm'
    const qrCodeData = buildQrCodeUrl(confirmationCode, baseUrl)

    // Calcul commission à l'usage
    let usageCommissionAmount: number | null = null
    const commUsageType = partnerData.commission_usage_type as string | null
    const commUsageValue = Number(partnerData.commission_usage_value) || 0
    if (commUsageValue > 0) {
      usageCommissionAmount = commUsageType === 'percent'
        ? Math.round((subtotal * commUsageValue) / 100)
        : commUsageValue
    }

    // Créer la réservation
    const docRef = db.collection('reservations').doc()
    await docRef.set({
      accommodation_id: accommodationId,
      accommodation: {
        name: accommodation.name,
        images: accommodation.images ?? [],
        slug: accommodation.slug,
        location: accommodation.location ?? null,
        partner: { name: partnerData.name },
      },
      user_id: null,
      guest_first_name: guestFirstName,
      guest_last_name: guestLastName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      nights,
      price_per_night: accommodation.price_per_night,
      subtotal,
      commission_rate: accommodation.commission_rate,
      commission_amount: commissionAmount,
      promo_code: null,
      discount_amount: null,
      total_price: subtotal,
      payment_method: paymentMethod,
      payment_status: 'en_attente',
      payment_reference: null,
      payment_date: null,
      reservation_status: 'en_attente',
      confirmed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
      notes,
      admin_notes: null,
      // Partenaire
      source: 'partenaire',
      partner_id: partnerId,
      partner_name: partnerData.name,
      confirmation_code: confirmationCode,
      qr_code_data: qrCodeData,
      check_in_confirmed: false,
      check_in_date: null,
      checked_in_by: null,
      usage_commission_amount: usageCommissionAmount,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Créer l'enregistrement de commission à l'usage
    if (usageCommissionAmount !== null && usageCommissionAmount > 0) {
      await db.collection('commissions_usage').add({
        reservation_id: docRef.id,
        partner_id: partnerId,
        partner_name: partnerData.name,
        accommodation_id: accommodationId,
        accommodation_name: accommodation.name,
        amount: usageCommissionAmount,
        commission_type: commUsageType,
        commission_value: commUsageValue,
        paid: false,
        paid_at: null,
        created_at: new Date().toISOString(),
      })
    }

    // Mettre à jour le score de fiabilité du partenaire
    await updateReliabilityScore(partnerId)

    revalidatePath('/partenaire/dashboard')
    revalidatePath('/admin/reservations')

    return { success: true, reservationId: docRef.id, confirmationCode }
  } catch (e: any) {
    return { success: false, error: e.message || 'Une erreur est survenue' }
  }
}

/** Recalcule le score de fiabilité : ratio arrivées confirmées / total réservations partenaire */
async function updateReliabilityScore(partnerId: string): Promise<void> {
  const snap = await db.collection('reservations')
    .where('partner_id', '==', partnerId)
    .where('source', '==', 'partenaire')
    .get()

  const total = snap.docs.length
  if (total === 0) return

  const confirmed = snap.docs.filter((d) => d.data().check_in_confirmed === true).length
  const score = Math.round((confirmed / total) * 100)

  await db.collection('partenaires').doc(partnerId).update({
    reliability_score: score,
    updated_at: new Date().toISOString(),
  })
}

/** Confirme l'arrivée d'un client via scan QR */
export async function confirmCheckIn(
  confirmationCode: string,
  partnerAccessCode: string
): Promise<{ success: boolean; error?: string; reservation?: Record<string, unknown> }> {
  try {
    const snap = await db.collection('reservations')
      .where('confirmation_code', '==', confirmationCode)
      .limit(1)
      .get()

    if (snap.empty) return { success: false, error: 'Code de confirmation introuvable' }

    const doc = snap.docs[0]
    const data = doc.data()

    if (data.check_in_confirmed) {
      return { success: true, reservation: { id: doc.id, ...data, alreadyConfirmed: true } }
    }

    await doc.ref.update({
      check_in_confirmed: true,
      check_in_date: new Date().toISOString(),
      checked_in_by: partnerAccessCode,
      updated_at: new Date().toISOString(),
    })

    // Recalcul score fiabilité
    if (data.partner_id) {
      await updateReliabilityScore(data.partner_id as string)
    }

    revalidatePath('/admin/reservations')
    revalidatePath('/partenaire/dashboard')

    return { success: true, reservation: { id: doc.id, ...data } }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la confirmation' }
  }
}
