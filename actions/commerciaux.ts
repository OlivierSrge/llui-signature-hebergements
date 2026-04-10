'use server'

import { db, getStorageBucket } from '@/lib/firebase'
import { createHash } from 'crypto'
import QRCode from 'qrcode'
import { sendWhatsApp } from '@/lib/whatsappNotif'
import { revalidatePath } from 'next/cache'
import { calculateReservation } from '@/lib/utils'

export interface Commercial {
  id: string
  partenaire_id: string
  nom_complet: string
  telephone: string
  pin_hash: string
  qr_code_url: string
  qr_code_data: string
  qr_genere_le: string
  qr_expire_at: string
  statut: 'actif' | 'expire' | 'suspendu'
  total_reservations: number
  commission_totale_fcfa: number
  created_at: string
  created_by: string
}

export interface CommissionCommercial {
  id: string
  commercial_id: string
  commercial_nom: string
  partenaire_id: string
  partenaire_nom: string
  reservation_id: string
  montant_total_fcfa: number
  part_llui_fcfa: number
  part_commercial_fcfa: number
  statut: 'due' | 'versee'
  created_at: string
  versee_at: string | null
  versee_par: string | null
}

function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex')
}

function genererPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

// ─── Créer un commercial ──────────────────────────────────────

export async function creerCommercial(
  partenaireId: string,
  data: { nom_complet: string; telephone: string }
): Promise<{ success: boolean; commercial_id?: string; pin?: string; qr_code_url?: string; error?: string }> {
  try {
    // Vérifier la limite de 5 commerciaux actifs
    const existingSnap = await db.collection('commerciaux_partenaire')
      .where('partenaire_id', '==', partenaireId)
      .get()
    const actifs = existingSnap.docs.filter((d) => d.data().statut !== 'suspendu')
    if (actifs.length >= 5) {
      return { success: false, error: 'Maximum 5 commerciaux actifs par partenaire' }
    }

    const pin = genererPin()
    const pin_hash = hashPin(pin)
    const ref = db.collection('commerciaux_partenaire').doc()
    const commercial_id = ref.id

    // QR expire dans 30 jours
    const now = new Date()
    const expireAt = new Date(now)
    expireAt.setDate(expireAt.getDate() + 30)

    // Générer QR commercial
    const qrData = JSON.stringify({ type: 'commercial', commercial_id, partenaire_id: partenaireId })
    const qrBuffer = await QRCode.toBuffer(qrData, { type: 'png', width: 400, margin: 2 })
    const bucket = getStorageBucket()
    const file = bucket.file(`commerciaux/qr/${commercial_id}.png`)
    await file.save(qrBuffer, { contentType: 'image/png', public: true })
    const qr_code_url = `https://storage.googleapis.com/${bucket.name}/commerciaux/qr/${commercial_id}.png`

    await ref.set({
      partenaire_id: partenaireId,
      nom_complet: data.nom_complet,
      telephone: data.telephone,
      pin_hash,
      qr_code_url,
      qr_code_data: qrData,
      qr_genere_le: now.toISOString(),
      qr_expire_at: expireAt.toISOString(),
      statut: 'actif',
      total_reservations: 0,
      commission_totale_fcfa: 0,
      created_at: now.toISOString(),
      created_by: partenaireId,
    })

    // SMS WhatsApp au commercial
    try {
      const partenaireDoc = await db.collection('partenaires').doc(partenaireId).get()
      const nomPartenaire = (partenaireDoc.data()?.name as string | undefined) ?? 'L&Lui Signature'
      const msg = `Bonjour ${data.nom_complet} ! Votre acces commercial ${nomPartenaire} est active. PIN : ${pin}. Scannez votre QR code pour enregistrer des clients et gagner des commissions. QR valable jusqu'au ${expireAt.toLocaleDateString('fr-FR')}. — L&Lui Signature`
      await sendWhatsApp(data.telephone, msg)
    } catch {}

    revalidatePath('/partenaire/dashboard')
    return { success: true, commercial_id, pin, qr_code_url }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Lister les commerciaux d'un partenaire ───────────────────

export async function getCommerciaux(partenaireId: string): Promise<Commercial[]> {
  try {
    const snap = await db.collection('commerciaux_partenaire')
      .where('partenaire_id', '==', partenaireId)
      .get()
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Commercial))
    return docs.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  } catch {
    return []
  }
}

