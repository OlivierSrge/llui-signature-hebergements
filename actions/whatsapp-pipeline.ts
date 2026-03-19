'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import { resolvePaymentSettingsForReservation } from '@/actions/payment-settings'
import { syncClientFromReservation, syncClientFromReservationId } from '@/actions/clients'
import { buildFicheV2, type FicheVariant, type NiveauFidelite } from '@/lib/messageTemplates'

type ActionResult = { success: true } | { success: false; error: string }

const ADMIN_WHATSAPP = '693407964'

// ============================================================
// Lecture des templates WhatsApp depuis Firestore
// ============================================================
async function getTemplates() {
  const doc = await db.collection('settings').doc('whatsappTemplates').get()
  const defaults = {
    template1_proposal: `Bonjour {nom_client} 👋\n\nVoici notre proposition pour votre séjour :\n🏡 *{produit}*\n📅 Dates : {dates}\n👥 Personnes : {personnes}\n💰 Total : *{montant} FCFA*\n\n⚠️ Cette réservation est soumise à confirmation après paiement.\n\n📍 Suivi en temps réel : {lien_suivi}\n\nCordialement,\nL&Lui Signature`,
    template2_payment: `Bonjour {nom_client},\n\nMerci pour votre intérêt ! Pour finaliser votre réservation *{code_reservation}*, veuillez effectuer le paiement via Orange Money :\n\n📱 Numéro : *{numero_paiement}*\n💰 Montant exact : *{montant} FCFA*\n📝 Objet : {code_reservation}\n\nUne fois le paiement effectué, envoyez-nous la capture d'écran de confirmation.\n\nL&Lui Signature`,
    template3_confirmation: `✅ *Paiement confirmé !*\n\nBonjour {nom_client},\n\nNous avons bien reçu votre paiement pour la réservation *{code_reservation}*.\n\nVotre séjour est désormais *officiellement confirmé* ! Vous recevrez sous peu votre fiche d'accueil et QR Code.\n\nL&Lui Signature`,
    template4_fiche: `🌊 *Fiche d'accueil — L&Lui Signature – Kribi*\n\nBonjour {nom_client},\n\nVotre séjour du {date_arrivee} → {date_depart} à Kribi approche ! Nous sommes ravis de vous accueillir.\n\n📍 Votre hébergement : *{produit}*\n👥 {personnes} personne(s)\n🔑 Code réservation : *{code_reservation}*\n\nRetrouvez tous les détails de votre réservation et votre QR Code d'accès ici :\n👉 {lien_suivi}\n\n🎁 *Avantage Membre L&Lui Stars :*\nEn tant que membre {niveau_fidelite}, vous bénéficiez de {reduction_boutique} sur toute notre boutique en ligne.\n🛍️ Commander sur la boutique : http://l-et-lui-signature.com\n\nÀ très vite sous le soleil de Kribi !\nL'équipe L&Lui Signature 🌺`,
  }
  if (!doc.exists) return defaults
  return { ...defaults, ...doc.data() }
}

// ============================================================
// Interpolation d'un template avec les variables
// ============================================================
function interpolate(template: string, vars: Record<string, string>): string {
  return template
    .replace(/\{nom_client\}/g, vars.nom_client || '')
    .replace(/\{produit\}/g, vars.produit || '')
    .replace(/\{dates\}/g, vars.dates || '')
    .replace(/\{personnes\}/g, vars.personnes || '')
    .replace(/\{montant\}/g, vars.montant || '')
    .replace(/\{code_reservation\}/g, vars.code_reservation || '')
    .replace(/\{numero_paiement\}/g, vars.numero_paiement || '')
    .replace(/\{partenaire\}/g, vars.partenaire || '')
    .replace(/\{lien_suivi\}/g, vars.lien_suivi || '')
}

// ============================================================
// Logger un envoi WhatsApp sur la réservation
// ============================================================
async function logWhatsAppSend(
  reservationId: string,
  button: 1 | 2 | 3 | 4,
  buttonLabel: string,
  sentBy: string,
  phone: string
) {
  await db.collection('reservations').doc(reservationId).collection('whatsapp_logs').add({
    reservation_id: reservationId,
    button,
    button_label: buttonLabel,
    sent_by: sentBy,
    sent_at: new Date().toISOString(),
    phone,
  })
}

