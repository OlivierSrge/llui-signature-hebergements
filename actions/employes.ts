'use server'

import { db, getStorageBucket } from '@/lib/firebase'
import { createHash } from 'crypto'
import QRCode from 'qrcode'
import { sendWhatsApp } from '@/lib/whatsappNotif'
import { revalidatePath } from 'next/cache'

export interface Employe {
  id: string
  partenaire_id: string
  nom: string
  telephone: string
  pin_hash: string
  qr_code_url: string
  acces: string[]
  statut: 'actif' | 'suspendu'
  created_at: string
}

function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex')
}

function genererPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

// ─── Créer un employé ─────────────────────────────────────────

export async function creerEmploye(
  partenaireId: string,
  data: { nom: string; telephone: string }
): Promise<{ success: boolean; employe_id?: string; pin?: string; error?: string }> {
  try {
    const pin = genererPin()
    const pin_hash = hashPin(pin)
    const ref = db.collection('employes_partenaire').doc()
    const employe_id = ref.id

    // Générer QR employé
    const qrData = JSON.stringify({ type: 'employe', employe_id, partenaire_id: partenaireId })
    const qrBuffer = await QRCode.toBuffer(qrData, { type: 'png', width: 400, margin: 2 })
    const bucket = getStorageBucket()
    const file = bucket.file(`employes/qr/${employe_id}.png`)
    await file.save(qrBuffer, { contentType: 'image/png', public: true })
    const qr_code_url = `https://storage.googleapis.com/${bucket.name}/employes/qr/${employe_id}.png`

    await ref.set({
      partenaire_id: partenaireId,
      nom: data.nom,
      telephone: data.telephone,
      pin_hash,
      qr_code_url,
      acces: ['enregistrement'],
      statut: 'actif',
      created_at: new Date().toISOString(),
    })

    // SMS Twilio à l'employé
    try {
      const partenaireDoc = await db.collection('partenaires').doc(partenaireId).get()
      const nomPartenaire = (partenaireDoc.data()?.name as string | undefined) ?? 'L&Lui Signature'
      const msg = `Bonjour ${data.nom} ! Votre acces employe ${nomPartenaire} est active. PIN : ${pin}. Scannez votre QR pour enregistrer les clients en l'absence de la direction. — L&Lui Signature`
      await sendWhatsApp(data.telephone, msg)
    } catch {}

    revalidatePath('/partenaire/dashboard')
    return { success: true, employe_id, pin }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Lister les employés d'un partenaire ─────────────────────

export async function getEmployes(partenaireId: string): Promise<Employe[]> {
  try {
    const snap = await db.collection('employes_partenaire')
      .where('partenaire_id', '==', partenaireId)
      .get()
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Employe))
    // Tri côté client (évite index Firestore composite)
    return docs.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  } catch (err) {
    console.error('[getEmployes]', err)
    return []
  }
}

// ─── Changer le statut (actif <-> suspendu) ───────────────────

