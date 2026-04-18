'use server'
// actions/qr-scan.ts — Flux client QR scan Stars (client-initiated)
// NE PAS importer twilio ni whatsappNotif. WhatsApp → fetch /api/whatsapp/send

import { db } from '@/lib/firebase'
import { FieldValue, type Transaction } from 'firebase-admin/firestore'
import { getParametresPlateforme } from './parametres'
import { serializeFirestoreDoc } from '@/lib/serialization'
import {
  getMembershipStatus,
  getMultiplier,
  getRemisePct,
  calculateStars,
  calculateRemiseAmount,
} from '@/lib/loyaltyEngine'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

async function sendWhatsApp(telephone: string, message: string): Promise<void> {
  try {
    await fetch(`${APP_URL}/api/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_API_KEY ?? ''}`,
      },
      body: JSON.stringify({ telephone, message }),
    })
  } catch (e) {
    console.error('[QrScan] sendWhatsApp erreur:', e)
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface QrScanRequest {
  id: string
  partenaire_id: string
  partenaire_nom: string
  client_uid: string       // normalized phone = Firestore doc ID
  client_tel: string
  montant_fcfa: number
  remise_appliquee: number
  montant_net: number
  stars_a_crediter: number // Math.round(montantNet / 100 * multiplier)
  remise_pct: number
  multiplier: number
  membership_status: string
  status: 'pending' | 'validated' | 'rejected' | 'expired'
  created_at: string
  expires_at: string       // created_at + 120 seconds
  validated_at?: string
  rejected_at?: string
  validated_by?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizePhone(tel: string): string {
  let t = tel.replace(/[\s\-().]/g, '')
  if (t.startsWith('00')) t = '+' + t.slice(2)
  if (/^237\d{8,9}$/.test(t)) t = '+' + t
  if (!t.startsWith('+')) t = '+237' + t
  return t
}

function extractPartenaireId(qrData: string): string | null {
  // QR encode: ${APP_URL}/promo/${uid}
  const match = qrData.match(/\/promo\/([^/?#]+)/)
  return match ? match[1] : null
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Étape 1 : le client scanne le QR partenaire et saisit le montant.
 * Crée un doc `qr_scan_requests` en status "pending" (TTL 120s).
 * Retourne la demande créée ou une erreur.
 */
export async function createQrScanRequest(
  clientTel: string,
  qrData: string,
  montantFcfa: number
): Promise<{ success: true; request: QrScanRequest } | { success: false; error: string }> {
  try {
    const tel = normalizePhone(clientTel)

    // Vérifier client
    const clientSnap = await db.collection('clients_fidelite').doc(tel).get()
    if (!clientSnap.exists || !(clientSnap.data()!.phone_verified as boolean)) {
      return { success: false, error: 'Client non vérifié. Scannez le QR code pour vous inscrire.' }
    }
    const clientData = clientSnap.data()!

    // Extraire partenaire_id depuis QR
    const partenaireId = extractPartenaireId(qrData)
    if (!partenaireId) {
      return { success: false, error: 'QR code non reconnu. Ce code ne provient pas de L&Lui.' }
    }

    // Vérifier partenaire
    const partSnap = await db.collection('prescripteurs_partenaires').doc(partenaireId).get()
    if (!partSnap.exists || partSnap.data()!.statut !== 'actif') {
      return { success: false, error: 'Partenaire introuvable ou inactif.' }
    }
    const partData = partSnap.data()!
    const partenaireNom = (partData.nom_etablissement as string) ?? 'Partenaire'

    if (!(montantFcfa > 0)) {
      return { success: false, error: 'Montant invalide.' }
    }

    // Calculs fidélité
    const params = await getParametresPlateforme()
    const thresholds = {
      seuil_novice: params.fidelite_seuil_novice,
      seuil_explorateur: params.fidelite_seuil_explorateur,
      seuil_ambassadeur: params.fidelite_seuil_ambassadeur,
      seuil_excellence: params.fidelite_seuil_excellence,
    }
    const totalStars = (clientData.total_stars_historique as number) ?? 0
    const memberStatus = getMembershipStatus(totalStars, thresholds)
    const remisePct = getRemisePct(memberStatus, {
      remise_argent_pct: params.fidelite_remise_argent_pct,
      remise_or_pct: params.fidelite_remise_or_pct,
      remise_platine_pct: params.fidelite_remise_platine_pct,
    })
    const multiplier = getMultiplier(memberStatus, {
      multiplicateur_argent: params.fidelite_multiplicateur_argent,
      multiplicateur_or: params.fidelite_multiplicateur_or,
      multiplicateur_platine: params.fidelite_multiplicateur_platine,
    })
    const remiseAmount = calculateRemiseAmount(montantFcfa, remisePct)
    const montantNet = montantFcfa - remiseAmount
    const starsACrediter = calculateStars(montantNet, remisePct, multiplier)

    // Vérifier provision partenaire
    const provision = (partData.solde_provision as number) ?? 0
    const valeurStar = params.fidelite_valeur_star_fcfa
    const coutProvision = starsACrediter * valeurStar
    if (provision < coutProvision) {
      return {
        success: false,
        error: `Provision partenaire insuffisante (${provision.toLocaleString('fr-FR')} FCFA disponible, ${coutProvision.toLocaleString('fr-FR')} FCFA requis).`,
      }
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 120 * 1000).toISOString()

    const ref = db.collection('qr_scan_requests').doc()
    const docData = {
      partenaire_id: partenaireId,
      partenaire_nom: partenaireNom,
      client_uid: tel,
      client_tel: tel,
      montant_fcfa: montantFcfa,
      remise_appliquee: remiseAmount,
      montant_net: montantNet,
      stars_a_crediter: starsACrediter,
      remise_pct: remisePct,
      multiplier,
      membership_status: memberStatus,
      status: 'pending',
      created_at: FieldValue.serverTimestamp(),
      expires_at: expiresAt,
    }
    await ref.set(docData)

    console.log(`[QrScan] Demande ${ref.id} créée — client=${tel}, partenaire=${partenaireId}, +${starsACrediter}⭐`)

    const request: QrScanRequest = {
      id: ref.id,
      partenaire_id: partenaireId,
      partenaire_nom: partenaireNom,
      client_uid: tel,
      client_tel: tel,
      montant_fcfa: montantFcfa,
      remise_appliquee: remiseAmount,
      montant_net: montantNet,
      stars_a_crediter: starsACrediter,
      remise_pct: remisePct,
      multiplier,
      membership_status: memberStatus,
      status: 'pending',
      created_at: now.toISOString(),
      expires_at: expiresAt,
    }
    return { success: true, request }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[QrScan] createQrScanRequest erreur:', e)
    return { success: false, error: msg }
  }
}

/**
 * Étape 2 (partenaire) : valide la demande → crédite stars client atomiquement.
 */
export async function validateQrScanRequest(
  requestId: string,
  partenaireId: string
): Promise<{ success: true; starsCredites: number } | { success: false; error: string }> {
  try {
    const result = await db.runTransaction(async (tx: Transaction) => {
      const reqRef = db.collection('qr_scan_requests').doc(requestId)
      const reqSnap = await tx.get(reqRef)
      if (!reqSnap.exists) throw new Error('Demande introuvable.')

      const req = reqSnap.data()!
      if (req.partenaire_id !== partenaireId) throw new Error('Accès refusé.')
      if (req.status !== 'pending') throw new Error(`Demande déjà ${req.status}.`)

      const now = new Date()
      if (now.toISOString() > (req.expires_at as string)) {
        tx.update(reqRef, { status: 'expired' })
        throw new Error('Demande expirée (> 2 minutes).')
      }

      const starsACrediter = req.stars_a_crediter as number
      const partenaireRef = db.collection('prescripteurs_partenaires').doc(partenaireId)
      const partSnap = await tx.get(partenaireRef)
      if (!partSnap.exists) throw new Error('Partenaire introuvable.')

      const provision = (partSnap.data()!.solde_provision as number) ?? 0
      const params = await getParametresPlateforme()
      const coutProvision = starsACrediter * params.fidelite_valeur_star_fcfa
      if (provision < coutProvision) throw new Error('Provision insuffisante.')

      const clientRef = db.collection('clients_fidelite').doc(req.client_uid as string)
      const clientSnap = await tx.get(clientRef)
      if (!clientSnap.exists) throw new Error('Client introuvable.')

      const clientData = clientSnap.data()!
      const currentStars = (clientData.points_stars as number) ?? 0
      const currentTotal = (clientData.total_stars_historique as number) ?? 0
      const newTotal = currentTotal + starsACrediter
      const thresholds = {
        seuil_novice: params.fidelite_seuil_novice,
        seuil_explorateur: params.fidelite_seuil_explorateur,
        seuil_ambassadeur: params.fidelite_seuil_ambassadeur,
        seuil_excellence: params.fidelite_seuil_excellence,
      }
      const newStatus = getMembershipStatus(newTotal, thresholds)

      // Mise à jour client
      tx.update(clientRef, {
        points_stars: currentStars + starsACrediter,
        total_stars_historique: newTotal,
        membership_status: newStatus,
        last_status_update: new Date().toISOString(),
        updated_at: FieldValue.serverTimestamp(),
      })

      // Débit provision partenaire
      tx.update(partenaireRef, {
        solde_provision: FieldValue.increment(-coutProvision),
        total_ca_boutique_fcfa: FieldValue.increment(req.montant_net as number),
      })

      // Valider la demande
      tx.update(reqRef, {
        status: 'validated',
        validated_at: new Date().toISOString(),
        validated_by: partenaireId,
      })

      return starsACrediter
    })

    // Récupérer la demande pour notif WhatsApp (hors transaction)
    const reqSnap = await db.collection('qr_scan_requests').doc(requestId).get()
    const req = reqSnap.data()!
    const clientTel = req.client_tel as string
    const partNom = req.partenaire_nom as string
    const montantNet = req.montant_net as number
    const remise = req.remise_appliquee as number

    void sendWhatsApp(
      clientTel,
      `⭐ *L&Lui Stars — Transaction validée*\n\n` +
      `Chez *${partNom}*\n` +
      `Montant réglé : *${montantNet.toLocaleString('fr-FR')} FCFA*\n` +
      (remise > 0 ? `Remise appliquée : *-${remise.toLocaleString('fr-FR')} FCFA*\n` : '') +
      `Stars crédités : *⭐ ${result} Stars*\n\n` +
      `Votre solde a été mis à jour. Merci !\n\nL&Lui Stars ✨`
    )

    console.log(`[QrScan] Demande ${requestId} validée — +${result}⭐ → ${req.client_uid}`)
    return { success: true, starsCredites: result }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[QrScan] validateQrScanRequest erreur:', e)
    return { success: false, error: msg }
  }
}

/**
 * Étape 2 alternative (partenaire) : rejette la demande.
 */
export async function rejectQrScanRequest(
  requestId: string,
  partenaireId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const reqRef = db.collection('qr_scan_requests').doc(requestId)
    const reqSnap = await reqRef.get()
    if (!reqSnap.exists) return { success: false, error: 'Demande introuvable.' }

    const req = reqSnap.data()!
    if (req.partenaire_id !== partenaireId) return { success: false, error: 'Accès refusé.' }
    if (req.status !== 'pending') return { success: false, error: `Demande déjà ${req.status}.` }

    await reqRef.update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      validated_by: partenaireId,
    })

    // Notifier le client
    void sendWhatsApp(
      req.client_tel as string,
      `❌ *L&Lui Stars — Demande refusée*\n\nVotre demande de ${req.stars_a_crediter} Stars chez *${req.partenaire_nom}* a été refusée par le partenaire.\n\nContactez l'établissement pour plus d'informations.\n\nL&Lui Stars`
    )

    console.log(`[QrScan] Demande ${requestId} rejetée par ${partenaireId}`)
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[QrScan] rejectQrScanRequest erreur:', e)
    return { success: false, error: msg }
  }
}

/**
 * Récupère les demandes pending pour un partenaire (polling StarTerminal).
 */
export async function getPendingQrScansForPartner(
  partenaireId: string
): Promise<QrScanRequest[]> {
  try {
    const now = new Date().toISOString()
    const snap = await db
      .collection('qr_scan_requests')
      .where('partenaire_id', '==', partenaireId)
      .where('status', '==', 'pending')
      .where('expires_at', '>', now)
      .orderBy('expires_at', 'asc')
      .get()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return snap.docs.map((doc: any) => {
      const s = serializeFirestoreDoc(doc.data())
      return {
        id: doc.id,
        partenaire_id: s.partenaire_id as string,
        partenaire_nom: s.partenaire_nom as string,
        client_uid: s.client_uid as string,
        client_tel: s.client_tel as string,
        montant_fcfa: s.montant_fcfa as number,
        remise_appliquee: s.remise_appliquee as number,
        montant_net: s.montant_net as number,
        stars_a_crediter: s.stars_a_crediter as number,
        remise_pct: s.remise_pct as number,
        multiplier: s.multiplier as number,
        membership_status: s.membership_status as string,
        status: s.status as QrScanRequest['status'],
        created_at: (s.created_at as string) ?? new Date().toISOString(),
        expires_at: s.expires_at as string,
        validated_at: s.validated_at as string | undefined,
        rejected_at: s.rejected_at as string | undefined,
        validated_by: s.validated_by as string | undefined,
      }
    })
  } catch (e) {
    console.error('[QrScan] getPendingQrScansForPartner erreur:', e)
    return []
  }
}

/**
 * Récupère la demande en attente pour un client (polling côté client).
 */
export async function getPendingQrScanForClient(
  clientTel: string
): Promise<QrScanRequest | null> {
  try {
    const tel = normalizePhone(clientTel)
    const now = new Date().toISOString()
    const snap = await db
      .collection('qr_scan_requests')
      .where('client_uid', '==', tel)
      .where('status', '==', 'pending')
      .where('expires_at', '>', now)
      .orderBy('expires_at', 'desc')
      .limit(1)
      .get()

    if (snap.empty) return null
    const doc = snap.docs[0]
    const s = serializeFirestoreDoc(doc.data())
    return {
      id: doc.id,
      partenaire_id: s.partenaire_id as string,
      partenaire_nom: s.partenaire_nom as string,
      client_uid: s.client_uid as string,
      client_tel: s.client_tel as string,
      montant_fcfa: s.montant_fcfa as number,
      remise_appliquee: s.remise_appliquee as number,
      montant_net: s.montant_net as number,
      stars_a_crediter: s.stars_a_crediter as number,
      remise_pct: s.remise_pct as number,
      multiplier: s.multiplier as number,
      membership_status: s.membership_status as string,
      status: s.status as QrScanRequest['status'],
      created_at: (s.created_at as string) ?? new Date().toISOString(),
      expires_at: s.expires_at as string,
      validated_at: s.validated_at as string | undefined,
      rejected_at: s.rejected_at as string | undefined,
      validated_by: s.validated_by as string | undefined,
    }
  } catch (e) {
    console.error('[QrScan] getPendingQrScanForClient erreur:', e)
    return null
  }
}
