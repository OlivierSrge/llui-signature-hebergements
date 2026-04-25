// app/api/boutique/commande/route.ts
// Endpoint appelé DIRECTEMENT par la boutique Netlify (l-et-lui-signature.com)
// CORS ouvert — pas de secret requis (données publiques, confirmation côté admin)
//
// Payload attendu (champs envoyés par le formulaire boutique) :
//   { action, nom_client, tel_client, email_client, produit_nom, prix, quantite, code_promo }
//
// Flux Pass VIP :
//   → Crée doc dans pass_vip_pending_orders
//   → Envoie email admin (Resend) avec bouton /admin/confirm/{token}
//   → Envoie email client (Orange Money instructions)
//
// Flux commande standard :
//   → Enregistre dans Firestore orders (pas de confirmation mobile)
//   → Envoie email admin standard

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { sendPassVipEmails } from '@/lib/email'
import { SKU_TO_GRADE, PASS_VIP_CONFIGS } from '@/types/pass-vip'
import { GRADE_CONFIGS } from '@/types/stars-grade'
import type { PassVipGrade } from '@/types/pass-vip'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Réponse au preflight CORS (OPTIONS)
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

function parseGradeFromProduit(produitNom: string): PassVipGrade | null {
  const u = produitNom.toUpperCase()
  if (u.includes('DIAMANT')) return 'DIAMANT'
  if (u.includes('SAPHIR'))  return 'SAPHIR'
  if (u.includes('OR'))      return 'OR'
  if (u.includes('ARGENT'))  return 'ARGENT'
  return null
}

interface BoutiquePayload {
  action?: string
  nom_client?: string
  tel_client?: string
  email_client?: string
  produit_nom?: string
  produit?: string        // alias alternatif
  prix?: number | string
  quantite?: number | string
  code_promo?: string
  nom_affilie?: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log('[BOUTIQUE COMMANDE] Requête reçue')

  let body: BoutiquePayload
  try {
    const text = await req.text()
    console.log('[BOUTIQUE COMMANDE] Body brut:', text.slice(0, 500))
    body = JSON.parse(text) as BoutiquePayload
  } catch {
    return NextResponse.json(
      { succes: false, message: 'Données invalides — JSON attendu' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  // ── Validation champs requis ──────────────────────────────────────
  const nomClient    = (body.nom_client ?? '').trim()
  const telClient    = (body.tel_client ?? '').trim()
  const emailClient  = (body.email_client ?? '').trim()
  const produitNom   = (body.produit_nom ?? body.produit ?? '').trim()
  const prixOriginal = Number(body.prix ?? 0)
  const quantite     = Math.max(1, Number(body.quantite ?? 1))
  const codePromo    = (body.code_promo ?? '').trim().toUpperCase()
  const nomAffilie   = (body.nom_affilie ?? '').trim()

  if (!nomClient || nomClient.length < 2)
    return NextResponse.json({ succes: false, message: 'Nom invalide' }, { status: 400, headers: CORS_HEADERS })
  if (!telClient || telClient.length < 6)
    return NextResponse.json({ succes: false, message: 'Téléphone invalide' }, { status: 400, headers: CORS_HEADERS })
  if (!emailClient || !emailClient.includes('@'))
    return NextResponse.json({ succes: false, message: 'Email invalide' }, { status: 400, headers: CORS_HEADERS })
  if (!produitNom)
    return NextResponse.json({ succes: false, message: 'Produit manquant' }, { status: 400, headers: CORS_HEADERS })
  if (isNaN(prixOriginal) || prixOriginal <= 0)
    return NextResponse.json({ succes: false, message: 'Prix invalide' }, { status: 400, headers: CORS_HEADERS })

  const montantFinal = prixOriginal * quantite
  const now = new Date()
  const dateFormatee = now.toISOString()

  console.log('[BOUTIQUE COMMANDE] Produit:', produitNom, '| Montant:', montantFinal, '| Client:', nomClient)

  // ── Détection Pass VIP ────────────────────────────────────────────
  const estPassVip = produitNom.toUpperCase().includes('PASS VIP')

  if (estPassVip) {
    const grade = parseGradeFromProduit(produitNom)
    if (!grade) {
      return NextResponse.json(
        { succes: false, message: `Grade Pass VIP non reconnu dans "${produitNom}"` },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const config     = PASS_VIP_CONFIGS[grade]
    const gradeConf  = GRADE_CONFIGS[grade]
    const token      = crypto.randomUUID()
    const refLisible = `L&Lui-${grade}-${token.slice(0, 4).toUpperCase()}`

    console.log('[BOUTIQUE COMMANDE] Pass VIP détecté — grade:', grade, '| token:', token)

    // ── Firestore : créer commande pending ──────────────────────────
    try {
      await db.collection('pass_vip_pending_orders').add({
        token,
        nom_client:    nomClient.toUpperCase(),
        email_client:  emailClient,
        tel_client:    telClient,
        type_pass:     produitNom,
        montant:       montantFinal,
        code_promo:    codePromo || null,
        nom_affilie:   nomAffilie || null,
        grade_pass:    grade,
        ref_lisible:   refLisible,
        statut:        'pending',
        date_commande: dateFormatee,
        source:        'boutique_directe',
      })
      console.log('[BOUTIQUE COMMANDE] Firestore pass_vip_pending_orders créé — token:', token)
    } catch (e) {
      console.error('[BOUTIQUE COMMANDE] Erreur Firestore:', e)
      return NextResponse.json(
        { succes: false, message: 'Erreur serveur (Firestore)' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    // ── Emails Resend (non-bloquant) ────────────────────────────────
    const passUrl      = `${APP_URL}/pass/${token}`
    const activationUrl = `${APP_URL}/admin/confirm/${token}`

    sendPassVipEmails({
      nom_usage:       nomClient.toUpperCase(),
      grade,
      duree:           config.duree_jours,
      prix:            montantFinal,
      remise_min:      gradeConf.remise_min,
      ref_lisible:     refLisible,
      pass_url:        passUrl,
      activation_url:  activationUrl,
      created_at:      dateFormatee,
      contact:         telClient,
      email:           emailClient,
      prescripteur_nom: nomAffilie || null,
    }).catch((e) => console.error('[BOUTIQUE COMMANDE] sendPassVipEmails erreur:', e))

    return NextResponse.json(
      {
        succes:  true,
        message: 'Commande Pass VIP enregistrée — en attente de confirmation',
        token,
        grade,
        ref_lisible: refLisible,
      },
      { headers: CORS_HEADERS }
    )
  }

  // ── Commande standard (non Pass VIP) ─────────────────────────────
  try {
    await db.collection('boutique_commandes').add({
      nom_client:    nomClient,
      email_client:  emailClient,
      tel_client:    telClient,
      produit_nom:   produitNom,
      prix_unitaire: prixOriginal,
      quantite,
      montant_final: montantFinal,
      code_promo:    codePromo || null,
      statut:        'en_attente',
      created_at:    dateFormatee,
      source:        'boutique_directe',
    })
  } catch (e) {
    console.error('[BOUTIQUE COMMANDE] Erreur Firestore commande standard:', e)
  }

  return NextResponse.json(
    {
      succes:  true,
      message: 'Commande enregistrée avec succès',
      client:  nomClient,
      montant_final: montantFinal,
    },
    { headers: CORS_HEADERS }
  )
}