// ─── Renouveler le QR (30 jours de plus) ─────────────────────

export async function renouvelerQrCommercial(
  commercialId: string
): Promise<{ success: boolean; qr_code_url?: string; qr_expire_at?: string; error?: string }> {
  try {
    const doc = await db.collection('commerciaux_partenaire').doc(commercialId).get()
    if (!doc.exists) return { success: false, error: 'Commercial introuvable' }
    const commercial = { id: doc.id, ...doc.data() } as Commercial

    const now = new Date()
    const expireAt = new Date(now)
    expireAt.setDate(expireAt.getDate() + 30)

    const qrData = JSON.stringify({
      type: 'commercial',
      commercial_id: commercialId,
      partenaire_id: commercial.partenaire_id,
    })
    const qrBuffer = await QRCode.toBuffer(qrData, { type: 'png', width: 400, margin: 2 })
    const bucket = getStorageBucket()
    const file = bucket.file(`commerciaux/qr/${commercialId}.png`)
    await file.save(qrBuffer, { contentType: 'image/png', public: true })
    const qr_code_url = `https://storage.googleapis.com/${bucket.name}/commerciaux/qr/${commercialId}.png`

    await db.collection('commerciaux_partenaire').doc(commercialId).update({
      qr_code_url,
      qr_code_data: qrData,
      qr_genere_le: now.toISOString(),
      qr_expire_at: expireAt.toISOString(),
      statut: 'actif',
    })

    // Notifier le commercial
    try {
      const msg = `Bonjour ${commercial.nom_complet} ! Votre QR commercial L&Lui Signature a ete renouvele. Il est valable jusqu'au ${expireAt.toLocaleDateString('fr-FR')}. — L&Lui Signature`
      await sendWhatsApp(commercial.telephone, msg)
    } catch {}

    revalidatePath('/partenaire/dashboard')
    return { success: true, qr_code_url, qr_expire_at: expireAt.toISOString() }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Vérifier PIN commercial ──────────────────────────────────

export async function verifierPinCommercial(
  commercial_id: string,
  pin_hash: string
): Promise<{ success: boolean; commercial?: Commercial; error?: string }> {
  try {
    const doc = await db.collection('commerciaux_partenaire').doc(commercial_id).get()
    if (!doc.exists) return { success: false, error: 'Commercial introuvable' }
    const commercial = { id: doc.id, ...doc.data() } as Commercial

    if (commercial.statut === 'suspendu') return { success: false, error: 'Acces suspendu' }

    // Vérifier expiry
    if (new Date(commercial.qr_expire_at) < new Date()) {
      await db.collection('commerciaux_partenaire').doc(commercial_id).update({ statut: 'expire' })
      return { success: false, error: 'QR expire. Demandez un renouvellement a votre partenaire.' }
    }

    if (commercial.pin_hash !== pin_hash) return { success: false, error: 'PIN incorrect' }
    return { success: true, commercial }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Récupérer un commercial ──────────────────────────────────

export async function getCommercial(commercial_id: string): Promise<Commercial | null> {
  const doc = await db.collection('commerciaux_partenaire').doc(commercial_id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as Commercial
}

// ─── Logements d'un partenaire (pour le formulaire commercial) ─

export async function getAccommodationsByPartner(
  partenaireId: string
): Promise<{ id: string; name: string; price_per_night: number; commission_rate: number }[]> {
  try {
    const snap = await db.collection('hebergements')
      .where('partner_id', '==', partenaireId)
      .where('status', '==', 'active')
      .get()
    return snap.docs.map((d) => ({
      id: d.id,
      name: (d.data().name ?? d.data().titre ?? 'Logement') as string,
      price_per_night: (d.data().price_per_night ?? 0) as number,
      commission_rate: (d.data().commission_rate ?? 15) as number,
    }))
  } catch {
    return []
  }
}

// ─── Créer réservation via commercial ────────────────────────

export async function createCommercialReservation(
  formData: FormData
): Promise<{ success: true; reservationId: string; confirmationCode: string; montant: number; nuits: number } | { success: false; error: string }> {
  try {
    const commercialId = formData.get('commercial_id') as string
    const commercialNom = formData.get('commercial_nom') as string
    const partenaireId = formData.get('partenaire_id') as string
    const accommodationId = formData.get('accommodation_id') as string
    const checkIn = formData.get('check_in') as string
    const checkOut = formData.get('check_out') as string
    const guests = Number(formData.get('guests')) || 1
    const guestFirstName = formData.get('guest_first_name') as string
    const guestLastName = formData.get('guest_last_name') as string
    const guestPhone = (formData.get('guest_phone') as string) || ''

    // Vérifier le commercial
    const commercialDoc = await db.collection('commerciaux_partenaire').doc(commercialId).get()
    if (!commercialDoc.exists) return { success: false, error: 'Commercial introuvable' }
    const commercial = { id: commercialDoc.id, ...commercialDoc.data() } as Commercial
    if (commercial.statut !== 'actif') return { success: false, error: 'Acces commercial inactif' }
    if (new Date(commercial.qr_expire_at) < new Date()) return { success: false, error: 'QR expire. Demandez un renouvellement.' }

    // Vérifier le partenaire
    const partnerDoc = await db.collection('partenaires').doc(partenaireId).get()
    if (!partnerDoc.exists) return { success: false, error: 'Partenaire introuvable' }
    const partnerData = partnerDoc.data()!
    if (!partnerData.is_active) return { success: false, error: 'Partenaire inactif' }

    // Vérifier l'hébergement
    const accDoc = await db.collection('hebergements').doc(accommodationId).get()
    if (!accDoc.exists) return { success: false, error: 'Hebergement introuvable' }
    const accommodation = accDoc.data()!
    if (accommodation.partner_id !== partenaireId) return { success: false, error: 'Hebergement non autorise' }

    // Calculer le prix
    const { nights, subtotal, commissionAmount } = calculateReservation(
      accommodation.price_per_night,
      checkIn,
      checkOut,
      accommodation.commission_rate ?? 15
    )
    if (nights <= 0) return { success: false, error: 'Dates invalides' }

    // Commission commerciale: 50% L&Lui / 50% commercial
    const partLlui = Math.round(commissionAmount * 0.5)
    const partCommercial = commissionAmount - partLlui

    // Générer code confirmation
    const year = new Date().getFullYear()
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let suffix = ''
    for (let i = 0; i < 5; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
    const confirmationCode = `LLS-${year}-${suffix}`

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
      guest_email: '',
      guest_phone: guestPhone,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      nights,
      price_per_night: accommodation.price_per_night,
      subtotal,
      commission_rate: accommodation.commission_rate ?? 15,
      commission_amount: commissionAmount,
      total_price: subtotal,
      payment_method: 'a_definir',
      payment_status: 'en_attente',
      payment_reference: null,
      payment_date: null,
      reservation_status: 'en_attente',
      confirmed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
      notes: null,
      admin_notes: null,
      source: 'commercial',
      partner_id: partenaireId,
      partner_name: partnerData.name,
      confirmation_code: confirmationCode,
      check_in_confirmed: false,
      check_in_date: null,
      checked_in_by: null,
      // Champs commerciaux
      apporte_par_type: 'commercial',
      commercial_id: commercialId,
      commercial_nom: commercialNom,
      commission_llui_globale_fcfa: commissionAmount,
      commission_llui_part_fcfa: partLlui,
      commission_commercial_part_fcfa: partCommercial,
      commission_commercial_statut: 'due',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Créer le document commission commerciale
    await db.collection('commissions_commerciaux').add({
      commercial_id: commercialId,
      commercial_nom: commercialNom,
      partenaire_id: partenaireId,
      partenaire_nom: partnerData.name as string,
      reservation_id: docRef.id,
      montant_total_fcfa: commissionAmount,
      part_llui_fcfa: partLlui,
      part_commercial_fcfa: partCommercial,
      statut: 'due',
      created_at: new Date().toISOString(),
      versee_at: null,
      versee_par: null,
    })

    // Mettre à jour les stats du commercial
    await db.collection('commerciaux_partenaire').doc(commercialId).update({
      total_reservations: commercial.total_reservations + 1,
      commission_totale_fcfa: commercial.commission_totale_fcfa + partCommercial,
    })

    // WhatsApp au partenaire
    try {
      const partenairePhone = (partnerData.phone ?? partnerData.whatsapp_number ?? '') as string
      if (partenairePhone) {
        const msg = `Nouvelle reservation via votre commercial ${commercialNom} ! Client : ${guestFirstName} ${guestLastName} — ${checkIn} au ${checkOut} — ${accommodation.name as string}. Montant : ${subtotal.toLocaleString('fr-FR')} FCFA. Commission commerciale : ${partCommercial.toLocaleString('fr-FR')} FCFA. — L&Lui Signature`
        await sendWhatsApp(partenairePhone, msg)
      }
    } catch {}

    revalidatePath('/partenaire/dashboard')
    revalidatePath('/admin/reservations')

    return { success: true, reservationId: docRef.id, confirmationCode, montant: subtotal, nuits: nights }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Statistiques commissions (admin) ────────────────────────

export interface CommissionStatAdmin {
  commercial_id: string
  commercial_nom: string
  commercial_telephone: string
  partenaire_nom: string
  total_reservations: number
  montant_total_fcfa: number
  part_commercial_fcfa: number
  part_llui_fcfa: number
  dues_fcfa: number
  versees_fcfa: number
}

export async function getCommissionsCommerciaux(): Promise<{
  total_fcfa: number
  llui_part_fcfa: number
  commercial_part_fcfa: number
  dues_fcfa: number
  versees_fcfa: number
  par_commercial: CommissionStatAdmin[]
}> {
  try {
    const snap = await db.collection('commissions_commerciaux').get()
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any))

    if (docs.length === 0) {
      return { total_fcfa: 0, llui_part_fcfa: 0, commercial_part_fcfa: 0, dues_fcfa: 0, versees_fcfa: 0, par_commercial: [] }
    }

    const total_fcfa = docs.reduce((s: number, d: any) => s + (d.montant_total_fcfa ?? 0), 0)
    const llui_part_fcfa = docs.reduce((s: number, d: any) => s + (d.part_llui_fcfa ?? 0), 0)
    const commercial_part_fcfa = docs.reduce((s: number, d: any) => s + (d.part_commercial_fcfa ?? 0), 0)
    const dues_fcfa = docs.filter((d: any) => d.statut === 'due').reduce((s: number, d: any) => s + (d.part_commercial_fcfa ?? 0), 0)
    const versees_fcfa = docs.filter((d: any) => d.statut === 'versee').reduce((s: number, d: any) => s + (d.part_commercial_fcfa ?? 0), 0)

    // Charger les téléphones des commerciaux
    const commercialIds = [...new Set(docs.map((d: any) => d.commercial_id as string))]
    const commercialDocs = await Promise.all(
      commercialIds.map((id) => db.collection('commerciaux_partenaire').doc(id).get())
    )
    const commercialPhones: Record<string, string> = {}
    commercialDocs.forEach((d) => {
      if (d.exists) commercialPhones[d.id] = (d.data()!.telephone as string) ?? ''
    })

    // Regrouper par commercial
    const byCommercial: Record<string, CommissionStatAdmin & { _dues: number; _versees: number }> = {}
    for (const d of docs) {
      if (!byCommercial[d.commercial_id]) {
        byCommercial[d.commercial_id] = {
          commercial_id: d.commercial_id,
          commercial_nom: d.commercial_nom ?? '',
          commercial_telephone: commercialPhones[d.commercial_id] ?? '',
          partenaire_nom: d.partenaire_nom ?? '',
          total_reservations: 0,
          montant_total_fcfa: 0,
          part_commercial_fcfa: 0,
          part_llui_fcfa: 0,
          dues_fcfa: 0,
          versees_fcfa: 0,
          _dues: 0,
          _versees: 0,
        }
      }
      byCommercial[d.commercial_id].total_reservations++
      byCommercial[d.commercial_id].montant_total_fcfa += d.montant_total_fcfa ?? 0
      byCommercial[d.commercial_id].part_commercial_fcfa += d.part_commercial_fcfa ?? 0
      byCommercial[d.commercial_id].part_llui_fcfa += d.part_llui_fcfa ?? 0
      if (d.statut === 'due') byCommercial[d.commercial_id].dues_fcfa += d.part_commercial_fcfa ?? 0
      if (d.statut === 'versee') byCommercial[d.commercial_id].versees_fcfa += d.part_commercial_fcfa ?? 0
    }

    return {
      total_fcfa,
      llui_part_fcfa,
      commercial_part_fcfa,
      dues_fcfa,
      versees_fcfa,
      par_commercial: Object.values(byCommercial)
        .map(({ _dues, _versees, ...rest }) => rest)
        .sort((a, b) => b.part_commercial_fcfa - a.part_commercial_fcfa),
    }
  } catch {
    return { total_fcfa: 0, llui_part_fcfa: 0, commercial_part_fcfa: 0, dues_fcfa: 0, versees_fcfa: 0, par_commercial: [] }
  }
}

// ─── Marquer commissions d'un commercial comme versées ────────

export async function marquerCommissionsVersees(
  commercialId: string,
  adminNom: string
): Promise<{ success: boolean; total_verse?: number; error?: string }> {
  try {
    const snap = await db.collection('commissions_commerciaux')
      .where('commercial_id', '==', commercialId)
      .where('statut', '==', 'due')
      .get()

    if (snap.empty) return { success: false, error: 'Aucune commission due trouvee' }

    const now = new Date().toISOString()
    const totalVerse = snap.docs.reduce((s, d) => s + ((d.data().part_commercial_fcfa as number) ?? 0), 0)

    const batch = db.batch()
    snap.docs.forEach((d) => {
      batch.update(d.ref, { statut: 'versee', versee_at: now, versee_par: adminNom })
    })
    await batch.commit()

    // Mettre à jour les réservations associées
    const reservationIds = snap.docs.map((d) => d.data().reservation_id as string)
    await Promise.all(
      reservationIds.map((rid) =>
        db.collection('reservations').doc(rid).update({ commission_commercial_statut: 'versee' })
      )
    )

    // WhatsApp au commercial
    try {
      const commercialDoc = await db.collection('commerciaux_partenaire').doc(commercialId).get()
      if (commercialDoc.exists) {
        const c = commercialDoc.data()!
        const msg = `Bonjour ${c.nom_complet as string} ! Votre commission L&Lui Signature de ${totalVerse.toLocaleString('fr-FR')} FCFA a ete versee. Merci pour votre travail et continuez comme ca ! — L&Lui Signature`
        await sendWhatsApp(c.telephone as string, msg)
      }
    } catch {}

    revalidatePath('/admin/commissions-commerciaux')
    return { success: true, total_verse: totalVerse }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
