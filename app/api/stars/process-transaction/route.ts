// app/api/stars/process-transaction/route.ts
// Crédite les Stars directement au client sans confirmation WhatsApp.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
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

function normalizePhone(tel: string): string {
  let t = tel.replace(/[\s\-().]/g, '')
  if (t.startsWith('00')) t = '+' + t.slice(2)
  if (/^237\d{8,9}$/.test(t)) t = '+' + t
  if (!t.startsWith('+')) t = '+237' + t
  return t
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

    // 2. Profil client (créé si absent)
    const clientRef = db.collection('clients_fidelite').doc(tel)
    const clientSnap = await clientRef.get()
    const clientData = clientSnap.exists
      ? clientSnap.data()!
      : { points_stars: 0, total_stars_historique: 0, membership_status: 'novice' }

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

    // 7. Crédit atomique via Firestore transaction
    const txRef = db.collection('transactions_fidelite').doc()
    const now = new Date()

    await db.runTransaction(async (t) => {
      // Créer la transaction confirmée
      t.set(txRef, {
        client_id: tel,
        partenaire_id: partenaireId,
        code_session,
        montant_brut,
        montant_net: montantNet,
        stars_gagnees: starsGagnees,
        remise_appliquee: remiseAmount,
        niveau_pass: niveauPass,
        remise_pct: remisePct,
        multiplier,
        valeur_star_fcfa: valeurStarFcfa,
        status: 'confirmed',
        confirmed_at: FieldValue.serverTimestamp(),
        created_at: FieldValue.serverTimestamp(),
        source: 'terminal_partenaire',
      })

      // Mettre à jour (ou créer) le profil client
      t.set(clientRef, {
        telephone: tel,
        points_stars: FieldValue.increment(starsGagnees),
        total_stars_historique: FieldValue.increment(starsGagnees),
        membership_status: memberStatus,
        updated_at: FieldValue.serverTimestamp(),
        ...(clientSnap.exists ? {} : {
          phone_verified: false,
          created_at: FieldValue.serverTimestamp(),
        }),
      }, { merge: true })

      // Décrémenter la provision du partenaire
      t.update(db.collection('prescripteurs_partenaires').doc(partenaireId), {
        solde_provision: FieldValue.increment(-(starsGagnees * valeurStarFcfa)),
      })
    })

    console.log(`[Stars] TX ${txRef.id} confirmed direct — client=${tel}, +${starsGagnees}⭐`)

    return NextResponse.json({
      success: true,
      transactionId: txRef.id,
      message: `${starsGagnees} Stars crédités au client.`,
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
