// app/api/webhooks/boutique-pass/route.ts
// POST depuis la boutique Netlify (via Apps Script) à chaque commande Pass VIP.
// Auth : Authorization: Bearer WEBHOOK_SECRET
//
// Accepte 2 formats :
//
// Format NOUVEAU (boutique Netlify / Apps Script) :
//   { nom, type_pass, montant, code_promo, nom_affilie, tel, email, date }
//
// Format ANCIEN (intégration directe) :
//   { sku, nom_usage, contact, email, prescripteur_id, prescripteur_nom, sheets_row, sheets_id }
//
// Flux :
//   1. Détecter le grade depuis type_pass (ou sku)
//   2. Créer le Pass en statut pending (actif: false)
//   3. Envoyer mail admin + mail client via Resend
//   4. Retourner token + pass_url

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { SKU_TO_GRADE, PASS_VIP_CONFIGS } from '@/types/pass-vip'
import { GRADE_CONFIGS } from '@/types/stars-grade'
import type { PassVipGrade } from '@/types/pass-vip'
import { sendPassVipEmails } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

// Parse le grade depuis le nom de produit envoyé par la boutique Netlify
// Ex : "Pass VIP Saphir 10%" → "SAPHIR"
function parseGradeFromTypePass(typePass: string): PassVipGrade | null {
  const u = typePass.toUpperCase()
  if (u.includes('DIAMANT')) return 'DIAMANT'
  if (u.includes('SAPHIR')) return 'SAPHIR'
  if (u.includes('OR'))     return 'OR'
  if (u.includes('ARGENT')) return 'ARGENT'
  return null
}

interface WebhookBody {
  // ── Format Netlify ──────────────────────────────────────
  nom?: string
  type_pass?: string     // ex: "Pass VIP Saphir 10%"
  montant?: number
  code_promo?: string    // code affilié ex: "MAMINDOR-2026"
  nom_affilie?: string
  tel?: string
  date?: string
  // ── Format ancien ───────────────────────────────────────
  sku?: string
  nom_usage?: string
  contact?: string
  prescripteur_id?: string
  prescripteur_nom?: string
  sheets_row?: number
  sheets_id?: string
  // ── Commun ─────────────────────────────────────────────
  email?: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log('[WEBHOOK PASS] Début réception')

  // ── Log diagnostic des headers (aide au debug GAS) ──────────────
  const headersMap: Record<string, string> = {}
  req.headers.forEach((v, k) => { headersMap[k] = v })
  console.log('[WEBHOOK PASS] Headers reçus:', JSON.stringify(headersMap))

  // ── Auth multi-méthode ───────────────────────────────────────────
  // Google Apps Script peut stripper le header Authorization selon le contexte.
  // On accepte donc 3 méthodes d'authentification :
  //   1. Authorization: Bearer <secret>
  //   2. X-Webhook-Secret: <secret>
  //   3. ?secret=<secret> dans l'URL
  const secret = process.env.WEBHOOK_SECRET
  const authHeader = req.headers.get('authorization') ?? ''
  const secretHeader = req.headers.get('x-webhook-secret') ?? ''
  const secretQuery = new URL(req.url).searchParams.get('secret') ?? ''

  const tokenFromBearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const receivedSecret = tokenFromBearer || secretHeader || secretQuery

  console.log('[WEBHOOK PASS] Auth — secret configuré:', !!secret,
    '| Bearer:', !!tokenFromBearer,
    '| X-Webhook-Secret:', !!secretHeader,
    '| ?secret:', !!secretQuery)

