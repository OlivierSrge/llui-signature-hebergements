'use server'
// actions/stars.ts — Moteur L&Lui Stars (Canal 2) : OTP, lookup client, fidélité
// Ce fichier NE doit PAS importer twilio ni whatsappNotif.
// L'envoi WhatsApp passe par fetch vers /api/whatsapp/send (twilio isolé dans la route).
// processPartnerTransaction → app/api/stars/process-transaction/route.ts (fetch depuis StarTerminal)

import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { getParametresPlateforme } from './parametres'
import { type MembershipStatus, type NiveauPass } from '@/lib/loyaltyEngine'
import { serializeFirestoreDoc } from '@/lib/serialization'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

// ─── Helper WhatsApp (fetch → route API isolée) ────────────────────────────────
async function sendWhatsApp(telephone: string, message: string): Promise<void> {
  try {
    const res = await fetch(`${APP_URL}/api/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_API_KEY ?? ''}`,
      },
      body: JSON.stringify({ telephone, message }),
    })
    const json = await res.json() as { success: boolean; error?: string }
    if (!json.success) console.error(`[Fidelite] sendWhatsApp erreur: ${json.error}`)
  } catch (e) {
    console.error('[Fidelite] sendWhatsApp fetch erreur:', e)
  }
}

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
  has_pending_spend?: boolean
  pending_spend_id?: string
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

export type SpendStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired'
export type StarsMode = 'earn' | 'spend'

export interface SpendTransaction {
  id: string
  client_id: string
  partenaire_id: string
  type: 'spend'
  points_used: number
  point_value: number
  reduction_fcfa: number
  status: SpendStatus
  created_at: string
  expires_at: string
  confirmed_at?: string | null
  cancelled_at?: string | null
  cancel_reason?: string | null
}

// ─── Helpers internes ──────────────────────────────────────────

function normalizePhone(tel: string): string {
  let t = tel.replace(/[\s\-().]/g, '')
  if (t.startsWith('00')) t = '+' + t.slice(2)
  if (/^237\d{8,9}$/.test(t)) t = '+' + t
  if (!t.startsWith('+')) t = '+237' + t
  return t
}

function docToClient(tel: string, d: Record<string, unknown>): ClientFidelite {
  // serializeFirestoreDoc convertit tous les Timestamp → ISO string, y compris champs inconnus
  const s = serializeFirestoreDoc(d)
  return {
    telephone: tel,
    points_stars: (s.points_stars as number) ?? 0,
    total_stars_historique: (s.total_stars_historique as number) ?? 0,
    membership_status: (s.membership_status as MembershipStatus) ?? 'novice',
    last_status_update: (s.last_status_update as string) ?? new Date().toISOString(),
    created_at: (s.created_at as string) ?? new Date().toISOString(),
    updated_at: (s.updated_at as string) ?? new Date().toISOString(),
    phone_verified: (s.phone_verified as boolean) ?? false,
    has_pending_spend: (s.has_pending_spend as boolean) ?? false,
    pending_spend_id: (s.pending_spend_id as string) ?? undefined,
  }
}

// ─── OTP ───────────────────────────────────────────────────────

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

// ─── Lecture client ────────────────────────────────────────────

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

export async function getPendingTransaction(codeSession: string): Promise<TransactionFidelite | null> {
  try {
    const snap = await db
      .collection('transactions_fidelite')
      .where('code_session', '==', codeSession)
      .where('status', '==', 'pending')
      .limit(1)
      .get()
    if (snap.empty) return null
    const s = serializeFirestoreDoc(snap.docs[0].data())
    return {
      id: snap.docs[0].id,
      client_id: s.client_id as string,
      partenaire_id: s.partenaire_id as string,
      code_session: s.code_session as string,
      montant_net: s.montant_net as number,
      stars_gagnees: s.stars_gagnees as number,
      remise_appliquee: s.remise_appliquee as number,
      niveau_pass: (s.niveau_pass as NiveauPass | null) ?? null,
      remise_pct: s.remise_pct as number,
      multiplier: s.multiplier as number,
      valeur_star_fcfa: s.valeur_star_fcfa as number,
      status: 'pending',
      confirmation_token: s.confirmation_token as string,
      created_at: (s.created_at as string) ?? '',
      expires_at: (s.expires_at as string) ?? '',
    }
  } catch (e) {
    console.error('[Fidelite] getPendingTransaction erreur:', e)
    return null
  }
}

