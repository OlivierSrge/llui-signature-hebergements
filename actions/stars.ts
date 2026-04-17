'use server'
// actions/stars.ts — Moteur L&Lui Stars (Canal 2) : OTP, lookup client, fidélité
// Ce fichier NE doit PAS importer twilio ni whatsappNotif.
// L'envoi WhatsApp passe par fetch vers /api/whatsapp/send (twilio isolé dans la route).
// processPartnerTransaction → app/api/stars/process-transaction/route.ts (fetch depuis StarTerminal)

import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { getParametresPlateforme } from './parametres'
import { type MembershipStatus, type NiveauPass } from '@/lib/loyaltyEngine'

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