  if (!secret || receivedSecret !== secret) {
    console.warn('[WEBHOOK PASS] Auth échouée — secret reçu absent ou invalide')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[WEBHOOK PASS] Auth OK ✅')

  // ── Parse body ───────────────────────────────────────────────────
  let body: WebhookBody
  try {
    body = (await req.json()) as WebhookBody
    console.log('[WEBHOOK PASS] Body reçu:', JSON.stringify(body))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ── Résoudre grade + champs selon le format ──────────────────────
  let grade: PassVipGrade | undefined
  let nom_usage: string
  let contact: string | undefined
  let email: string | undefined
  let code_promo: string | undefined
  let prescripteur_nom: string | undefined
  let prescripteur_id: string | undefined
  let sheets_row: number | undefined
  let sheets_id: string | undefined
  let prix_paye_override: number | undefined

  if (body.type_pass) {
    // Format Netlify
    const upper = body.type_pass.toUpperCase()
    if (!upper.includes('PASS VIP')) {
      console.log('[WEBHOOK PASS] ❌ Produit non Pass VIP ignoré:', body.type_pass)
      return NextResponse.json(
        { ignored: true, reason: 'produit_non_pass_vip' },
        { status: 400 }
      )
    }
    grade = parseGradeFromTypePass(body.type_pass) ?? undefined
    nom_usage = (body.nom ?? 'CLIENT').toUpperCase().trim()
    contact = body.tel
    email = body.email
    code_promo = body.code_promo
    prescripteur_nom = body.nom_affilie
    prix_paye_override = body.montant
    console.log('[WEBHOOK PASS] ✅ Pass VIP détecté:', body.type_pass, '→ grade:', grade)
  } else if (body.sku) {
    // Format ancien
    grade = SKU_TO_GRADE[body.sku] as PassVipGrade | undefined
    nom_usage = (body.nom_usage ?? 'CLIENT').toUpperCase().trim()
    contact = body.contact
    email = body.email
    prescripteur_id = body.prescripteur_id
    prescripteur_nom = body.prescripteur_nom
    sheets_row = body.sheets_row
    sheets_id = body.sheets_id
    console.log('[WEBHOOK PASS] Format ancien — sku:', body.sku, '→ grade:', grade)
  } else {
    return NextResponse.json(
      { error: 'type_pass (format Netlify) ou sku (format ancien) requis' },
      { status: 400 }
    )
  }

  if (!nom_usage) {
    return NextResponse.json({ error: 'nom ou nom_usage requis' }, { status: 400 })
  }

  if (!grade) {
    return NextResponse.json(
      { error: `Grade Pass VIP non reconnu — type_pass: "${body.type_pass ?? ''}" sku: "${body.sku ?? ''}"` },
      { status: 400 }
    )
  }

  const config = PASS_VIP_CONFIGS[grade]
  const gradeConfig = GRADE_CONFIGS[grade]
  const prix_paye = prix_paye_override ?? config.prix_fcfa

  const token = crypto.randomUUID()
  const now = new Date()
  const created_at = now.toISOString()
  const ref_lisible = `L&Lui Signature-${grade}-${token.slice(0, 4).toUpperCase()}`
  // expires_at provisoire — recalculé à l'activation
  const expires_at = new Date(now.getTime() + config.duree_jours * 86400000).toISOString()

  console.log('[WEBHOOK PASS] Token généré:', token)

  try {
    // ── Création Firestore statut pending ───────────────────────────
    await db.collection('pass_vip_actifs').doc(token).set({
      id: token,
      nom_usage,
      grade_pass: grade,
      actif: false,
      statut: 'pending',
      prix_paye,
      sku: config.sku,
      created_at,
      expires_at,
      nb_utilisations: 0,
      prescripteur_id: prescripteur_id ?? null,
      ref_lisible,
      email: email ?? null,
      contact: contact ?? null,
      code_promo: code_promo ?? null,
      sheets_row: sheets_row ?? null,
      sheets_id: sheets_id ?? null,
    })

    console.log('[WEBHOOK PASS] Firestore créé avec statut pending — token:', token)

    const pass_url = `${APP_URL}/pass/${token}`
    const activation_url = `${APP_URL}/api/pass/activer/${token}?secret=${process.env.WEBHOOK_SECRET ?? ''}`

    console.log('[WEBHOOK PASS] Lancement sendPassVipEmails — email client:', email ?? 'absent')

    // ── Emails Resend — non-bloquants ───────────────────────────────
    sendPassVipEmails({
      nom_usage,
      grade,
      duree: config.duree_jours,
      prix: prix_paye,
      remise_min: gradeConfig.remise_min,
      ref_lisible,
      pass_url,
      activation_url,
      created_at,
      contact: contact ?? null,
      email: email ?? null,
      prescripteur_nom: prescripteur_nom ?? null,
    }).then(() => {
      console.log('[WEBHOOK PASS] sendPassVipEmails terminé ✅')
    }).catch((e) => console.error('[WEBHOOK PASS] sendPassVipEmails erreur ❌:', e))

    return NextResponse.json({
      success: true,
      pass_url,
      token,
      grade,
      ref_lisible,
      statut: 'pending',
      message: 'Pass VIP en attente de paiement',
    })
  } catch (e: unknown) {
    console.error('[boutique-pass webhook]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
