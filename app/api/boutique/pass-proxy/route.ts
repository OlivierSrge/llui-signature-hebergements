// app/api/boutique/pass-proxy/route.ts
// Proxy CORS public pour la boutique Netlify.
// Traite les commandes Pass VIP directement (sans appel HTTP interne)
// pour éviter les problèmes de self-call sur Vercel.

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { sendPassVipEmails } from '@/lib/email'
import { PASS_VIP_CONFIGS } from '@/types/pass-vip'
import { GRADE_CONFIGS } from '@/types/stars-grade'
import type { PassVipGrade } from '@/types/pass-vip'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function parseGrade(typePass: string): PassVipGrade | null {
  const u = typePass.toUpperCase()
  if (u.includes('DIAMANT')) return 'DIAMANT'
  if (u.includes('SAPHIR'))  return 'SAPHIR'
  if (u.includes('OR'))      return 'OR'
  if (u.includes('ARGENT'))  return 'ARGENT'
  return null
}

// Rate limiting simple en mémoire (5 commandes / heure / IP)
const rateMap = new Map<string, { count: number; reset: number }>()
function rateOk(ip: string): boolean {
  const now = Date.now()
  const e = rateMap.get(ip)
  if (!e || now > e.reset) { rateMap.set(ip, { count: 1, reset: now + 3_600_000 }); return true }
  if (e.count >= 5) return false
  e.count++; return true
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const origin = req.headers.get('origin') ?? '(absent)'
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  console.log('[PASS PROXY] POST — origin:', origin, '| ip:', ip)

  if (!rateOk(ip)) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429, headers: CORS })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400, headers: CORS })
  }

  const nom      = String(body.nom      ?? '').trim()
  const typePass = String(body.type_pass ?? '').trim()
  const montant  = Number(body.montant  ?? 0)
  const tel      = String(body.tel      ?? '').trim()
  const email    = String(body.email    ?? '').trim()
  const codePromo   = body.code_promo  ? String(body.code_promo).trim()  : null
  const nomAffilie  = body.nom_affilie ? String(body.nom_affilie).trim() : null

  console.log('[PASS PROXY] Données — nom:', nom, '| type_pass:', typePass, '| montant:', montant)

  if (!nom || !typePass || !montant || !tel || !email) {
    return NextResponse.json(
      { error: 'Données manquantes', required: ['nom', 'type_pass', 'montant', 'tel', 'email'] },
      { status: 400, headers: CORS }
    )
  }

  if (!typePass.toUpperCase().includes('PASS VIP')) {
    return NextResponse.json({ error: 'Produit non reconnu comme Pass VIP' }, { status: 400, headers: CORS })
  }

  const grade = parseGrade(typePass)
  if (!grade) {
    return NextResponse.json(
      { error: `Grade Pass VIP non reconnu dans "${typePass}"` },
      { status: 400, headers: CORS }
    )
  }

  const config     = PASS_VIP_CONFIGS[grade]
  const gradeConf  = GRADE_CONFIGS[grade]
  const token      = crypto.randomUUID()
  const now        = new Date()
  const createdAt  = now.toISOString()
  const refLisible = `L&Lui-${grade}-${token.slice(0, 4).toUpperCase()}`

  console.log('[PASS PROXY] ✅ Grade:', grade, '| Token:', token)

  // ── Firestore ────────────────────────────────────────────────────
  try {
    await db.collection('pass_vip_pending_orders').add({
      token,
      nom_client:    nom.toUpperCase(),
      email_client:  email,
      tel_client:    tel,
      type_pass:     typePass,
      montant,
      code_promo:    codePromo,
      nom_affilie:   nomAffilie,
      grade_pass:    grade,
      ref_lisible:   refLisible,
      statut:        'pending',
      date_commande: createdAt,
      source:        'boutique_proxy',
    })
    console.log('[PASS PROXY] Firestore OK — token:', token)
  } catch (e) {
    console.error('[PASS PROXY] Firestore erreur:', e)
    return NextResponse.json({ error: 'Erreur serveur (Firestore)' }, { status: 500, headers: CORS })
  }

  // ── Emails (non-bloquant) ─────────────────────────────────────────
  const passUrl       = `${APP_URL}/pass/${token}`
  const activationUrl = `${APP_URL}/admin/confirm/${token}`

  sendPassVipEmails({
    nom_usage:        nom.toUpperCase(),
    grade,
    duree:            config.duree_jours,
    prix:             montant,
    remise_min:       gradeConf.remise_min,
    ref_lisible:      refLisible,
    pass_url:         passUrl,
    activation_url:   activationUrl,
    created_at:       createdAt,
    contact:          tel,
    email:            email,
    prescripteur_nom: nomAffilie,
  }).catch((e) => console.error('[PASS PROXY] sendPassVipEmails erreur:', e))

  return NextResponse.json(
    {
      success:     true,
      token,
      grade,
      ref_lisible: refLisible,
      pass_url:    passUrl,
      statut:      'pending',
      message:     'Commande Pass VIP enregistrée — en attente de confirmation',
    },
    { headers: CORS }
  )
}
