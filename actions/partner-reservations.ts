'use server'

import { db, getStorageBucket } from '@/lib/firebase'
import { cookies } from 'next/headers'
import { calculateReservation } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import { buildSourceFields } from '@/actions/reservation-source'
import QRCode from 'qrcode'
import { sendWhatsApp } from '@/lib/whatsappNotif'

type ActionResult = { success: true; reservationId: string; confirmationCode: string; qr_reservation_url?: string } | { success: false; error: string }

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

    // Déterminer la source et les champs de protection trésorerie
    // Vérifier si le partenaire a le flux L&Lui forcé
    const forceFlux = partnerData.forceFluxLlui === true
    const sourceFields = await buildSourceFields(
      forceFlux ? 'llui_site' as any : 'partner_qr',
      subtotal,
      partnerId,
      partnerData.name,
    )
    // Si forceFlux, on force explicitement llui_site
    if (forceFlux) {
      sourceFields.source = 'llui_site'
      sourceFields.autoEscalated = true
      sourceFields.autoEscalatedReason = 'Flux L&Lui forcé pour ce partenaire'
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
      // Source & protection trésorerie
      ...sourceFields,
      // Partenaire (legacy + nouveau)
      partner_id: partnerId,
      partner_name: partnerData.name,
      confirmation_code: confirmationCode,
      qr_code_data: qrCodeData,
      check_in_confirmed: false,
      check_in_date: null,
      checked_in_by: null,
      usage_commission_amount: usageCommissionAmount,
      // Traçabilité source
      apporte_par_type: 'direct',
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

    // ── Détection session prescripteur active + génération QR réservation ──
    let qr_reservation_url: string | undefined
    let code_manuel_prescripteur: string | undefined
    try {
      const now = new Date().toISOString()
      const sessSnap = await db.collection('prescripteur_sessions')
        .where('partenaire_id', '==', partnerId)
        .where('type', '==', 'partenaire')
        .where('statut', '==', 'active')
        .where('expire_at', '>', now)
        .limit(1).get()
      const sessionPrescripteur = sessSnap.empty ? null : { ...(sessSnap.docs[0].data() as Record<string, unknown>), session_id: sessSnap.docs[0].id }

      // Générer le code manuel 6 chiffres (fallback caméra)
      const codeManuel = Math.floor(100000 + Math.random() * 900000).toString()
      code_manuel_prescripteur = codeManuel

      // Générer le payload QR
      const qrPayload = JSON.stringify({
        type: 'reservation',
        reservation_id: docRef.id,
        partenaire_id: partnerId,
        client_nom: `${guestFirstName} ${guestLastName}`,
        montant_paye: subtotal,
        commission: 1500,
        expire_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      // Générer le buffer PNG QR
      const qrBuffer = await QRCode.toBuffer(qrPayload, { type: 'png', width: 400, margin: 2 })

      // Upload dans Firebase Storage
      const bucket = getStorageBucket()
      const file = bucket.file(`reservations/qr/${docRef.id}.png`)
      await file.save(qrBuffer, { contentType: 'image/png', public: true })
      qr_reservation_url = `https://storage.googleapis.com/${bucket.name}/reservations/qr/${docRef.id}.png`

      // Mettre à jour la réservation avec les données QR et prescripteur
      await docRef.update({
        qr_reservation_data: qrPayload,
        qr_reservation_url,
        qr_expire_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        qr_utilise: false,
        code_manuel_prescripteur: codeManuel,
        statut_prescription: 'disponibilite_confirmee',
        ...(sessionPrescripteur ? {
          prescripteur_id_prevu: (sessionPrescripteur as any).prescripteur_id,
          prescripteur_session_id: sessionPrescripteur.session_id,
          apporte_par_type: 'prescripteur',
        } : {}),
      })

      // Envoyer WhatsApp au client si téléphone fourni
      if (guestPhone) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
        const msg = `Bonjour ${guestFirstName} ! Votre reservation chez ${partnerData.name} est confirmee. Voici votre QR code : ${qr_reservation_url} Presentez-le a votre arrivee. — L&Lui Signature`
        try { await sendWhatsApp(guestPhone, msg) } catch {}
      }
    } catch (qrErr) {
      console.error('[createPartnerReservation] QR generation error:', qrErr)
      // Ne pas bloquer la création si la génération QR échoue
    }

    revalidatePath('/partenaire/dashboard')
    revalidatePath('/admin/reservations')

    return { success: true, reservationId: docRef.id, confirmationCode, qr_reservation_url, code_manuel_prescripteur }
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

/** Sauvegarde les notes internes partenaire sur une réservation */
export async function savePartnerNotes(
  reservationId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('reservations').doc(reservationId).update({
      partner_notes: notes,
      updated_at: new Date().toISOString(),
    })
    revalidatePath(`/partenaire/reservations/${reservationId}`)
    revalidatePath(`/admin/reservations/${reservationId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