export async function toggleStatutEmploye(
  employeId: string,
  nouveauStatut: 'actif' | 'suspendu'
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('employes_partenaire').doc(employeId).update({ statut: nouveauStatut })
    revalidatePath('/partenaire/dashboard')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Réinitialiser le PIN ─────────────────────────────────────

export async function reinitialiserPinEmploye(
  employeId: string
): Promise<{ success: boolean; nouveau_pin?: string; error?: string }> {
  try {
    const pin = genererPin()
    const pin_hash = hashPin(pin)
    const doc = await db.collection('employes_partenaire').doc(employeId).get()
    if (!doc.exists) return { success: false, error: 'Employe introuvable' }
    const employe = doc.data() as Employe
    await db.collection('employes_partenaire').doc(employeId).update({ pin_hash })
    // Envoyer le nouveau PIN par SMS
    try {
      const msg = `Bonjour ${employe.nom} ! Votre nouveau PIN L&Lui Signature est : ${pin}. — L&Lui Signature`
      await sendWhatsApp(employe.telephone, msg)
    } catch {}
    return { success: true, nouveau_pin: pin }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Vérifier PIN employé ─────────────────────────────────────

export async function verifierPinEmploye(
  employe_id: string,
  pin_hash: string
): Promise<{ success: boolean; employe?: Employe; error?: string }> {
  try {
    const doc = await db.collection('employes_partenaire').doc(employe_id).get()
    if (!doc.exists) return { success: false, error: 'Employe introuvable' }
    const employe = { id: doc.id, ...doc.data() } as Employe
    if (employe.statut === 'suspendu') return { success: false, error: 'Acces suspendu' }
    if (employe.pin_hash !== pin_hash) return { success: false, error: 'PIN incorrect' }
    return { success: true, employe }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Récupérer un employé ─────────────────────────────────────

export async function getEmploye(employe_id: string): Promise<Employe | null> {
  const doc = await db.collection('employes_partenaire').doc(employe_id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as Employe
}

// ─── Réservations du jour pour un partenaire (usage employé) ──

export interface ReservationResumee {
  id: string
  guest_first_name: string
  guest_last_name: string
  accommodation_name?: string
  check_in: string
  check_out: string
  statut_prescription?: string
  statut?: string
  created_at?: string
}

export async function getReservationsDuJour(
  partenaireId: string
): Promise<ReservationResumee[]> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().slice(0, 10) // "2026-04-05"

    // Récupérer les logements du partenaire
    const accsSnap = await db.collection('hebergements')
      .where('partner_id', '==', partenaireId)
      .get()
    const accIds = accsSnap.docs.map((d) => d.id)
    const accNames: Record<string, string> = {}
    accsSnap.docs.forEach((d) => { accNames[d.id] = (d.data().name ?? d.data().titre ?? 'Logement') as string })

    if (accIds.length === 0) return []

    // Réservations avec check_in aujourd'hui (max 10 logements = limite Firestore 'in')
    const chunks: string[][] = []
    for (let i = 0; i < accIds.length; i += 10) chunks.push(accIds.slice(i, i + 10))

    const all: ReservationResumee[] = []
    for (const chunk of chunks) {
      // Requête simple sans index composite : filtrer côté client
      const snap = await db.collection('reservations')
        .where('accommodation_id', 'in', chunk)
        .limit(50)
        .get()
      snap.docs.forEach((d) => {
        const data = d.data()
        const checkIn = (data.check_in ?? '') as string
        // Garder seulement les réservations d'aujourd'hui (filtre client)
        if (!checkIn.startsWith(todayStr)) return
        all.push({
          id: d.id,
          guest_first_name: (data.guest_first_name ?? '') as string,
          guest_last_name: (data.guest_last_name ?? '') as string,
          accommodation_name: accNames[data.accommodation_id as string],
          check_in: (data.check_in ?? '') as string,
          check_out: (data.check_out ?? '') as string,
          statut_prescription: (data.statut_prescription ?? '') as string,
          statut: (data.statut ?? '') as string,
          created_at: (data.created_at ?? '') as string,
        })
      })
    }
    return all
  } catch (err) {
    console.error('[getReservationsDuJour]', err)
    return []
  }
}

// ─── Confirmer paiement côté employé (tracé) ─────────────────

export async function confirmerPaiementEmploye(
  reservation_id: string,
  employe_id: string,
  employe_nom: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resaDoc = await db.collection('reservations').doc(reservation_id).get()
    if (!resaDoc.exists) return { success: false, error: 'Reservation introuvable' }
    const resa = resaDoc.data()!
    if (!['disponibilite_confirmee', 'prescripteur_present'].includes(resa.statut_prescription ?? '')) {
      return { success: false, error: 'Statut invalide pour confirmer le paiement' }
    }
    await db.collection('reservations').doc(reservation_id).update({
      statut_prescription: 'paiement_confirme',
      paiement_confirme_at: new Date().toISOString(),
      enregistre_par: {
        type: 'employe',
        employe_id,
        employe_nom,
        timestamp: new Date().toISOString(),
      },
    })
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
