'use server'
// actions/stars.ts — Moteur L&Lui Stars (Canal 2) : OTP, transactions, fidélité
// Distinct du programme de fidélité mariage (actions/fidelite.ts).
// Collection Firestore : clients_fidelite / transactions_fidelite

import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { sendWhatsApp } from '@/lib/whatsappNotif'
import { nanoid } from 'nanoid'
import { getParametresPlateforme } from './parametres'
import {
  getMembershipStatus,
  getRemisePct,
  getMultiplier,
  calculateStars,
  calculateRemiseAmount,
  canUseTransaction,
  getNiveauPass,
  type MembershipStatus,
  type NiveauPass,
} from '@/lib/loyaltyEngine'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

// ─── Types publics ──────────────────────────────────────────────

export interface ClientFidelite {
  telephone: string
  email?: string
  points_stars: number
  total_stars_historique: number
  membership_status: MembershipStatus
  last_status_update: string
  created_at: string
  updated_at: string
  phone_verified: boolean
}

export interface TransactionFidelite {
  id: string
  client_id: string
  partenaire_id: string
  code_session: string
  montant_net: number
  stars_gagnees: number
  remise_appliquee: number
  niveau_pass: NiveauPass | null
  remise_pct: number
  multiplier: number
  valeur_star_fcfa: number
  status: 'pending' | 'confirmed' | 'cancelled'
  confirmation_token: string
  created_at: string
  confirmed_at?: string
  expires_at: string
}

// ─── Helpers internes ──────────────────────────────────────────

/** Normalise un numéro en E.164 camerounais : +237XXXXXXXXX */
function normalizePhone(tel: string): string {
  let t = tel.replace(/[\s\-().]/g, '')
  if (t.startsWith('00')) t = '+' + t.slice(2)
  if (/^237\d{8,9}$/.test(t)) t = '+' + t
  if (!t.startsWith('+')) t = '+237' + t
  return t
}

function docToClient(tel: string, d: Record<string, unknown>): ClientFidelite {
  const toIso = (v: unknown): string => {
    if (typeof v === 'string') return v
    if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') {
      return (v as { toDate: () => Date }).toDate().toISOString()
    }
    return new Date().toISOString()
  }
  return {
    telephone: tel,
    points_stars: (d.points_stars as number) ?? 0,
    total_stars_historique: (d.total_stars_historique as number) ?? 0,
    membership_status: (d.membership_status as MembershipStatus) ?? 'novice',
    last_status_update: toIso(d.last_status_update),
    created_at: toIso(d.created_at),
    updated_at: toIso(d.updated_at),
    phone_verified: (d.phone_verified as boolean) ?? false,
  }
}

// ─── OTP ───────────────────────────────────────────────────────

/**
 * Génère un OTP 6 chiffres, le stocke dans clients_fidelite (10 min),
 * et l'envoie par WhatsApp Twilio.
 */
export async function requestOtp(
  telephone: string,
  codeSession: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tel = normalizePhone(telephone)
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const clientRef = db.collection('clients_fidelite').doc(tel)
    const snap = await clientRef.get()

    if (!snap.exists) {
      await clientRef.set({
        telephone: tel,
        points_stars: 0,
        total_stars_historique: 0,
        membership_status: 'novice',
        last_status_update: FieldValue.serverTimestamp(),
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        otp_code: otp,
        otp_expires_at: expiresAt,
        phone_verified: false,
      })
    } else {
      await clientRef.update({
        otp_code: otp,
        otp_expires_at: expiresAt,
        updated_at: FieldValue.serverTimestamp(),
      })
    }

    const params = await getParametresPlateforme()
    const template = params.fidelite_otp_template
    const msg =
      template && template.length > 10
        ? template.replace('{otp}', otp).replace('{minutes}', '10')
        : `🔐 *Votre code L&Lui Stars* :\n\n*${otp}*\n\nValide 10 minutes. Ne partagez pas ce code.\n\nL&Lui Signature ✨`

    await sendWhatsApp(tel, msg)
    console.log(`[Fidelite] OTP envoyé → ${tel} (session=${codeSession})`)
    return { success: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[Fidelite] requestOtp erreur:', e)
    return { success: false, error: msg }
  }
}

/**
 * Vérifie l'OTP, marque phone_verified, lie client_id à la session.
 * Les points et statut existants sont préservés.
 */