// ─── Spend Stars ───────────────────────────────────────────────

export async function getClientFideliteById(clientId: string): Promise<ClientFidelite | null> {
  try {
    const snap = await db.collection('clients_fidelite').doc(clientId).get()
    if (!snap.exists) return null
    const d = snap.data()!
    if (!d.phone_verified) return null
    return docToClient(clientId, d)
  } catch (e) {
    console.error('[Stars] getClientFideliteById erreur:', e)
    return null
  }
}

export async function spendPointsRequest(params: {
  clientId: string
  partnerId: string
  pointsToUse: number
}): Promise<{ success: boolean; transactionId?: string; reductionFcfa?: number; error?: string }> {
  try {
    const { clientId, partnerId, pointsToUse } = params
    const platformParams = await getParametresPlateforme()
    const pointValue = platformParams.fidelite_valeur_star_fcfa ?? 10

    let transactionId = ''
    let reductionFcfa = 0

    await db.runTransaction(async (tx) => {
      const clientRef = db.collection('clients_fidelite').doc(clientId)
      const clientSnap = await tx.get(clientRef)
      if (!clientSnap.exists) throw new Error('Client introuvable')

      const d = clientSnap.data()!
      if (!d.phone_verified) throw new Error('Téléphone non vérifié')
      if (d.has_pending_spend) throw new Error('Une demande de réduction est déjà en cours')

      const currentPoints = (d.points_stars as number) ?? 0
      if (currentPoints < pointsToUse) throw new Error(`Solde insuffisant (${currentPoints} stars disponibles)`)
      if (pointsToUse <= 0) throw new Error('Nombre de stars invalide')

      reductionFcfa = Math.round(pointsToUse * pointValue)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      const txRef = db.collection('transactions_fidelite').doc()
      transactionId = txRef.id

      tx.set(txRef, {
        type: 'spend',
        client_id: clientId,
        partenaire_id: partnerId,
        points_used: pointsToUse,
        point_value: pointValue,
        reduction_fcfa: reductionFcfa,
        status: 'pending',
        created_at: FieldValue.serverTimestamp(),
        expires_at: expiresAt,
        confirmed_at: null,
        cancelled_at: null,
        cancel_reason: null,
      })

      tx.update(clientRef, {
        has_pending_spend: true,
        pending_spend_id: transactionId,
        updated_at: FieldValue.serverTimestamp(),
      })
    })

    console.log(`[Stars] Spend request créée: ${transactionId} — ${pointsToUse} stars → ${reductionFcfa} FCFA`)
    return { success: true, transactionId, reductionFcfa }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[Stars] spendPointsRequest erreur:', e)
    return { success: false, error: msg }
  }
}

