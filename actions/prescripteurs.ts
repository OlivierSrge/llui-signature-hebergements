'use server'

import { db, getStorageBucket } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import { createHash } from 'crypto'
import QRCode from 'qrcode'
import { sendWhatsApp } from '@/lib/whatsappNotif'
import { sendPushNotification } from '@/lib/fcm'
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
  solde_reserve_fcfa: number
  total_clients_amenes: number
  total_retire_fcfa: number
  statut: 'actif' | 'suspendu'
  qr_code_url: string
  fcm_token?: string
  created_at: string
  created_by: string
}

export interface Retrait {
  id: string
  prescripteur_id: string
  montant_fcfa: number
  methode: string
  operateur: 'mtn' | 'orange'
  numero_mobile_money: string
  statut: 'demande' | 'validee' | 'refusee'
  motif_refus?: string
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
      solde_reserve_fcfa: 0,
      total_retire_fcfa: 0,
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
    // Lire l'ancien état pour détecter les nouvelles résidences
    const prevDoc = await db.collection('prescripteurs').doc(uid).get()
    const prev = prevDoc.data() as Prescripteur | undefined
    const prevResidences = new Set(prev?.hebergements_assignes ?? [])

    const update: Record<string, unknown> = { ...data }
    if (data.pin) {
      update.pin_hash = hashPin(data.pin)
      delete update.pin
    }
    await db.collection('prescripteurs').doc(uid).update(update)

    // Trigger 4 : nouvelle résidence assignée
    if (data.hebergements_assignes && prev?.fcm_token) {
      const nouvelles = data.hebergements_assignes.filter((id) => !prevResidences.has(id))
      for (const residenceId of nouvelles) {
        const residenceDoc = await db.collection('hebergements').doc(residenceId).get()
        const nom = residenceDoc.data()?.name ?? residenceId
        try {
          await sendPushNotification(prev.fcm_token, {
            title: 'Nouvelle residence !',
            body: `${nom} ajoutee a votre liste`,
            url: '/prescripteur/disponibilites',
          })
        } catch {}
      }
    }

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
  try {
    // Évite l'index composite where+orderBy sur champs différents
    const snap = await db
      .collection('reservations')
      .where('prescripteur_id', '==', prescripteurId)
      .limit(50)
      .get()
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
    // Tri côté serveur pour éviter l'index Firestore
    rows.sort((a, b) => {
      const ta = a.created_at ?? ''
      const tb = b.created_at ?? ''
      return ta < tb ? 1 : ta > tb ? -1 : 0
    })
    return rows
  } catch (err) {
    console.error('[getReservationsPrescripteur]', err)
    return []
  }
}

// ─── Historique retraits d'un prescripteur ───────────────────

export async function getRetraitsPrescripteur(prescripteurId: string): Promise<Retrait[]> {
  try {
    // Évite l'index composite where+orderBy sur champs différents
    const snap = await db
      .collection('retraits')
      .where('prescripteur_id', '==', prescripteurId)
      .limit(50)
      .get()
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Retrait))
    // Tri côté serveur
    rows.sort((a, b) => {
      const ta = a.demande_at ?? ''
      const tb = b.demande_at ?? ''
      return ta < tb ? 1 : ta > tb ? -1 : 0
    })
    return rows
  } catch (err) {
    console.error('[getRetraitsPrescripteur]', err)
    return []
  }
}

// ─── Créer une demande de retrait (côté prescripteur) ─────────

