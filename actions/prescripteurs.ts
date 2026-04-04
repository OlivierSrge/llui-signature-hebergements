'use server'

import { db, getStorageBucket } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import { createHash } from 'crypto'
import QRCode from 'qrcode'
import { sendWhatsApp } from '@/lib/whatsappNotif'
import { FieldValue } from 'firebase-admin/firestore'

// ─── Types ────────────────────────────────────────────────────

export interface PrescripteurType {
  id: string
  label: string
  commission_fcfa: number
  couleur_badge: string
  abbr: string
}

export interface Prescripteur {
  uid: string
  nom_complet: string
  telephone: string
  type: string
  pin_hash: string
  code_promo: string
  hebergements_assignes: string[]
  commission_fcfa: number
  solde_fcfa: number
  total_clients_amenes: number
  statut: 'actif' | 'suspendu'
  qr_code_url: string
  created_at: string
  created_by: string
}

export interface Retrait {
  id: string
  prescripteur_id: string
  montant_fcfa: number
  methode: string
  numero_mobile_money: string
  statut: 'demande' | 'validee' | 'refusee'
  demande_at: string
  traitee_at?: string
  traitee_par?: string
}

// ─── Seed prescripteur_types ──────────────────────────────────

export async function seedPrescripteurTypes() {
  const types: PrescripteurType[] = [
    { id: 'moto-taxi', label: 'Moto-taxi',  commission_fcfa: 1500, couleur_badge: '#EF9F27', abbr: 'MOTO' },
    { id: 'taxi',      label: 'Taxi',       commission_fcfa: 1500, couleur_badge: '#3B82F6', abbr: 'TAXI' },
    { id: 'hotesse',   label: "Hotesse",    commission_fcfa: 2000, couleur_badge: '#EC4899', abbr: 'HOT'  },
    { id: 'agence',    label: 'Agence',     commission_fcfa: 3000, couleur_badge: '#8B5CF6', abbr: 'AGC'  },
  ]

  const batch = db.batch()
  for (const t of types) {
    const ref = db.collection('prescripteur_types').doc(t.id)
    batch.set(ref, t, { merge: true })
  }
  await batch.commit()
  return { success: true, count: types.length }
}

// ─── Récupérer les types ──────────────────────────────────────

export async function getPrescripteurTypes(): Promise<PrescripteurType[]> {
  const snap = await db.collection('prescripteur_types').get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PrescripteurType))
}

// ─── Lister les prescripteurs ─────────────────────────────────

export async function getPrescripteurs(): Promise<Prescripteur[]> {
  const snap = await db.collection('prescripteurs').orderBy('created_at', 'desc').get()
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Prescripteur))
}

export async function getPrescripteur(uid: string): Promise<Prescripteur | null> {
  const doc = await db.collection('prescripteurs').doc(uid).get()
  if (!doc.exists) return null
  return { uid: doc.id, ...doc.data() } as Prescripteur
}

// ─── Génération code_promo ────────────────────────────────────

function genererCodePromo(nomComplet: string, typeAbbr: string): string {
  const prenom = nomComplet.trim().split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '')
  const annee = new Date().getFullYear().toString().slice(-2)
  return `LLUI-${typeAbbr}-${prenom}-${annee}`
}

// ─── Hash PIN SHA-256 ─────────────────────────────────────────

function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex')
}

// ─── Créer un prescripteur ────────────────────────────────────