export async function confirmSpendTransaction(
  transactionId: string,
  partnerId: string
): Promise<{ success: boolean; reductionFcfa?: number; error?: string }> {
  try {
    let reductionFcfa = 0

    await db.runTransaction(async (tx) => {
      const txRef = db.collection('transactions_fidelite').doc(transactionId)
      const txSnap = await tx.get(txRef)
      if (!txSnap.exists) throw new Error('Transaction introuvable')

      const d = txSnap.data()!
      if (d.type !== 'spend') throw new Error('Type de transaction invalide')
      if (d.partenaire_id !== partnerId) throw new Error('Partenaire non autorisé')
      if (d.status !== 'pending') throw new Error(`Transaction déjà ${d.status}`)
      if (d.expires_at && new Date(d.expires_at as string) < new Date()) {
        throw new Error('Transaction expirée')
      }

      const clientId = d.client_id as string
      const pointsUsed = d.points_used as number
      reductionFcfa = d.reduction_fcfa as number

      const clientRef = db.collection('clients_fidelite').doc(clientId)
      const clientSnap = await tx.get(clientRef)
      if (!clientSnap.exists) throw new Error('Client introuvable')

      const clientData = clientSnap.data()!
      const currentPoints = (clientData.points_stars as number) ?? 0
      if (currentPoints < pointsUsed) throw new Error(`Solde insuffisant (${currentPoints} stars)`)

      tx.update(txRef, {
        status: 'confirmed',
        confirmed_at: FieldValue.serverTimestamp(),
      })

      tx.update(clientRef, {
        points_stars: FieldValue.increment(-pointsUsed),
        has_pending_spend: false,
        pending_spend_id: FieldValue.delete(),
        updated_at: FieldValue.serverTimestamp(),
      })
    })

    console.log(`[Stars] Spend confirmée: ${transactionId} — ${reductionFcfa} FCFA déduits`)
    return { success: true, reductionFcfa }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[Stars] confirmSpendTransaction erreur:', e)
    return { success: false, error: msg }
  }
}

export async function cancelSpendTransaction(
  transactionId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.runTransaction(async (tx) => {
      const txRef = db.collection('transactions_fidelite').doc(transactionId)
      const txSnap = await tx.get(txRef)
      if (!txSnap.exists) throw new Error('Transaction introuvable')

      const d = txSnap.data()!
      if (d.status !== 'pending') throw new Error(`Transaction déjà ${d.status}`)

      const clientId = d.client_id as string
      const clientRef = db.collection('clients_fidelite').doc(clientId)

      tx.update(txRef, {
        status: 'cancelled',
        cancelled_at: FieldValue.serverTimestamp(),
        cancel_reason: reason,
      })

      tx.update(clientRef, {
        has_pending_spend: false,
        pending_spend_id: FieldValue.delete(),
        updated_at: FieldValue.serverTimestamp(),
      })
    })

    console.log(`[Stars] Spend annulée: ${transactionId} — raison: ${reason}`)
    return { success: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[Stars] cancelSpendTransaction erreur:', e)
    return { success: false, error: msg }
  }
}

export async function getPendingSpendForPartner(partnerId: string): Promise<(SpendTransaction & { client_points: number })[]> {
  try {
    const snap = await db
      .collection('transactions_fidelite')
      .where('partenaire_id', '==', partnerId)
      .where('type', '==', 'spend')
      .where('status', '==', 'pending')
      .get()

    const now = new Date()
    const results: (SpendTransaction & { client_points: number })[] = []
    const expiredIds: string[] = []

    for (const doc of snap.docs) {
      const d = doc.data()
      const expiresAt = d.expires_at as string
      if (expiresAt && new Date(expiresAt) < now) {
        expiredIds.push(doc.id)
        continue
      }

      let clientPoints = 0
      try {
        const clientSnap = await db.collection('clients_fidelite').doc(d.client_id as string).get()
        if (clientSnap.exists) clientPoints = (clientSnap.data()!.points_stars as number) ?? 0
      } catch { /* non bloquant */ }

      const s = serializeFirestoreDoc(d)
      results.push({
        id: doc.id,
        client_id: s.client_id as string,
        partenaire_id: s.partenaire_id as string,
        type: 'spend',
        points_used: s.points_used as number,
        point_value: s.point_value as number,
        reduction_fcfa: s.reduction_fcfa as number,
        status: 'pending',
        created_at: (s.created_at as string) ?? '',
        expires_at: expiresAt,
        confirmed_at: null,
        cancelled_at: null,
        cancel_reason: null,
        client_points: clientPoints,
      })
    }

    // Auto-annuler les expirations en arrière-plan (non bloquant)
    if (expiredIds.length > 0) {
      Promise.all(expiredIds.map((id) => cancelSpendTransaction(id, 'expired')))
        .catch((e) => console.error('[Stars] auto-cancel expired:', e))
    }

    return results
  } catch (e) {
    console.error('[Stars] getPendingSpendForPartner erreur:', e)
    return []
  }
}