export async function demanderRetrait(data: {
  prescripteur_id: string
  montant_fcfa: number
  operateur: 'mtn' | 'orange'
  numero_mobile_money: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const prescripteurRef = db.collection('prescripteurs').doc(data.prescripteur_id)
    const prescripteurDoc = await prescripteurRef.get()
    if (!prescripteurDoc.exists) return { success: false, error: 'Prescripteur introuvable' }

    const prescripteur = prescripteurDoc.data() as Prescripteur
    const soldeDisponible = (prescripteur.solde_fcfa ?? 0) - (prescripteur.solde_reserve_fcfa ?? 0)
    if (soldeDisponible < data.montant_fcfa) {
      return { success: false, error: `Solde disponible insuffisant (${soldeDisponible.toLocaleString('fr-FR')} FCFA)` }
    }
    if (data.montant_fcfa < 1500) {
      return { success: false, error: 'Montant minimum : 1 500 FCFA' }
    }

    const now = new Date().toISOString()

    // Transaction : créer retrait + réserver le solde
    await db.runTransaction(async (tx) => {
      const retraitRef = db.collection('retraits').doc()
      tx.set(retraitRef, {
        prescripteur_id: data.prescripteur_id,
        montant_fcfa: data.montant_fcfa,
        operateur: data.operateur,
        numero_mobile_money: data.numero_mobile_money,
        methode: data.operateur === 'mtn' ? 'mtn_momo' : 'orange_money',
        statut: 'demande',
        demande_at: now,
      })
      tx.update(prescripteurRef, {
        solde_reserve_fcfa: FieldValue.increment(data.montant_fcfa),
      })
    })

    // SMS à Olivier (admin)
    const adminPhone = process.env.ADMIN_WHATSAPP_PHONE ?? process.env.TWILIO_WHATSAPP_FROM ?? ''
    const operateurLabel = data.operateur === 'mtn' ? 'MTN MoMo' : 'Orange Money'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const msgAdmin = `Demande retrait recue : ${prescripteur.nom_complet}\nMontant : ${data.montant_fcfa.toLocaleString('fr-FR')} FCFA\nOperateur : ${operateurLabel} ${data.numero_mobile_money}\nValider sur : ${appUrl}/admin/prescripteurs/${data.prescripteur_id}\n— L&Lui Signature`
    if (adminPhone && adminPhone !== process.env.TWILIO_WHATSAPP_FROM) {
      try { await sendWhatsApp(adminPhone, msgAdmin) } catch {}
    }

    // SMS confirmation au prescripteur
    const prenom = prescripteur.nom_complet.trim().split(' ')[0]
    const msgPresc = `Bonjour ${prenom} ! Votre demande de retrait de ${data.montant_fcfa.toLocaleString('fr-FR')} FCFA (${operateurLabel}) est en cours de traitement. Delai : 24-48h. — L&Lui Signature`
    try { await sendWhatsApp(prescripteur.telephone, msgPresc) } catch {}

    revalidatePath(`/admin/prescripteurs/${data.prescripteur_id}`)
    revalidatePath('/admin/prescripteurs')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
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
    const nouveauSolde = Math.max(0, (prescripteur.solde_fcfa ?? 0) - retrait.montant_fcfa)
    const now = new Date().toISOString()

    await db.runTransaction(async (tx) => {
      tx.update(retraitRef, {
        statut: 'validee',
        traitee_at: now,
        traitee_par: adminUid,
      })
      tx.update(prescripteurRef, {
        solde_fcfa: nouveauSolde,
        solde_reserve_fcfa: Math.max(0, (prescripteur.solde_reserve_fcfa ?? 0) - retrait.montant_fcfa),
        total_retire_fcfa: FieldValue.increment(retrait.montant_fcfa),
      })
    })

    const prenom = prescripteur.nom_complet.trim().split(' ')[0]
    const operateurLabel = retrait.operateur === 'mtn' ? 'MTN MoMo' : retrait.operateur === 'orange' ? 'Orange Money' : (retrait.methode === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money')
    const message = `Bonjour ${prenom} ! Votre retrait de ${retrait.montant_fcfa.toLocaleString('fr-FR')} FCFA a ete effectue sur ${operateurLabel} au ${retrait.numero_mobile_money}. Nouveau solde disponible : ${nouveauSolde.toLocaleString('fr-FR')} FCFA. Merci pour votre confiance ! — L&Lui Signature Kribi`
    try { await sendWhatsApp(prescripteur.telephone, message) } catch {}
    if (prescripteur.fcm_token) {
      try {
        await sendPushNotification(prescripteur.fcm_token, {
          title: 'Retrait effectue !',
          body: `${retrait.montant_fcfa.toLocaleString('fr-FR')} FCFA envoye sur ${operateurLabel}`,
          url: '/prescripteur/accueil',
        })
      } catch {}
    }

    revalidatePath(`/admin/prescripteurs/${retrait.prescripteur_id}`)
    revalidatePath('/admin/prescripteurs')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Refuser un retrait ───────────────────────────────────────

export async function refuserRetrait(
  retraitId: string,
  adminUid: string,
  motif: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const retraitRef = db.collection('retraits').doc(retraitId)
    const retraitDoc = await retraitRef.get()
    if (!retraitDoc.exists) return { success: false, error: 'Retrait introuvable' }

    const retrait = retraitDoc.data() as Retrait
    if (retrait.statut !== 'demande') return { success: false, error: 'Ce retrait a deja ete traite' }

    const prescripteurRef = db.collection('prescripteurs').doc(retrait.prescripteur_id)
    const prescripteurDoc = await prescripteurRef.get()
    if (!prescripteurDoc.exists) return { success: false, error: 'Prescripteur introuvable' }

    const prescripteur = prescripteurDoc.data() as Prescripteur
    const now = new Date().toISOString()

    await db.runTransaction(async (tx) => {
      tx.update(retraitRef, {
        statut: 'refusee',
        motif_refus: motif,
        traitee_at: now,
        traitee_par: adminUid,
      })
      // Libérer le solde réservé
      tx.update(prescripteurRef, {
        solde_reserve_fcfa: Math.max(0, (prescripteur.solde_reserve_fcfa ?? 0) - retrait.montant_fcfa),
      })
    })

    const prenom = prescripteur.nom_complet.trim().split(' ')[0]
    const telLlui = process.env.ADMIN_WHATSAPP_PHONE ?? ''
    const message = `Votre demande de retrait de ${retrait.montant_fcfa.toLocaleString('fr-FR')} FCFA n'a pas pu etre traitee : ${motif}. Contactez-nous${telLlui ? ' au ' + telLlui : ''}. — L&Lui Signature`
    try { await sendWhatsApp(prescripteur.telephone, message) } catch {}
    if (prescripteur.fcm_token) {
      try {
        await sendPushNotification(prescripteur.fcm_token, {
          title: 'Retrait non traite',
          body: 'Contactez L&Lui Signature pour plus d\'informations',
          url: '/prescripteur/accueil',
        })
      } catch {}
    }

    revalidatePath(`/admin/prescripteurs/${retrait.prescripteur_id}`)
    revalidatePath('/admin/prescripteurs')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Auth PIN prescripteur ────────────────────────────────────

// Accepte un hash SHA-256 pré-calculé côté client (PinScreen.tsx).
// Avantages : pas de hashing serveur, une seule clause where (pas besoin
// d'index composite), le PIN brut n'apparaît jamais dans les logs.
export async function verifierPinPrescripteur(
  pin_hash: string,
): Promise<{ success: boolean; prescripteur?: Prescripteur; error?: string }> {
  try {
    // Requête sur un seul champ : index mono-champ Firestore suffit.
    const snap = await db
      .collection('prescripteurs')
      .where('pin_hash', '==', pin_hash)
      .limit(1)
      .get()

    if (snap.empty) return { success: false, error: 'Code incorrect ou compte suspendu' }

    const doc = snap.docs[0]
    const data = doc.data() as Prescripteur

    // Vérification statut côté code (pas besoin d'un index composite)
    if (data.statut !== 'actif') {
      return { success: false, error: 'Compte suspendu — contactez le gérant' }
    }

    return { success: true, prescripteur: { ...data, uid: doc.id } }
  } catch (err: any) {
    console.error('[verifierPinPrescripteur]', err)
    return { success: false, error: err.message ?? 'Erreur serveur' }
  }
}

// ─── Sessions résidence ───────────────────────────────────────

export async function creerSessionResidence(
  prescripteur_id: string,
  residence_id: string
): Promise<{ success: boolean; session_id?: string; nom_residence?: string; error?: string }> {
  try {
    // Vérifier que le prescripteur est assigné à cette résidence
    const prescDoc = await db.collection('prescripteurs').doc(prescripteur_id).get()
    if (!prescDoc.exists) return { success: false, error: 'Prescripteur introuvable' }
    const presc = prescDoc.data() as Prescripteur
    const assignes: string[] = presc.hebergements_assignes ?? []
    if (!assignes.includes(residence_id)) {
      return { success: false, error: "Vous n'êtes pas assigné à cette résidence." }
    }

    // Récupérer le nom de la résidence
    const hebergDoc = await db.collection('hebergements').doc(residence_id).get()
    const nom_residence = hebergDoc.exists
      ? ((hebergDoc.data()?.name ?? hebergDoc.data()?.titre ?? 'Résidence') as string)
      : 'Résidence'

    const now = new Date()
    const expire_at = new Date(now.getTime() + 2 * 60 * 60 * 1000) // TTL 2h

    const ref = await db.collection('prescripteur_sessions').add({
      prescripteur_id,
      residence_id,
      nom_residence,
      created_at: now.toISOString(),
      expire_at: expire_at.toISOString(),
      statut: 'active',
    })

    return { success: true, session_id: ref.id, nom_residence }
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

    // SMS + Push notification
    const prenom = prescripteur.nom_complet.trim().split(' ')[0]
    const clientNom = `${resa.guest_first_name ?? ''} ${resa.guest_last_name ?? ''}`.trim() || 'Client'
    const hebergementNom = resa.accommodation?.name ?? resa.accommodation_id ?? 'la residence'
    const message = `${prenom}, ${commission.toLocaleString('fr-FR')} FCFA credites pour ${clientNom}. Nouveau solde : ${nouveauSolde.toLocaleString('fr-FR')} FCFA. \u2014 L&Lui Signature`
    try { await sendWhatsApp(prescripteur.telephone, message) } catch {}
    if (prescripteur.fcm_token) {
      try {
        await sendPushNotification(prescripteur.fcm_token, {
          title: 'Commission recue !',
          body: `+${commission.toLocaleString('fr-FR')} FCFA \u2014 Client ${clientNom}. Solde : ${nouveauSolde.toLocaleString('fr-FR')} FCFA`,
          url: '/prescripteur/accueil',
        })
      } catch {}
    }

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

  // Fetch accommodations names
  const hebergSnapPromises = ids.map((id) => db.collection('hebergements').doc(id).get())
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

// ─── Rapport mensuel ──────────────────────────────────────────

export interface RapportMensuel {
  prescripteur: Prescripteur
  mois: string          // "2026-04"
  mois_label: string    // "Avril 2026"
  clients_amenes: number
  commissions_gagnees: number
  retraits_effectues: number
  solde_restant: number
  transactions: {
    date: string
    client: string
    hebergement: string
    montant: number
    statut: string
  }[]
}

export async function getRapportMensuel(
  prescripteur_id: string,
  mois: string // "2026-04"
): Promise<RapportMensuel | null> {
  const prescDoc = await db.collection('prescripteurs').doc(prescripteur_id).get()
  if (!prescDoc.exists) return null
  const prescripteur = { uid: prescDoc.id, ...prescDoc.data() } as Prescripteur

  const [annee, moisNum] = mois.split('-').map(Number)
  const debut = new Date(annee, moisNum - 1, 1).toISOString()
  const fin = new Date(annee, moisNum, 1).toISOString()

  // Réservations du mois avec ce prescripteur
  const resaSnap = await db
    .collection('reservations')
    .where('prescripteur_id', '==', prescripteur_id)
    .where('created_at', '>=', debut)
    .where('created_at', '<', fin)
    .orderBy('created_at', 'asc')
    .get()

  // Retraits validés du mois
  const retraitSnap = await db
    .collection('retraits')
    .where('prescripteur_id', '==', prescripteur_id)
    .where('statut', '==', 'validee')
    .where('traitee_at', '>=', debut)
    .where('traitee_at', '<', fin)
    .get()

  const commissions_gagnees = resaSnap.docs.reduce((sum, d) => sum + (d.data().commission_prescripteur_fcfa ?? 0), 0)
  const retraits_effectues = retraitSnap.docs.reduce((sum, d) => sum + (d.data().montant_fcfa ?? 0), 0)

  const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  const mois_label = `${MOIS_FR[moisNum - 1]} ${annee}`

  const transactions = resaSnap.docs.map((d) => {
    const r = d.data()
    return {
      date: r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '—',
      client: `${r.guest_first_name ?? ''} ${r.guest_last_name ?? ''}`.trim() || 'Client',
      hebergement: r.accommodation?.name ?? r.pack_name ?? '—',
      montant: r.commission_prescripteur_fcfa ?? 0,
      statut: r.commission_statut === 'creditee' ? 'Créditée' : r.commission_statut === 'annulee' ? 'Annulée' : 'En attente',
    }
  })

  return {
    prescripteur,
    mois,
    mois_label,
    clients_amenes: resaSnap.size,
    commissions_gagnees,
    retraits_effectues,
    solde_restant: prescripteur.solde_fcfa ?? 0,
    transactions,
  }
}

// ─── FCM Token ────────────────────────────────────────────────

export async function saveFcmToken(
  prescripteur_id: string,
  fcm_token: string
): Promise<void> {
  await db.collection('prescripteurs').doc(prescripteur_id).update({ fcm_token })
}

// ─── Analytics Dashboard ──────────────────────────────────────

export interface AnalyticsPrescripteurs {
  total_actifs: number
  clients_ce_mois: number
  commissions_dues: number
  retraits_en_attente: number
  top5: { nom: string; type: string; clients: number; commissions: number }[]
  evolution6mois: { mois: string; commissions: number; clients: number }[]
  transactions_csv: { date: string; prescripteur: string; type: string; client: string; hebergement: string; montant: number; statut: string }[]
}

export async function getAnalyticsPrescripteurs(
  periode: 'mois' | 'mois_dernier' | '3mois' | '6mois'
): Promise<AnalyticsPrescripteurs> {
  const now = new Date()

  // Calcul de la date de début selon la période
  let debut: Date
  if (periode === 'mois') {
    debut = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (periode === 'mois_dernier') {
    debut = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  } else if (periode === '3mois') {
    debut = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  } else {
    debut = new Date(now.getFullYear(), now.getMonth() - 6, 1)
  }
  const debutStr = debut.toISOString()

  // Prescripteurs actifs
  const prescSnap = await db.collection('prescripteurs').where('statut', '==', 'actif').get()
  const total_actifs = prescSnap.size

  // Commissions dues (total solde_fcfa non retiré)
  const commissions_dues = prescSnap.docs.reduce((sum, d) => sum + (d.data().solde_fcfa ?? 0), 0)

  // Retraits en attente
  const retraitSnap = await db.collection('retraits').where('statut', '==', 'demande').get()
  const retraits_en_attente = retraitSnap.docs.reduce((sum, d) => sum + (d.data().montant_fcfa ?? 0), 0)

  // Réservations de la période
  const resaSnap = await db
    .collection('reservations')
    .where('created_at', '>=', debutStr)
    .orderBy('created_at', 'desc')
    .limit(500)
    .get()

  const resaWithPresc = resaSnap.docs.filter((d) => d.data().prescripteur_id)
  const clients_ce_mois = resaWithPresc.length

  // Agréger par prescripteur pour le top 5
  const byPresc: Record<string, { nom: string; type: string; clients: number; commissions: number }> = {}
  for (const doc of resaWithPresc) {
    const r = doc.data()
    const id = r.prescripteur_id
    if (!id) continue
    if (!byPresc[id]) byPresc[id] = { nom: r.prescripteur_nom ?? id, type: r.prescripteur_type ?? '', clients: 0, commissions: 0 }
    byPresc[id].clients += 1
    byPresc[id].commissions += r.commission_prescripteur_fcfa ?? 0
  }
  const top5 = Object.values(byPresc)
    .sort((a, b) => b.clients - a.clients)
    .slice(0, 5)

  // Evolution 6 mois (toujours 6 mois pour le graphique)
  const MOIS_FR_COURT = ['jan','fev','mar','avr','mai','jun','jul','aou','sep','oct','nov','dec']
  const evolution6mois: AnalyticsPrescripteurs['evolution6mois'] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const fin = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const snap = await db
      .collection('reservations')
      .where('created_at', '>=', d.toISOString())
      .where('created_at', '<', fin.toISOString())
      .orderBy('created_at')
      .limit(200)
      .get()
    const snapWithPresc = snap.docs.filter((d) => d.data().prescripteur_id)
    const commissions = snapWithPresc.reduce((s, doc) => s + (doc.data().commission_prescripteur_fcfa ?? 0), 0)
    evolution6mois.push({ mois: MOIS_FR_COURT[d.getMonth()], commissions, clients: snapWithPresc.length })
  }

  // CSV transactions
  const transactions_csv = resaWithPresc.map((doc) => {
    const r = doc.data()
    return {
      date: r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '',
      prescripteur: r.prescripteur_nom ?? '',
      type: r.prescripteur_type ?? '',
      client: `${r.guest_first_name ?? ''} ${r.guest_last_name ?? ''}`.trim(),
      hebergement: r.accommodation?.name ?? r.pack_name ?? '',
      montant: r.commission_prescripteur_fcfa ?? 0,
      statut: r.commission_statut ?? '',
    }
  })

  return { total_actifs, clients_ce_mois, commissions_dues, retraits_en_attente, top5, evolution6mois, transactions_csv }
}

// ─── Résidences assignées avec statut disponibilité aujourd'hui ───────────────
export interface ResidencePrescripteur {
  id: string
  nom: string
  disponible: boolean // true = libre aujourd'hui
}

export async function getResidencesPrescripteur(
  prescripteur_id: string,
): Promise<ResidencePrescripteur[]> {
  try {
    const prescDoc = await db.collection('prescripteurs').doc(prescripteur_id).get()
    if (!prescDoc.exists) return []
    const presc = prescDoc.data() as Prescripteur
    const ids: string[] = presc.hebergements_assignes ?? []
    if (ids.length === 0) return []

    // Résoudre les noms
    const hebergDocs = await Promise.all(
      ids.map((id) => db.collection('hebergements').doc(id).get().catch(() => null))
    )

    // Vérifier disponibilité aujourd'hui (pas de réservation confirmée couvrant aujourd'hui)
    const todayStr = new Date().toISOString().slice(0, 10)
    let occupesAujourdhui = new Set<string>()
    try {
      const reservSnap = await db
        .collection('reservations')
        .where('accommodation_id', 'in', ids.slice(0, 10))
        .where('reservation_status', 'in', ['confirmee', 'en_attente'])
        .get()
      for (const doc of reservSnap.docs) {
        const r = doc.data()
        if (!r.check_in || !r.check_out) continue
        const ci = (r.check_in as string).slice(0, 10)
        const co = (r.check_out as string).slice(0, 10)
        if (ci <= todayStr && todayStr < co) {
          occupesAujourdhui.add(r.accommodation_id as string)
        }
      }
    } catch { /* index manquant → on ignore, toutes dispo */ }

    return ids.map((id, i) => {
      const doc = hebergDocs[i]
      const nom = doc?.exists
        ? ((doc.data()?.name ?? doc.data()?.titre ?? id) as string)
        : id
      return { id, nom, disponible: !occupesAujourdhui.has(id) }
    })
  } catch (err) {
    console.error('[getResidencesPrescripteur]', err)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════
// NOUVEAU FLUX : SESSION PARTENAIRE (scan QR partenaire → scan QR réservation)
// ═══════════════════════════════════════════════════════════════

export async function creerSessionPartenaire(
  prescripteur_id: string,
  partenaire_id: string,
  nom_partenaire: string
): Promise<{ success: boolean; session_id?: string; nom_partenaire?: string; error?: string }> {
  try {
    const prescDoc = await db.collection('prescripteurs').doc(prescripteur_id).get()
    if (!prescDoc.exists) return { success: false, error: 'Prescripteur introuvable' }

    const partDoc = await db.collection('partenaires').doc(partenaire_id).get()
    if (!partDoc.exists) return { success: false, error: 'Partenaire introuvable' }
    const partNom = (partDoc.data()?.name ?? nom_partenaire) as string

    const now = new Date()
    const expire_at = new Date(now.getTime() + 2 * 60 * 60 * 1000) // TTL 2h

    const ref = await db.collection('prescripteur_sessions').add({
      prescripteur_id,
      partenaire_id,
      nom_partenaire: partNom,
      created_at: now.toISOString(),
      expire_at: expire_at.toISOString(),
      statut: 'active',
      type: 'partenaire',
    })

    return { success: true, session_id: ref.id, nom_partenaire: partNom }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getSessionActivePartenaire(
  prescripteur_id: string
): Promise<{ session_id: string; partenaire_id: string; nom_partenaire: string; expire_at: string } | null> {
  const now = new Date().toISOString()
  const snap = await db
    .collection('prescripteur_sessions')
    .where('prescripteur_id', '==', prescripteur_id)
    .where('type', '==', 'partenaire')
    .where('statut', '==', 'active')
    .where('expire_at', '>', now)
    .orderBy('expire_at', 'desc')
    .limit(1)
    .get()
  if (snap.empty) return null
  const d = snap.docs[0]
  const data = d.data()
  return {
    session_id: d.id,
    partenaire_id: data.partenaire_id as string,
    nom_partenaire: (data.nom_partenaire ?? '') as string,
    expire_at: data.expire_at as string,
  }
}

export async function scannerQrReservation(
  prescripteur_id: string,
  reservation_id: string
): Promise<{ success: boolean; commission_fcfa?: number; nouveau_solde?: number; client_nom?: string; hebergement_nom?: string; error?: string }> {
  try {
    // Vérifier qu'une session partenaire active existe
    const sessionActive = await getSessionActivePartenaire(prescripteur_id)
    if (!sessionActive) return { success: false, error: 'Aucune session partenaire active. Scannez d\'abord le QR du partenaire.' }

    // Récupérer la réservation
    const resaDoc = await db.collection('reservations').doc(reservation_id).get()
    if (!resaDoc.exists) return { success: false, error: 'Réservation introuvable' }
    const resa = resaDoc.data()!

    // Vérification statut_prescription
    const statutPrescription = resa.statut_prescription as string | undefined
    if (!statutPrescription || statutPrescription === 'sans_prescripteur') {
      return { success: false, error: "Cette reservation n'a pas de prescripteur lie." }
    }
    if (statutPrescription === 'prescripteur_present' || statutPrescription === 'disponibilite_confirmee') {
      return { success: false, error: "Le partenaire n'a pas encore confirme le paiement. Patientez." }
    }
    if (statutPrescription === 'commission_versee') {
      return { success: false, error: 'Ce QR a deja ete scanne. Commission deja versee.' }
    }
    if (resa.qr_utilise === true) {
      return { success: false, error: 'Ce QR a deja ete utilise.' }
    }
    if (resa.qr_expire_at && new Date(resa.qr_expire_at as string) < new Date()) {
      return { success: false, error: 'Ce QR a expire. Contactez le partenaire.' }
    }
    if (statutPrescription !== 'paiement_confirme') {
      return { success: false, error: 'Statut de reservation invalide pour ce scan.' }
    }

    // Vérifier que la réservation appartient bien au partenaire
    const accDoc = await db.collection('hebergements').doc(resa.accommodation_id ?? '').get()
    const hebergementNom: string = accDoc.exists
      ? ((accDoc.data()?.name ?? accDoc.data()?.titre ?? 'Hébergement') as string)
      : 'Hébergement'

    if (accDoc.exists && accDoc.data()?.partner_id !== sessionActive.partenaire_id) {
      return { success: false, error: 'Cette réservation ne correspond pas au partenaire scanné' }
    }

    // Récupérer le prescripteur
    const prescripteurDoc = await db.collection('prescripteurs').doc(prescripteur_id).get()
    if (!prescripteurDoc.exists) return { success: false, error: 'Prescripteur introuvable' }
    const prescripteur = prescripteurDoc.data() as Prescripteur

    const commission = prescripteur.commission_fcfa ?? 1500
    const nouveauSolde = (prescripteur.solde_fcfa ?? 0) + commission

    // Transaction atomique
    await db.runTransaction(async (tx) => {
      tx.update(db.collection('reservations').doc(reservation_id), {
        prescripteur_id,
        prescripteur_nom: prescripteur.nom_complet,
        prescripteur_type: prescripteur.type,
        prescripteur_code_promo: prescripteur.code_promo,
        commission_prescripteur_fcfa: commission,
        commission_statut: 'creditee',
        prescripteur_session_id: sessionActive.session_id,
        partenaire_id: sessionActive.partenaire_id,
        statut_prescription: 'commission_versee',
        qr_utilise: true,
      })
      tx.update(db.collection('prescripteurs').doc(prescripteur_id), {
        solde_fcfa: nouveauSolde,
        total_clients_amenes: FieldValue.increment(1),
      })
      tx.update(db.collection('prescripteur_sessions').doc(sessionActive.session_id), {
        statut: 'utilisee',
      })
    })

    // SMS + Push
    const prenom = prescripteur.nom_complet.trim().split(' ')[0]
    const clientNom = `${resa.guest_first_name ?? ''} ${resa.guest_last_name ?? ''}`.trim() || 'Client'
    const message = `${prenom}, ${commission.toLocaleString('fr-FR')} FCFA crédités pour ${clientNom}. Nouveau solde : ${nouveauSolde.toLocaleString('fr-FR')} FCFA. — L&Lui Signature`
    try { await sendWhatsApp(prescripteur.telephone, message) } catch {}
    if (prescripteur.fcm_token) {
      try {
        await sendPushNotification(prescripteur.fcm_token, {
          title: 'Commission reçue !',
          body: `+${commission.toLocaleString('fr-FR')} FCFA — Client ${clientNom}. Solde : ${nouveauSolde.toLocaleString('fr-FR')} FCFA`,
          url: '/prescripteur/accueil',
        })
      } catch {}
    }

    return { success: true, commission_fcfa: commission, nouveau_solde: nouveauSolde, client_nom: clientNom, hebergement_nom: hebergementNom }
  } catch (err: any) {
    console.error('[scannerQrReservation]', err)
    return { success: false, error: err.message }
  }
}

export async function compterPrescripteursActifsPartenaire(partenaire_id: string): Promise<number> {
  const now = new Date().toISOString()
  const snap = await db
    .collection('prescripteur_sessions')
    .where('partenaire_id', '==', partenaire_id)
    .where('type', '==', 'partenaire')
    .where('statut', '==', 'active')
    .where('expire_at', '>', now)
    .get()
  return snap.size
}

// ─── Confirmer paiement réservation (partenaire) ─────────────

export async function confirmerPaiementReservation(
  reservation_id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resaDoc = await db.collection('reservations').doc(reservation_id).get()
    if (!resaDoc.exists) return { success: false, error: 'Reservation introuvable' }
    const resa = resaDoc.data()!

    if (!['disponibilite_confirmee', 'prescripteur_present'].includes(resa.statut_prescription ?? '')) {
      return { success: false, error: 'Statut invalide pour confirmation paiement' }
    }

    await resaDoc.ref.update({
      statut_prescription: 'paiement_confirme',
      paiement_confirme_at: new Date().toISOString(),
    })

    // Notifier le prescripteur si session active
    const prescripteurId = resa.prescripteur_id_prevu as string | undefined
    if (prescripteurId) {
      const prescDoc = await db.collection('prescripteurs').doc(prescripteurId).get()
      if (prescDoc.exists) {
        const presc = prescDoc.data()!
        const partenaireNom = resa.partner_name ?? 'le partenaire'
        const clientNom = `${resa.guest_first_name ?? ''} ${resa.guest_last_name ?? ''}`.trim() || 'Client'
        const msg = `Paiement confirme par ${partenaireNom} ! Vous pouvez maintenant scanner le QR du client ${clientNom} pour recevoir votre commission de 1 500 FCFA. — L&Lui Signature`
        try { await sendWhatsApp(presc.telephone as string, msg) } catch {}
        if (presc.fcm_token) {
          try {
            await sendPushNotification(presc.fcm_token as string, {
              title: 'Paiement confirme !',
              body: `Scannez le QR de ${clientNom} pour recevoir 1 500 FCFA`,
              url: '/prescripteur/accueil',
            })
          } catch {}
        }
      }
    }

    revalidatePath('/partenaire/reservations')
    revalidatePath('/partenaire/dashboard')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── QR Etablissement partenaire ─────────────────────────────

export async function getQrEtablissement(partenaireId: string): Promise<{ qr_data?: string; qr_url?: string; generated_at?: string } | null> {
  const doc = await db.collection('partenaires').doc(partenaireId).get()
  if (!doc.exists) return null
  const d = doc.data()!
  if (!d.qr_etablissement_data) return null
  return {
    qr_data: d.qr_etablissement_data as string,
    qr_url: d.qr_etablissement_url as string | undefined,
    generated_at: d.qr_generated_at as string | undefined,
  }
}

export async function sauvegarderQrEtablissement(
  partenaireId: string,
  qrData: string,
): Promise<{ success: boolean; qr_url?: string; error?: string }> {
  try {
    const QRCodeLib = (await import('qrcode')).default
    const qrBuffer = await QRCodeLib.toBuffer(qrData, { type: 'png', width: 400, margin: 2 })
    const bucket = getStorageBucket()
    const file = bucket.file(`partenaires/qr/${partenaireId}.png`)
    await file.save(qrBuffer, { contentType: 'image/png', public: true })
    const qr_url = `https://storage.googleapis.com/${bucket.name}/partenaires/qr/${partenaireId}.png`

    await db.collection('partenaires').doc(partenaireId).update({
      qr_etablissement_data: qrData,
      qr_etablissement_url: qr_url,
      qr_generated_at: new Date().toISOString(),
    })

    return { success: true, qr_url }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Session prescripteur actif pour un partenaire ───────────

export async function getSessionPrescripteurActifPartenaire(partenaireId: string): Promise<{
  prescripteur_id: string;
  nom_complet: string;
  session_id: string;
  expire_at: string;
} | null> {
  const now = new Date().toISOString()
  const snap = await db.collection('prescripteur_sessions')
    .where('partenaire_id', '==', partenaireId)
    .where('type', '==', 'partenaire')
    .where('statut', '==', 'active')
    .where('expire_at', '>', now)
    .limit(1).get()
  if (snap.empty) return null
  const d = snap.docs[0].data()
  const prescDoc = await db.collection('prescripteurs').doc(d.prescripteur_id as string).get()
  const presc = prescDoc.data()
  return {
    prescripteur_id: d.prescripteur_id as string,
    nom_complet: (presc?.nom_complet ?? 'Prescripteur') as string,
    session_id: snap.docs[0].id,
    expire_at: d.expire_at as string,
  }
}
