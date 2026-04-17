// app/api/stars/process-transaction/route.ts
// Route API publique (appelée depuis StarTerminal côté navigateur).
// Contient la logique de processPartnerTransaction, isolée ici pour éviter
// que actions/stars.ts n'importe twilio via whatsappNotif dans le bundle SSR.

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

function normalizePhone(tel: string): string {
  let t = tel.replace(/[\s\-().]/g, '')
  if (t.startsWith('00')) t = '+' + t.slice(2)
  if (/^237\d{8,9}$/.test(t)) t = '+' + t
  if (!t.startsWith('+')) t = '+237' + t
  return t
}

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
    console.error('[Stars/process-transaction] sendWhatsApp erreur:', e)
  }
}

export async function POST(req: NextRequest) {
  let code_session: string
  let montant_brut: number
  let telephone_client: string

  try {
    const body = await req.json()
    code_session = body.code_session
    montant_brut = Number(body.montant_brut)
    telephone_client = body.telephone_client
  } catch {
    return NextResponse.json({ success: false, error: 'Body JSON invalide' }, { status: 400 })
  }

  if (!code_session || !telephone_client || !(montant_brut > 0)) {
    return NextResponse.json({ success: false, error: 'Paramètres manquants ou invalides' }, { status: 400 })
  }

  try {
    const tel = normalizePhone(telephone_client)

    // 1. Session → partenaire_id
    const sessionSnap = await db.collection('codes_sessions').doc(code_session).get()
    if (!sessionSnap.exists) {
      return NextResponse.json({ success: false, error: 'Session inconnue' })
    }
    const partenaireId = sessionSnap.data()!.prescripteur_partenaire_id as string
    if (!partenaireId) {
      return NextResponse.json({ success: false, error: 'Partenaire non lié à cette session' })
    }

    // 2. Client vérifié
    const clientSnap = await db.collection('clients_fidelite').doc(tel).get()
    if (!clientSnap.exists || !(clientSnap.data()!.phone_verified as boolean)) {
      return NextResponse.json({ success: false, error: 'Client non vérifié. Demandez-lui de scanner le QR code.' })
    }
    const clientData = clientSnap.data()!

    // 3. Provision partenaire
    const partenaireSnap = await db.collection('prescripteurs_partenaires').doc(partenaireId).get()
    if (!partenaireSnap.exists) {
      return NextResponse.json({ success: false, error: 'Partenaire introuvable' })
    }
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
    const valeurStarFcfa = params.fidelite_valeur_star_fcfa
    const niveauPass = getNiveauPass(memberStatus)

    // 5. Calculs
    const remiseAmount = calculateRemiseAmount(montant_brut, remisePct)
    const montantNet = montant_brut - remiseAmount
    const starsGagnees = calculateStars(montantNet, remisePct, multiplier)

    // 6. Vérifier provision
    if (!canUseTransaction(provision, starsGagnees, valeurStarFcfa)) {
      return NextResponse.json({
        success: false,
        error: `Provision insuffisante : ${provision.toLocaleString('fr-FR')} FCFA disponible, ${(starsGagnees * valeurStarFcfa).toLocaleString('fr-FR')} FCFA requis`,
      })
    }

    // 7. Transaction PENDING
    const confirmationToken = randomBytes(24).toString('base64url')
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
      remise_pct: remisePct,
      multiplier,
      valeur_star_fcfa: valeurStarFcfa,
      status: 'pending',
      confirmation_token: confirmationToken,
      created_at: FieldValue.serverTimestamp(),
      expires_at: expiresAt,
    })

    // 8. Lien de confirmation WhatsApp (usage unique, non bloquant)
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

    void sendWhatsApp(tel, msg)
    console.log(`[Stars] TX ${txRef.id} pending — client=${tel}, +${starsGagnees}⭐`)

    return NextResponse.json({
      success: true,
      transactionId: txRef.id,
      message: 'Transaction en attente. Lien de confirmation envoyé sur WhatsApp.',
      montant_net: montantNet,
      stars_gagnees: starsGagnees,
      remise_appliquee: remiseAmount,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[Stars/process-transaction] erreur:', e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
