'use server'

import { db } from '@/lib/firebase'
import { nanoid } from 'nanoid'
import {
  getMembershipStatus,
  getRemisePct,
  getMultiplier,
  MEMBERSHIP_LABELS,
  STATUS_ICONS,
  type MembershipStatus,
} from '@/lib/loyaltyEngine'
import { getParametresPlateforme } from '@/actions/parametres'
import type { ParametresPlateforme } from '@/actions/parametres'

export interface QrClientData {
  telephone: string
  points_stars: number
  total_stars_historique: number
  membership_status: MembershipStatus
  membershipLabel: string
  membershipIcon: string
  remise_pct: number
  multiplier: number
}

export type GenerateQrResult =
  | { success: true; token: string; expiresAt: string }
  | { success: false; error: string }

export type GetQrTokenResult =
  | { valid: true; clientData: QrClientData; expiresAt: string; params: ParametresPlateforme }
  | { valid: false; error: string }

export async function generateStarsQrToken(clientUid: string): Promise<GenerateQrResult> {
  try {
    const token = nanoid(32)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000)

    await db.collection('stars_qr_tokens').doc(token).set({
      client_uid: clientUid,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      used: false,
    })

    return { success: true, token, expiresAt: expiresAt.toISOString() }
  } catch (e) {
    console.error('[generateStarsQrToken]', e)
    return { success: false, error: 'Erreur lors de la génération du QR' }
  }
}

export async function getQrTokenData(token: string): Promise<GetQrTokenResult> {
  try {
    const [tokenDoc, params] = await Promise.all([
      db.collection('stars_qr_tokens').doc(token).get(),
      getParametresPlateforme(),
    ])

    if (!tokenDoc.exists) return { valid: false, error: 'QR Code invalide' }

    const data = tokenDoc.data()!
    if (data.used) return { valid: false, error: 'Ce QR Code a déjà été utilisé' }
    if (new Date(data.expires_at) <= new Date()) return { valid: false, error: 'Ce QR Code a expiré' }

    const clientDoc = await db.collection('clients_fidelite').doc(data.client_uid).get()
    if (!clientDoc.exists) return { valid: false, error: 'Client introuvable' }

    const c = clientDoc.data()!
    const thresholds = {
      seuil_novice: params.fidelite_seuil_novice,
      seuil_explorateur: params.fidelite_seuil_explorateur,
      seuil_ambassadeur: params.fidelite_seuil_ambassadeur,
      seuil_excellence: params.fidelite_seuil_excellence,
    }
    const status = getMembershipStatus(c.total_stars_historique ?? 0, thresholds)
    const remise_pct = getRemisePct(status, {
      remise_argent_pct: params.fidelite_remise_argent_pct,
      remise_or_pct: params.fidelite_remise_or_pct,
      remise_platine_pct: params.fidelite_remise_platine_pct,
    })
    const multiplier = getMultiplier(status, {
      multiplicateur_argent: params.fidelite_multiplicateur_argent,
      multiplicateur_or: params.fidelite_multiplicateur_or,
      multiplicateur_platine: params.fidelite_multiplicateur_platine,
    })

    return {
      valid: true,
      expiresAt: data.expires_at,
      params,
      clientData: {
        telephone: data.client_uid,
        points_stars: c.points_stars ?? 0,
        total_stars_historique: c.total_stars_historique ?? 0,
        membership_status: status,
        membershipLabel: MEMBERSHIP_LABELS[status],
        membershipIcon: STATUS_ICONS[status],
        remise_pct,
        multiplier,
      },
    }
  } catch (e) {
    console.error('[getQrTokenData]', e)
    return { valid: false, error: 'Erreur lors de la validation du QR' }
  }
}
