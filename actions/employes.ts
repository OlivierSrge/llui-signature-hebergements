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
  const snap = await db.collection('employes_partenaire')
    .where('partenaire_id', '==', partenaireId)
    .orderBy('created_at', 'desc')
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Employe))
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