// ============================================================
// BOUTON 1 — Envoi proposition
// ============================================================
export async function sendWhatsAppProposal(
  reservationId: string,
  sentBy: string = 'admin'
): Promise<ActionResult & { url?: string }> {
  try {
    const doc = await db.collection('reservations').doc(reservationId).get()
    if (!doc.exists) return { success: false, error: 'Réservation introuvable' }
    const res = doc.data()!

    // Récupérer le numéro WhatsApp du partenaire si applicable
    let phoneNumber = ADMIN_WHATSAPP
    if (res.partner_id) {
      const partnerDoc = await db.collection('partenaires').doc(res.partner_id).get()
      if (partnerDoc.exists && partnerDoc.data()?.whatsapp_number) {
        phoneNumber = partnerDoc.data()!.whatsapp_number
      }
    }

    const templates = await getTemplates()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://llui-signature.cm'
    const lienSuivi = `${baseUrl}/suivi/${reservationId}`

    const productName = res.accommodation?.name || res.pack_name || 'Hébergement'
    const checkIn = new Date(res.check_in).toLocaleDateString('fr-FR')
    const checkOut = new Date(res.check_out).toLocaleDateString('fr-FR')

    const message = interpolate(templates.template1_proposal, {
      nom_client: `${res.guest_first_name} ${res.guest_last_name}`,
      produit: productName,
      dates: `${checkIn} → ${checkOut} (${res.nights} nuit${res.nights > 1 ? 's' : ''})`,
      personnes: String(res.guests),
      montant: new Intl.NumberFormat('fr-FR').format(res.total_price),
      code_reservation: res.confirmation_code || reservationId.slice(-8).toUpperCase(),
      numero_paiement: ADMIN_WHATSAPP,
      partenaire: res.partner_name || 'L&Lui Signature',
      lien_suivi: lienSuivi,
    })

    const clientPhone = res.guest_phone?.replace(/\D/g, '') || ''
    const url = `https://wa.me/${clientPhone}?text=${encodeURIComponent(message)}`

    // Enregistrement Firestore
    await doc.ref.update({
      whatsapp_proposal_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await logWhatsAppSend(reservationId, 1, 'Proposition', sentBy, clientPhone)

    revalidatePath(`/admin/reservations/${reservationId}`)
    revalidatePath(`/partenaire/reservations/${reservationId}`)

    return { success: true, url }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur envoi proposition' }
  }
}

// ============================================================
// BOUTON 2 — Demande de paiement Orange Money
// ============================================================
export async function sendWhatsAppPaymentRequest(
  reservationId: string,
  sentBy: string = 'admin'
): Promise<ActionResult & { url?: string }> {
  try {
    const doc = await db.collection('reservations').doc(reservationId).get()
    if (!doc.exists) return { success: false, error: 'Réservation introuvable' }
    const res = doc.data()!

    // Numéro Orange Money du partenaire ou admin
    // Priorité : payment_settings.orange_money_number > whatsapp_number > L&Lui admin
    let omNumber = ADMIN_WHATSAPP
    if (res.partner_id) {
      const partnerDoc = await db.collection('partenaires').doc(res.partner_id).get()
      if (partnerDoc.exists) {
        const pdata = partnerDoc.data()!
        const omFromSettings = pdata.payment_settings?.orange_money_number?.trim()
        const omFromWhatsapp = pdata.whatsapp_number?.trim()
        omNumber = omFromSettings || omFromWhatsapp || ADMIN_WHATSAPP
      }
    }

    const templates = await getTemplates()
    const confirmCode = res.confirmation_code || `LLS-${new Date().getFullYear()}-${reservationId.slice(-5).toUpperCase()}`

    const message = interpolate(templates.template2_payment, {
      nom_client: `${res.guest_first_name} ${res.guest_last_name}`,
      produit: res.accommodation?.name || res.pack_name || '',
      dates: '',
      personnes: String(res.guests),
      montant: new Intl.NumberFormat('fr-FR').format(res.total_price),
      code_reservation: confirmCode,
      numero_paiement: omNumber,
      partenaire: res.partner_name || 'L&Lui Signature',
      lien_suivi: '',
    })

    const clientPhone = res.guest_phone?.replace(/\D/g, '') || ''
    const url = `https://wa.me/${clientPhone}?text=${encodeURIComponent(message)}`

    await doc.ref.update({
      whatsapp_payment_request_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await logWhatsAppSend(reservationId, 2, 'Demande paiement', sentBy, clientPhone)

    revalidatePath(`/admin/reservations/${reservationId}`)
    revalidatePath(`/partenaire/reservations/${reservationId}`)

    return { success: true, url }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur demande paiement' }
  }
}

// ============================================================
// BOUTON 3 — Confirmation de paiement
// ============================================================
export async function confirmPayment(
  reservationId: string,
  paymentReference: string,
  paymentDate: string,
  confirmedBy: string = 'admin',
  paymentMethod: string = 'orange_money'
): Promise<ActionResult> {
  try {
    const doc = await db.collection('reservations').doc(reservationId).get()
    if (!doc.exists) return { success: false, error: 'Réservation introuvable' }
    const res = doc.data()!

    await doc.ref.update({
      payment_status: 'paye',
      payment_reference: paymentReference,
      payment_date: paymentDate || new Date().toISOString(),
      payment_method: paymentMethod,
      confirmed_by: confirmedBy,
      updated_at: new Date().toISOString(),
    })

    const clientPhone = res.guest_phone?.replace(/\D/g, '') || ''
    await logWhatsAppSend(reservationId, 3, 'Confirmation paiement', confirmedBy, clientPhone)

    revalidatePath(`/admin/reservations/${reservationId}`)
    revalidatePath(`/partenaire/reservations/${reservationId}`)

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur confirmation paiement' }
  }
}

// ============================================================
// BOUTON 4 — Envoi fiche avec QR Code (template V2)
// Utilisé par l'espace partenaire (auto-détection loyauté)
// ============================================================
export async function sendWhatsAppFiche(
  reservationId: string,
  sentBy: string = 'admin'
): Promise<ActionResult & { url?: string }> {
  try {
    const doc = await db.collection('reservations').doc(reservationId).get()
    if (!doc.exists) return { success: false, error: 'Réservation introuvable' }
    const res = doc.data()!

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://llui-signature-hebergements.vercel.app'
    const lienSuivi = `${baseUrl}/suivi/${reservationId}`

    const checkIn = new Date(res.check_in).toLocaleDateString('fr-FR')
    const checkOut = new Date(res.check_out).toLocaleDateString('fr-FR')
    const confirmCode = res.confirmation_code || reservationId.slice(-8).toUpperCase()

    // Lookup loyalty level depuis la collection clients
    let niveauFidelite: NiveauFidelite = null
    if (res.guest_email) {
      const clientSnap = await db.collection('clients')
        .where('email', '==', res.guest_email.toLowerCase().trim())
        .limit(1)
        .get()
      if (!clientSnap.empty) {
        niveauFidelite = clientSnap.docs[0].data().niveau || 'novice'
      }
    }

    // Auto-détection : version complète si client trouvé, simplifiée sinon
    const variant: FicheVariant = niveauFidelite ? 'complete' : 'simple'

    const message = buildFicheV2({
      clientName: `${res.guest_first_name} ${res.guest_last_name}`,
      dateArrivee: checkIn,
      dateDepart: checkOut,
      nomLogement: res.accommodation?.name || res.pack_name || '',
      nombrePersonnes: res.guests,
      codeReservation: confirmCode,
      lienSuivi,
      niveauFidelite,
    }, variant)

    // Générer QR si pas encore fait
    let qrCodeData = res.qr_code_data
    if (!qrCodeData && confirmCode) {
      const qrData = encodeURIComponent(`${baseUrl}/partenaire/scanner?code=${confirmCode}`)
      qrCodeData = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}&bgcolor=FFFFFF&color=1A1A1A&margin=10`
    }

    const clientPhone = res.guest_phone?.replace(/\D/g, '') || ''
    const url = `https://wa.me/${clientPhone}?text=${encodeURIComponent(message)}`

    await doc.ref.update({
      whatsapp_confirmation_sent_at: new Date().toISOString(),
      reservation_status: 'confirmee',
      confirmed_at: new Date().toISOString(),
      qr_code_data: qrCodeData,
      confirmation_code: confirmCode,
      updated_at: new Date().toISOString(),
    })

    await logWhatsAppSend(reservationId, 4, 'Fiche + QR Code', sentBy, clientPhone)

    // Créer/mettre à jour le profil client L&Lui Stars
    if (res.guest_email) {
      await syncClientFromReservation({
        email: res.guest_email,
        firstName: res.guest_first_name || '',
        lastName: res.guest_last_name || '',
        phone: res.guest_phone || '',
        reservationDate: new Date().toISOString(),
      }).catch(() => {})
    }

    revalidatePath(`/admin/reservations/${reservationId}`)
    revalidatePath(`/partenaire/reservations/${reservationId}`)

    return { success: true, url }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur envoi fiche' }
  }
}

// ============================================================
// Récupérer l'historique des logs WhatsApp
// ============================================================
export async function getWhatsAppLogs(reservationId: string) {
  const snap = await db
    .collection('reservations')
    .doc(reservationId)
    .collection('whatsapp_logs')
    .orderBy('sent_at', 'asc')
    .get()

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ============================================================
// FONCTIONS PRÉPARATION MESSAGES (sans enregistrement Firestore)
// Utilisées par la modale de prévisualisation avant envoi effectif
// ============================================================

export async function prepareWhatsAppProposal(
  reservationId: string
): Promise<{ success: true; message: string; url: string; phone: string; recipientName: string } | { success: false; error: string }> {
  try {
    const doc = await db.collection('reservations').doc(reservationId).get()
    if (!doc.exists) return { success: false, error: 'Réservation introuvable' }
    const res = doc.data()!

    const templates = await getTemplates()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://llui-signature.cm'
    const lienSuivi = `${baseUrl}/suivi/${reservationId}`

    const productName = res.accommodation?.name || res.pack_name || 'Hébergement'
    const checkIn = new Date(res.check_in).toLocaleDateString('fr-FR')
    const checkOut = new Date(res.check_out).toLocaleDateString('fr-FR')

    const message = interpolate(templates.template1_proposal, {
      nom_client: `${res.guest_first_name} ${res.guest_last_name}`,
      produit: productName,
      dates: `${checkIn} → ${checkOut} (${res.nights} nuit${res.nights > 1 ? 's' : ''})`,
      personnes: String(res.guests),
      montant: new Intl.NumberFormat('fr-FR').format(res.total_price),
      code_reservation: res.confirmation_code || reservationId.slice(-8).toUpperCase(),
      numero_paiement: ADMIN_WHATSAPP,
      partenaire: res.partner_name || 'L&Lui Signature',
      lien_suivi: lienSuivi,
    })

    const clientPhone = res.guest_phone?.replace(/\D/g, '') || ''
    const url = `https://wa.me/${clientPhone}?text=${encodeURIComponent(message)}`

    return {
      success: true,
      message,
      url,
      phone: clientPhone,
      recipientName: `${res.guest_first_name} ${res.guest_last_name}`,
    }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur préparation proposition' }
  }
}

export async function prepareWhatsAppPaymentRequest(
  reservationId: string,
  includeRevolut: boolean = true
): Promise<{ success: true; message: string; url: string; phone: string; recipientName: string; revolvotLink: string } | { success: false; error: string }> {
  try {
    const doc = await db.collection('reservations').doc(reservationId).get()
    if (!doc.exists) return { success: false, error: 'Réservation introuvable' }
    const res = doc.data()!

    const paymentInfo = await resolvePaymentSettingsForReservation(res.partner_id)
    const omNumber = paymentInfo.omNumber
    const revolut = paymentInfo.revolut

    const templates = await getTemplates()
    const confirmCode = res.confirmation_code || `LLS-${new Date().getFullYear()}-${reservationId.slice(-5).toUpperCase()}`
    const montant = new Intl.NumberFormat('fr-FR').format(res.total_price)

    let baseMessage = interpolate(templates.template2_payment, {
      nom_client: `${res.guest_first_name} ${res.guest_last_name}`,
      produit: res.accommodation?.name || res.pack_name || '',
      dates: '',
      personnes: String(res.guests),
      montant,
      code_reservation: confirmCode,
      numero_paiement: omNumber,
      partenaire: res.partner_name || 'L&Lui Signature',
      lien_suivi: '',
    })

    if (includeRevolut) {
      baseMessage += `\n\n💳 *Option 2 — Carte bancaire / Revolut :*\nLien : ${revolut.link}\nMontant : *${montant} FCFA*\n${revolut.message}`
    }

    const clientPhone = res.guest_phone?.replace(/\D/g, '') || ''
    const url = `https://wa.me/${clientPhone}?text=${encodeURIComponent(baseMessage)}`

    return {
      success: true,
      message: baseMessage,
      url,
      phone: clientPhone,
      recipientName: `${res.guest_first_name} ${res.guest_last_name}`,
      revolvotLink: revolut.link,
    }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur préparation demande paiement' }
  }
}

export async function prepareWhatsAppFiche(
  reservationId: string
): Promise<{
  success: true
  messageComplete: string
  messageSimple: string
  urlComplete: string
  urlSimple: string
  phone: string
  recipientName: string
  clientNiveau: NiveauFidelite
} | { success: false; error: string }> {
  try {
    const doc = await db.collection('reservations').doc(reservationId).get()
    if (!doc.exists) return { success: false, error: 'Réservation introuvable' }
    const res = doc.data()!

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://llui-signature-hebergements.vercel.app'
    const lienSuivi = `${baseUrl}/suivi/${reservationId}`

    const checkIn = new Date(res.check_in).toLocaleDateString('fr-FR')
    const checkOut = new Date(res.check_out).toLocaleDateString('fr-FR')
    const confirmCode = res.confirmation_code || reservationId.slice(-8).toUpperCase()

    // Lookup loyalty level depuis la collection clients
    let niveauFidelite: NiveauFidelite = null
    if (res.guest_email) {
      const clientSnap = await db.collection('clients')
        .where('email', '==', res.guest_email.toLowerCase().trim())
        .limit(1)
        .get()
      if (!clientSnap.empty) {
        niveauFidelite = clientSnap.docs[0].data().niveau || 'novice'
      }
    }

    const ficheParams = {
      clientName: `${res.guest_first_name} ${res.guest_last_name}`,
      dateArrivee: checkIn,
      dateDepart: checkOut,
      nomLogement: res.accommodation?.name || res.pack_name || '',
      nombrePersonnes: res.guests,
      codeReservation: confirmCode,
      lienSuivi,
      niveauFidelite,
    }

    const messageComplete = buildFicheV2(ficheParams, 'complete')
    const messageSimple = buildFicheV2(ficheParams, 'simple')

    const clientPhone = res.guest_phone?.replace(/\D/g, '') || ''
    const urlComplete = `https://wa.me/${clientPhone}?text=${encodeURIComponent(messageComplete)}`
    const urlSimple = `https://wa.me/${clientPhone}?text=${encodeURIComponent(messageSimple)}`

    return {
      success: true,
      messageComplete,
      messageSimple,
      urlComplete,
      urlSimple,
      phone: clientPhone,
      recipientName: `${res.guest_first_name} ${res.guest_last_name}`,
      clientNiveau: niveauFidelite,
    }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur préparation fiche' }
  }
}

/**
 * Enregistre l'horodatage d'un envoi WhatsApp dans Firestore.
 * Appelé APRÈS que l'utilisateur a cliqué sur "Ouvrir WhatsApp".
 */
export async function recordWhatsAppSent(
  reservationId: string,
  button: 1 | 2 | 4,
  sentBy: string,
  phone: string,
  message?: string
): Promise<ActionResult> {
  try {
    const now = new Date().toISOString()
    const updates: Record<string, string> = { updated_at: now }

    if (button === 1) updates.whatsapp_proposal_sent_at = now
    if (button === 2) updates.whatsapp_payment_request_sent_at = now
    if (button === 4) {
      updates.whatsapp_confirmation_sent_at = now
      // Confirmer la réservation lors de l'envoi de la fiche
      const doc = await db.collection('reservations').doc(reservationId).get()
      if (doc.exists && doc.data()?.reservation_status !== 'confirmee') {
        const res = doc.data()!
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://llui-signature.cm'
        const confirmCode = res.confirmation_code || reservationId.slice(-8).toUpperCase()
        const qrData = encodeURIComponent(`${baseUrl}/partenaire/scanner?code=${confirmCode}`)
        const qrCodeData = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}&bgcolor=FFFFFF&color=1A1A1A&margin=10`
        updates.reservation_status = 'confirmee'
        updates.confirmed_at = now
        updates.qr_code_data = qrCodeData
        updates.confirmation_code = confirmCode
      }
    }

    await db.collection('reservations').doc(reservationId).update(updates)

    // Si bouton 4 vient de confirmer la réservation → sync profil Stars
    if (button === 4) {
      await syncClientFromReservationId(reservationId).catch(() => {})
    }

    const labels: Record<number, string> = { 1: 'Proposition', 2: 'Demande paiement', 4: 'Fiche + QR Code' }
    await logWhatsAppSend(reservationId, button, labels[button] || String(button), sentBy, phone)

    revalidatePath(`/admin/reservations/${reservationId}`)
    revalidatePath(`/partenaire/reservations/${reservationId}`)

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur enregistrement envoi' }
  }
}

// ============================================================
// Rapport journalier — résumé
// ============================================================
export async function getDailyReport() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const snap = await db.collection('reservations').get()
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]

  const todayReservations = all.filter((r) => r.created_at?.startsWith(todayStr))
  const todayPaid = all.filter((r) => r.payment_date?.startsWith(todayStr))
  const pendingDemands = all.filter((r) => r.reservation_status === 'demande')

  const totalRevenue = todayPaid.reduce((sum: number, r: any) => sum + (r.total_price || 0), 0)
  const totalCommissions = todayPaid.reduce((sum: number, r: any) => sum + (r.commission_amount || 0), 0)

  // Récupérer les demandes de disponibilité
  const demandesSnap = await db.collection('demandes_disponibilite')
    .where('status', '==', 'en_attente')
    .get()

  return {
    reservations_today: todayReservations.length,
    payments_today: todayPaid.length,
    revenue_today: totalRevenue,
    commissions_today: totalCommissions,
    pending_demands: demandesSnap.size,
    pending_reservations: pendingDemands.length,
  }
}

// ============================================================
// Rapport journalier — envoi WhatsApp admin
// ============================================================
export async function sendDailyReportWhatsApp(): Promise<ActionResult & { url?: string }> {
  try {
    const report = await getDailyReport()
    const today = new Date().toLocaleDateString('fr-FR')

    const message = `📊 *Rapport L&Lui Signature — ${today}*\n\n` +
      `📋 Nouvelles réservations : *${report.reservations_today}*\n` +
      `💳 Paiements reçus : *${report.payments_today}*\n` +
      `💰 Revenu du jour : *${new Intl.NumberFormat('fr-FR').format(report.revenue_today)} FCFA*\n` +
      `🏆 Commissions : *${new Intl.NumberFormat('fr-FR').format(report.commissions_today)} FCFA*\n` +
      `⏳ Demandes en attente : *${report.pending_demands}*\n` +
      `🔄 Réservations en cours : *${report.pending_reservations}*`

    const url = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`
    return { success: true, url }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