export async function creerPrescripteur(data: {
  nom_complet: string
  telephone: string
  type: string
  pin: string
  commission_fcfa: number
  hebergements_assignes: string[]
  statut: 'actif' | 'suspendu'
  created_by: string
}): Promise<{ success: boolean; uid?: string; error?: string }> {
  try {
    // Récupérer l'abbr du type
    const typeDoc = await db.collection('prescripteur_types').doc(data.type).get()
    const typeData = typeDoc.data() as PrescripteurType | undefined
    const abbr = typeData?.abbr ?? data.type.toUpperCase().slice(0, 4)

    const code_promo = genererCodePromo(data.nom_complet, abbr)
    const pin_hash = hashPin(data.pin)

    // Créer le document Firestore (ID auto)
    const ref = db.collection('prescripteurs').doc()
    const uid = ref.id

    // Générer le QR code personnel
    const qrData = JSON.stringify({
      type: 'prescripteur',
      uid,
      nom: data.nom_complet,
      type_prescripteur: data.type,
    })
    const qrBuffer = await QRCode.toBuffer(qrData, { type: 'png', width: 400, margin: 2 })

    // Uploader dans Firebase Storage
    const bucket = getStorageBucket()
    const file = bucket.file(`prescripteurs/qr/${uid}.png`)
    await file.save(qrBuffer, { contentType: 'image/png', public: true })
    const qr_code_url = `https://storage.googleapis.com/${bucket.name}/prescripteurs/qr/${uid}.png`

    const prescripteur: Omit<Prescripteur, 'uid'> = {
      nom_complet: data.nom_complet,
      telephone: data.telephone,
      type: data.type,
      pin_hash,
      code_promo,
      hebergements_assignes: data.hebergements_assignes,
      commission_fcfa: data.commission_fcfa,
      solde_fcfa: 0,
      total_clients_amenes: 0,
      statut: data.statut,
      qr_code_url,
      created_at: new Date().toISOString(),
      created_by: data.created_by,
    }

    await ref.set(prescripteur)

    // Envoyer SMS WhatsApp Twilio
    const prenom = data.nom_complet.trim().split(' ')[0]
    const message = `Bonjour ${prenom} ! Votre compte prescripteur L&Lui Signature est active.\nCode PIN : ${data.pin}\nVotre app : llui-signature-hebergements.vercel.app/prescripteur\nCode promo : ${code_promo}\nCommission : ${data.commission_fcfa} FCFA par client confirme.\nBienvenue dans l equipe ! \u2014 L&Lui Signature Kribi`

    try {
      await sendWhatsApp(data.telephone, message)
    } catch (smsErr) {
      console.error('[Prescripteur] Erreur envoi WhatsApp:', smsErr)
      // Ne pas bloquer la création si le SMS échoue
    }

    revalidatePath('/admin/prescripteurs')
    return { success: true, uid }
  } catch (err: any) {
    console.error('[creerPrescripteur]', err)
    return { success: false, error: err.message ?? 'Erreur inconnue' }
  }
}

// ─── Modifier un prescripteur ─────────────────────────────────