export async function verifyOtpAndLinkClient(
  telephone: string,
  otp: string,
  codeSession: string
): Promise<{ success: boolean; client?: ClientFidelite; error?: string }> {
  try {
    const tel = normalizePhone(telephone)
    const clientRef = db.collection('clients_fidelite').doc(tel)
    const snap = await clientRef.get()

    if (!snap.exists) return { success: false, error: 'Client non trouvé. Demandez un nouveau code.' }

    const data = snap.data()!
    if ((data.otp_code as string) !== otp) return { success: false, error: 'Code incorrect. Vérifiez et réessayez.' }
    if (data.otp_expires_at && new Date(data.otp_expires_at as string) < new Date()) {
      return { success: false, error: 'Code expiré. Cliquez sur "Renvoyer le code".' }
    }

    await clientRef.update({
      phone_verified: true,
      otp_code: FieldValue.delete(),
      otp_expires_at: FieldValue.delete(),
      updated_at: FieldValue.serverTimestamp(),
    })

    // Lier client_id à la session (non bloquant si la session n'existe plus)
    try {
      await db.collection('codes_sessions').doc(codeSession).update({ client_id: tel })
    } catch { /* non bloquant */ }

    const fresh = (await clientRef.get()).data()!
    console.log(`[Fidelite] Client ${tel} vérifié → session ${codeSession}`)
    return { success: true, client: docToClient(tel, fresh) }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[Fidelite] verifyOtp erreur:', e)
    return { success: false, error: msg }
  }
}

// ─── Lecture ───────────────────────────────────────────────────

/** Récupère un client par téléphone. Retourne null si absent ou non vérifié. */
export async function getClientFidelite(telephone: string): Promise<ClientFidelite | null> {
  try {
    const tel = normalizePhone(telephone)
    const snap = await db.collection('clients_fidelite').doc(tel).get()
    if (!snap.exists) return null
    const d = snap.data()!
    if (!d.phone_verified) return null
    return docToClient(tel, d)
  } catch (e) {
    console.error('[Fidelite] getClientFidelite erreur:', e)
    return null
  }
}

/** Récupère la transaction pending d'une session (null si aucune). */
export async function getPendingTransaction(codeSession: string): Promise<TransactionFidelite | null> {
  try {
    const snap = await db
      .collection('transactions_fidelite')
      .where('code_session', '==', codeSession)
      .where('status', '==', 'pending')
      .limit(1)
      .get()
    if (snap.empty) return null
    const d = snap.docs[0].data()
    const toIso = (v: unknown): string => {
      if (typeof v === 'string') return v
      if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') {
        return (v as { toDate: () => Date }).toDate().toISOString()
      }
      return ''
    }
    return {
      id: snap.docs[0].id,
      client_id: d.client_id as string,
      partenaire_id: d.partenaire_id as string,
      code_session: d.code_session as string,
      montant_net: d.montant_net as number,
      stars_gagnees: d.stars_gagnees as number,
      remise_appliquee: d.remise_appliquee as number,
      niveau_pass: (d.niveau_pass as NiveauPass | null) ?? null,
      remise_pct: d.remise_pct as number,
      multiplier: d.multiplier as number,
      valeur_star_fcfa: d.valeur_star_fcfa as number,
      status: 'pending',
      confirmation_token: d.confirmation_token as string,
      created_at: toIso(d.created_at),
      expires_at: (d.expires_at as string) ?? '',
    }
  } catch (e) {
    console.error('[Fidelite] getPendingTransaction erreur:', e)
    return null
  }
}

// ─── Historique partenaire ─────────────────────────────────────

/** Retourne les dernières transactions confirmées du partenaire, triées par date DESC. */
export async function getPartnerTransactions(
  partnerId: string,
  limit = 5
): Promise<TransactionFidelite[]> {
  try {
    const snap = await db
      .collection('transactions_fidelite')
      .where('partenaire_id', '==', partnerId)
      .where('status', '==', 'confirmed')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get()

    return snap.docs.map((doc) => {
      const d = doc.data()
      const toIso = (v: unknown): string => {
        if (typeof v === 'string') return v
        if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') {
          return (v as { toDate: () => Date }).toDate().toISOString()
        }
        return new Date().toISOString()
      }
      return {
        id: doc.id,
        client_id: d.client_id as string,
        partenaire_id: d.partenaire_id as string,
        code_session: d.code_session as string,
        montant_net: d.montant_net as number,
        stars_gagnees: d.stars_gagnees as number,
        remise_appliquee: d.remise_appliquee as number,
        niveau_pass: (d.niveau_pass as NiveauPass | null) ?? null,
        remise_pct: d.remise_pct as number,
        multiplier: d.multiplier as number,
        valeur_star_fcfa: d.valeur_star_fcfa as number,
        status: 'confirmed' as const,
        confirmation_token: '',
        created_at: toIso(d.created_at),
        confirmed_at: d.confirmed_at ? toIso(d.confirmed_at) : undefined,
        expires_at: '',
      }
    })
  } catch (e) {
    console.error('[Fidelite] getPartnerTransactions erreur:', e)
    return []
  }
}

// ─── Transaction partenaire ────────────────────────────────────

interface ProcessTransactionInput {
  code_session: string
  montant_brut: number       // montant original avant remise
  telephone_client: string   // vérifié via OTP
}

export interface ProcessTransactionResult {
  success: boolean
  transactionId?: string
  message?: string
  montant_net?: number
  stars_gagnees?: number
  remise_appliquee?: number
  error?: string
}

/**
 * Crée une transaction PENDING sans modifier aucun solde.
 * Envoie un lien de confirmation WhatsApp au client.
 * La mise à jour atomique des soldes se fait dans /api/confirm-transaction.
 */
