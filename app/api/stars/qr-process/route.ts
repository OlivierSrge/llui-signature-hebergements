// app/api/stars/qr-process/route.ts
// Traite la transaction après scan du QR personnel client par le partenaire.
// 3 niveaux anti-fraude : UUID token + expiry 5min + usage unique (Firestore transaction).

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { randomBytes } from 'crypto'
import { getParametresPlateforme } from '@/actions/parametres'
import {
  getMembershipStatus,
  getRemisePct,
  getMultiplier,
  calculateStars,
  calculateRemiseAmount,
  canUseTransaction,
  getNiveauPass,
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
    console.error('[qr-process] sendWhatsApp erreur:', e)
  }
}

export async function POST(req: NextRequest) {
  let qr_token: string, montant_brut: number, code_promo_affilie: string
  try {
    const body = await req.json()
    qr_token = body.qr_token
    montant_brut = Number(body.montant_brut)
    code_promo_affilie = (body.code_promo_affilie ?? '').trim().toUpperCase()
  } catch {
    return NextResponse.json({ success: false, error: 'Body JSON invalide' }, { status: 400 })
  }

  if (!qr_token || !code_promo_affilie || !(montant_brut > 0)) {
    return NextResponse.json({ success: false, error: 'Paramètres manquants ou invalides' }, { status: 400 })
  }

  try {
    // 1. Lire le token (validation hors transaction — doc read by ID, pas de query)
    const tokenRef = db.collection('stars_qr_tokens').doc(qr_token)
    const tokenDoc = await tokenRef.get()
    if (!tokenDoc.exists) return NextResponse.json({ success: false, error: 'QR Code invalide' })
    const tokenData = tokenDoc.data()!
    if (tokenData.used) return NextResponse.json({ success: false, error: 'Ce QR Code a déjà été utilisé' })
    if (new Date(tokenData.expires_at) <= new Date()) return NextResponse.json({ success: false, error: 'Ce QR Code a expiré' })

    const clientUid: string = tokenData.client_uid

    // 2. Trouver le partenaire par code_promo_affilie
    const partnerSnap = await db.collection('prescripteurs_partenaires')
      .where('code_promo_affilie', '==', code_promo_affilie)
      .where('statut', '==', 'actif')
      .limit(1)
      .get()
    if (partnerSnap.empty) {
      return NextResponse.json({ success: false, error: 'Code partenaire invalide ou partenaire inactif' })
    }
    const partnerDoc = partnerSnap.docs[0]
    const partner = partnerDoc.data()
    const partnerId = partnerDoc.id
    const provision: number = partner.solde_provision ?? 0

    // 3. Client — auto-créé si absent (flux QR sans OTP)
    const clientRef = db.collection('clients_fidelite').doc(clientUid)
    const clientDoc = await clientRef.get()
    const clientData = clientDoc.exists
      ? clientDoc.data()!
      : { points_stars: 0, total_stars_historique: 0, phone_verified: false }

    // 4. Paramètres fidélité
    const params = await getParametresPlateforme()
    const thresholds = {
      seuil_novice: params.fidelite_seuil_novice,
      seuil_explorateur: params.fidelite_seuil_explorateur,
      seuil_ambassadeur: params.fidelite_seuil_ambassadeur,
      seuil_excellence: params.fidelite_seuil_excellence,
    }
    const memberStatus = getMembershipStatus(clientData.total_stars_historique ?? 0, thresholds)
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

    // 5. Calculs
    const remiseAmount = calculateRemiseAmount(montant_brut, remisePct)
    const montantNet = montant_brut - remiseAmount
    const starsGagnees = calculateStars(montantNet, remisePct, multiplier)
    const valeurStarFcfa = params.fidelite_valeur_star_fcfa
    const niveauPass = getNiveauPass(memberStatus)

    // 6. Vérifier provision
    if (!canUseTransaction(provision, starsGagnees, valeurStarFcfa)) {
      return NextResponse.json({
        success: false,
        error: `Provision partenaire insuffisante (${provision.toLocaleString('fr-FR')} FCFA)`,
      })
    }

    // 7. Transaction atomique : marquer token used + créer tx pending
    const confirmationToken = randomBytes(24).toString('base64url')
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
    const txRef = db.collection('transactions_fidelite').doc()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.runTransaction(async (tx: any) => {
      const freshToken = await tx.get(tokenRef)
      if (!freshToken.exists || freshToken.data()!.used) {
        throw new Error('QR Code déjà utilisé ou invalide')
      }
      if (new Date(freshToken.data()!.expires_at) <= new Date()) {
        throw new Error('QR Code expiré')
      }

      // Marquer token comme utilisé
      tx.update(tokenRef, {
        used: true,
        used_at: new Date().toISOString(),
        used_by: partnerId,
      })

      // Créer la transaction pending
      tx.set(txRef, {
        client_id: clientUid,
        partenaire_id: partnerId,
        code_session: `qr:${qr_token.slice(0, 8)}`, // référence QR (pas de code session classique)
        montant_net: montantNet,
        stars_gagnees: starsGagnees,
        remise_appliquee: remiseAmount,
        niveau_pass: niveauPass,
        remise_pct: remisePct,
        multiplier,
        valeur_star_fcfa: valeurStarFcfa,
        status: 'pending',
        confirmation_token: confirmationToken,
        created_at: FieldValue.serverTimestamp(),
        expires_at: expiresAt,
        source: 'qr_client',
      })
    })

    // 8. WhatsApp lien de confirmation (non bloquant)
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

    void sendWhatsApp(clientUid, msg)
    console.log(`[qr-process] TX ${txRef.id} pending — client=${clientUid}, +${starsGagnees}⭐, partenaire=${partnerId}`)

    return NextResponse.json({
      success: true,
      transactionId: txRef.id,
      montant_net: montantNet,
      stars_gagnees: starsGagnees,
      remise_appliquee: remiseAmount,
    })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[qr-process] erreur:', e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