export async function modifierPrescripteur(
  uid: string,
  data: {
    nom_complet?: string
    telephone?: string
    type?: string
    pin?: string
    commission_fcfa?: number
    hebergements_assignes?: string[]
    statut?: 'actif' | 'suspendu'
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const update: Record<string, unknown> = { ...data }
    if (data.pin) {
      update.pin_hash = hashPin(data.pin)
      delete update.pin
    }
    await db.collection('prescripteurs').doc(uid).update(update)
    revalidatePath('/admin/prescripteurs')
    revalidatePath(`/admin/prescripteurs/${uid}`)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Suspendre / Activer ──────────────────────────────────────

export async function toggleStatutPrescripteur(
  uid: string,
  statut: 'actif' | 'suspendu'
): Promise<{ success: boolean }> {
  await db.collection('prescripteurs').doc(uid).update({ statut })
  revalidatePath('/admin/prescripteurs')
  return { success: true }
}

// ─── Historique réservations d'un prescripteur ────────────────

export async function getReservationsPrescripteur(prescripteurId: string) {
  const snap = await db
    .collection('reservations')
    .where('prescripteur_id', '==', prescripteurId)
    .orderBy('created_at', 'desc')
    .limit(50)
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ─── Historique retraits d'un prescripteur ───────────────────

export async function getRetraitsPrescripteur(prescripteurId: string): Promise<Retrait[]> {
  const snap = await db
    .collection('retraits')
    .where('prescripteur_id', '==', prescripteurId)
    .orderBy('demande_at', 'desc')
    .limit(50)
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Retrait))
}

// ─── Valider un retrait ───────────────────────────────────────

export async function validerRetrait(
  retraitId: string,
  adminUid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const retraitRef = db.collection('retraits').doc(retraitId)
    const retraitDoc = await retraitRef.get()
    if (!retraitDoc.exists) return { success: false, error: 'Retrait introuvable' }

    const retrait = retraitDoc.data() as Retrait
    if (retrait.statut !== 'demande') {
      return { success: false, error: 'Ce retrait a deja ete traite' }
    }

    const prescripteurRef = db.collection('prescripteurs').doc(retrait.prescripteur_id)
    const prescripteurDoc = await prescripteurRef.get()
    if (!prescripteurDoc.exists) return { success: false, error: 'Prescripteur introuvable' }

    const prescripteur = prescripteurDoc.data() as Prescripteur
    const nouveauSolde = (prescripteur.solde_fcfa ?? 0) - retrait.montant_fcfa

    // Transaction atomique
    await db.runTransaction(async (tx) => {
      tx.update(retraitRef, {
        statut: 'validee',
        traitee_at: new Date().toISOString(),
        traitee_par: adminUid,
      })
      tx.update(prescripteurRef, { solde_fcfa: nouveauSolde < 0 ? 0 : nouveauSolde })
    })

    // SMS WhatsApp
    const prenom = prescripteur.nom_complet.trim().split(' ')[0]
    const message = `Bonjour ${prenom}, votre retrait de ${retrait.montant_fcfa.toLocaleString('fr-FR')} FCFA a ete effectue. Nouveau solde : ${Math.max(0, nouveauSolde).toLocaleString('fr-FR')} FCFA. \u2014 L&Lui Signature`
    try {
      await sendWhatsApp(prescripteur.telephone, message)
    } catch {}

    revalidatePath(`/admin/prescripteurs/${retrait.prescripteur_id}`)
    revalidatePath('/admin/prescripteurs')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Créer une demande de retrait (côté prescripteur) ─────────

export async function demanderRetrait(data: {
  prescripteur_id: string
  montant_fcfa: number
  methode: string
  numero_mobile_money: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const prescripteurDoc = await db.collection('prescripteurs').doc(data.prescripteur_id).get()
    if (!prescripteurDoc.exists) return { success: false, error: 'Prescripteur introuvable' }

    const prescripteur = prescripteurDoc.data() as Prescripteur
    if ((prescripteur.solde_fcfa ?? 0) < data.montant_fcfa) {
      return { success: false, error: 'Solde insuffisant' }
    }

    await db.collection('retraits').add({
      ...data,
      statut: 'demande',
      demande_at: new Date().toISOString(),
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Auth PIN prescripteur ────────────────────────────────────

export async function verifierPinPrescripteur(
  pin: string
): Promise<{ success: boolean; prescripteur?: Prescripteur; error?: string }> {
  const pin_hash = hashPin(pin)
  const snap = await db
    .collection('prescripteurs')
    .where('pin_hash', '==', pin_hash)
    .where('statut', '==', 'actif')
    .limit(1)
    .get()

  if (snap.empty) return { success: false, error: 'Code incorrect ou compte suspendu' }

  const doc = snap.docs[0]
  return { success: true, prescripteur: { uid: doc.id, ...doc.data() } as Prescripteur }
}

// ─── Sessions résidence ───────────────────────────────────────

export async function creerSessionResidence(
  prescripteur_id: string,
  residence_id: string
): Promise<{ success: boolean; session_id?: string; error?: string }> {
  try {
    const now = new Date()
    const expire_at = new Date(now.getTime() + 2 * 60 * 60 * 1000) // +2h

    const ref = await db.collection('prescripteur_sessions').add({
      prescripteur_id,
      residence_id,
      created_at: now.toISOString(),
      expire_at: expire_at.toISOString(),
      statut: 'active',
    })

    return { success: true, session_id: ref.id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getSessionActiveResidence(
  prescripteur_id: string
): Promise<{ session_id: string; residence_id: string; expire_at: string } | null> {
  const now = new Date().toISOString()
  const snap = await db
    .collection('prescripteur_sessions')
    .where('prescripteur_id', '==', prescripteur_id)
    .where('statut', '==', 'active')
    .where('expire_at', '>', now)
    .orderBy('expire_at', 'desc')
    .limit(1)
    .get()

  if (snap.empty) return null
  const doc = snap.docs[0]
  const d = doc.data()
  return { session_id: doc.id, residence_id: d.residence_id, expire_at: d.expire_at }
}

// ─── Scanner QR client (réservation) ─────────────────────────

export async function scannerQrClient(
  prescripteur_id: string,
  reservation_id: string,
  session_id: string
): Promise<{ success: boolean; commission_fcfa?: number; nouveau_solde?: number; client_nom?: string; hebergement_nom?: string; error?: string }> {
  try {
    // Récupérer la session
    const sessionDoc = await db.collection('prescripteur_sessions').doc(session_id).get()
    if (!sessionDoc.exists) return { success: false, error: 'Session introuvable' }
    const session = sessionDoc.data()!

    if (session.statut !== 'active') return { success: false, error: 'Session deja utilisee' }
    if (new Date(session.expire_at) < new Date()) return { success: false, error: 'Session expiree. Scannez a nouveau la residence.' }

    // Récupérer la réservation
    const resaDoc = await db.collection('reservations').doc(reservation_id).get()
    if (!resaDoc.exists) return { success: false, error: 'Reservation introuvable' }
    const resa = resaDoc.data()!

    // Vérifications
    if (resa.prescripteur_id) return { success: false, error: 'Un prescripteur est deja associe a cette reservation' }
    if (resa.accommodation_id !== session.residence_id) {
      return { success: false, error: 'Cette reservation ne correspond pas a la residence scannee' }
    }

    // Récupérer le prescripteur
    const prescripteurDoc = await db.collection('prescripteurs').doc(prescripteur_id).get()
    const prescripteur = prescripteurDoc.data() as Prescripteur

    const commission = prescripteur.commission_fcfa ?? 1500
    const nouveauSolde = (prescripteur.solde_fcfa ?? 0) + commission

    // Transaction atomique
    await db.runTransaction(async (tx) => {
      // Associer prescripteur à la réservation
      tx.update(db.collection('reservations').doc(reservation_id), {
        prescripteur_id,
        prescripteur_nom: prescripteur.nom_complet,
        prescripteur_type: prescripteur.type,
        prescripteur_code_promo: prescripteur.code_promo,
        commission_prescripteur_fcfa: commission,
        commission_statut: 'creditee',
      })
      // Créditer le solde et incrémenter les clients
      tx.update(db.collection('prescripteurs').doc(prescripteur_id), {
        solde_fcfa: nouveauSolde,
        total_clients_amenes: FieldValue.increment(1),
      })
      // Marquer la session comme utilisée
      tx.update(db.collection('prescripteur_sessions').doc(session_id), {
        statut: 'utilisee',
      })
    })

    // SMS WhatsApp confirmation
    const prenom = prescripteur.nom_complet.trim().split(' ')[0]
    const clientNom = `${resa.guest_first_name ?? ''} ${resa.guest_last_name ?? ''}`.trim() || 'Client'
    const hebergementNom = resa.accommodation?.name ?? resa.accommodation_id ?? 'la residence'
    const message = `${prenom}, ${commission.toLocaleString('fr-FR')} FCFA credites pour ${clientNom}. Nouveau solde : ${nouveauSolde.toLocaleString('fr-FR')} FCFA. \u2014 L&Lui Signature`
    try {
      await sendWhatsApp(prescripteur.telephone, message)
    } catch {}

    return {
      success: true,
      commission_fcfa: commission,
      nouveau_solde: nouveauSolde,
      client_nom: clientNom,
      hebergement_nom: hebergementNom,
    }
  } catch (err: any) {
    console.error('[scannerQrClient]', err)
    return { success: false, error: err.message }
  }
}

// ─── Disponibilités 14 jours pour prescripteur ────────────────

export async function getDisponibilitesPrescripteur(
  prescripteur_id: string
): Promise<{ hebergements: { id: string; nom: string; jours: Record<string, 'libre' | 'reserve' | 'arrive' | 'depart'> }[] }> {
  // Fetch prescripteur to get assigned hebergements
  const prescDoc = await db.collection('prescripteurs').doc(prescripteur_id).get()
  if (!prescDoc.exists) return { hebergements: [] }
  const presc = prescDoc.data() as Prescripteur
  const ids: string[] = presc.hebergements_assignes ?? []
  if (ids.length === 0) return { hebergements: [] }

  // 14-day window
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + 14)
  const todayStr = today.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  // Fetch accommodations names
  const hebergSnapPromises = ids.map((id) => db.collection('accommodations').doc(id).get())
  const hebergSnaps = await Promise.all(hebergSnapPromises)

  // Fetch reservations for these accommodations in the window
  const reservationsSnap = await db
    .collection('reservations')
    .where('accommodation_id', 'in', ids.slice(0, 10)) // Firestore 'in' limit = 10
    .where('reservation_status', 'in', ['confirmee', 'en_attente'])
    .get()

  // Build a set of reserved dates per hebergement
  const reservedDates: Record<string, Set<string>> = {}
  const arrivalDates: Record<string, Set<string>> = {}
  const departDates: Record<string, Set<string>> = {}

  for (const doc of reservationsSnap.docs) {
    const r = doc.data()
    if (!r.check_in || !r.check_out || !r.accommodation_id) continue
    const hebergId = r.accommodation_id
    if (!reservedDates[hebergId]) {
      reservedDates[hebergId] = new Set()
      arrivalDates[hebergId] = new Set()
      departDates[hebergId] = new Set()
    }
    const ci = r.check_in as string
    const co = r.check_out as string
    arrivalDates[hebergId].add(ci.split('T')[0])
    departDates[hebergId].add(co.split('T')[0])
    // Mark all days between check_in and check_out (exclusive of checkout)
    const d = new Date(ci)
    const dEnd = new Date(co)
    while (d < dEnd) {
      const ds = d.toISOString().split('T')[0]
      reservedDates[hebergId].add(ds)
      d.setDate(d.getDate() + 1)
    }
  }

  const result = []
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    const snap = hebergSnaps[i]
    const nom = snap.exists ? (snap.data()?.name ?? id) : id

    const jours: Record<string, 'libre' | 'reserve' | 'arrive' | 'depart'> = {}
    const d = new Date(today)
    for (let j = 0; j < 14; j++) {
      const ds = d.toISOString().split('T')[0]
      const reserved = reservedDates[id]?.has(ds) ?? false
      const isArrivee = arrivalDates[id]?.has(ds) ?? false
      const isDepart = departDates[id]?.has(ds) ?? false
      if (isArrivee) jours[ds] = 'arrive'
      else if (isDepart) jours[ds] = 'depart'
      else if (reserved) jours[ds] = 'reserve'
      else jours[ds] = 'libre'
      d.setDate(d.getDate() + 1)
    }
    result.push({ id, nom, jours })
  }

  return { hebergements: result }
}