export async function processPartnerTransaction(
  input: ProcessTransactionInput
): Promise<ProcessTransactionResult> {
  try {
    const { code_session, montant_brut, telephone_client } = input
    const tel = normalizePhone(telephone_client)

    // 1. Session → partenaire_id
    const sessionSnap = await db.collection('codes_sessions').doc(code_session).get()
    if (!sessionSnap.exists) return { success: false, error: 'Session inconnue' }
    const partenaireId = sessionSnap.data()!.prescripteur_partenaire_id as string
    if (!partenaireId) return { success: false, error: 'Partenaire non lié à cette session' }

    // 2. Client vérifié
    const clientSnap = await db.collection('clients_fidelite').doc(tel).get()
    if (!clientSnap.exists || !(clientSnap.data()!.phone_verified as boolean)) {
      return { success: false, error: 'Client non vérifié. Demandez-lui de scanner le QR code.' }
    }
    const clientData = clientSnap.data()!

    // 3. Provision partenaire
    const partenaireSnap = await db.collection('prescripteurs_partenaires').doc(partenaireId).get()
    if (!partenaireSnap.exists) return { success: false, error: 'Partenaire introuvable' }
    const provision = (partenaireSnap.data()!.solde_provision as number) ?? 0

    // 4. Paramètres fidélité
    const params = await getParametresPlateforme()
    const thresholds = {
      seuil_novice: params.fidelite_seuil_novice,
      seuil_explorateur: params.fidelite_seuil_explorateur,
      seuil_ambassadeur: params.fidelite_seuil_ambassadeur,
      seuil_excellence: params.fidelite_seuil_excellence,
    }
    const totalStars = (clientData.total_stars_historique as number) ?? 0
    const status = getMembershipStatus(totalStars, thresholds)
    const remisePct = getRemisePct(status, {
      remise_argent_pct: params.fidelite_remise_argent_pct,
      remise_or_pct: params.fidelite_remise_or_pct,
      remise_platine_pct: params.fidelite_remise_platine_pct,
    })
    const multiplier = getMultiplier(status, {
      multiplicateur_argent: params.fidelite_multiplicateur_argent,
      multiplicateur_or: params.fidelite_multiplicateur_or,
      multiplicateur_platine: params.fidelite_multiplicateur_platine,
    })
    const valeurStarFcfa = params.fidelite_valeur_star_fcfa
    const niveauPass = getNiveauPass(status)

    // 5. Calculs
    const remiseAmount = calculateRemiseAmount(montant_brut, remisePct)
    const montantNet = montant_brut - remiseAmount
    const starsGagnees = calculateStars(montantNet, remisePct, multiplier)

    // 6. Vérifier provision
    if (!canUseTransaction(provision, starsGagnees, valeurStarFcfa)) {
      return {
        success: false,
        error: `Provision insuffisante : ${provision.toLocaleString('fr-FR')} FCFA disponible, ${(starsGagnees * valeurStarFcfa).toLocaleString('fr-FR')} FCFA requis`,
      }
    }

    // 7. Transaction PENDING avec token non prévisible
    const confirmationToken = nanoid(32)
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
    const txRef = db.collection('transactions_fidelite').doc()
    await txRef.set({
      client_id: tel,
      partenaire_id: partenaireId,
      code_session,
      montant_net: montantNet,
      stars_gagnees: starsGagnees,
      remise_appliquee: remiseAmount,
      niveau_pass: niveauPass,
      remise_pct: remisePct,         // snapshot
      multiplier,                     // snapshot
      valeur_star_fcfa: valeurStarFcfa, // snapshot
      status: 'pending',
      confirmation_token: confirmationToken,
      created_at: FieldValue.serverTimestamp(),
      expires_at: expiresAt,
    })

    // 8. Lien de confirmation WhatsApp (usage unique)
    const confirmUrl = `${APP_URL}/api/confirm-transaction?token=${confirmationToken}`
    const msg =
      `✅ *Confirmation L&Lui Stars*\n\n` +
      `Montant réglé : *${montantNet.toLocaleString('fr-FR')} FCFA*\n` +
      (remiseAmount > 0
        ? `Remise ${niveauPass ? `Pass ${niveauPass}` : ''} : *-${remiseAmount.toLocaleString('fr-FR')} FCFA* (${remisePct}%)\n`
        : '') +
      `Stars à recevoir : *⭐ ${starsGagnees} Stars*\n\n` +
      `Confirmez ici (valable 1h) :\n${confirmUrl}\n\n` +
      `L&Lui Stars ✨`

    await sendWhatsApp(tel, msg)
    console.log(`[Fidelite] TX ${txRef.id} pending — client=${tel}, +${starsGagnees}⭐`)

    return {
      success: true,
      transactionId: txRef.id,
      message: 'Transaction en attente. Lien de confirmation envoyé sur WhatsApp.',
      montant_net: montantNet,
      stars_gagnees: starsGagnees,
      remise_appliquee: remiseAmount,
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[Fidelite] processPartnerTransaction erreur:', e)
    return { success: false, error: msg }
  }
}
