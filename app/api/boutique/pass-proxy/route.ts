// app/api/boutique/pass-proxy/route.ts
// Proxy public CORS pour la boutique Netlify (l-et-lui-signature.com)
// Reçoit les commandes Pass VIP sans secret exposé côté client,
// ajoute SHEETS_WEBHOOK_SECRET côté serveur et appelle /api/webhooks/boutique-pass.

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Rate limiting simple en mémoire (reset automatique à chaque cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 3_600_000 }) // 1h
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

interface ProxyPayload {
  nom?: string
  type_pass?: string
  montant?: number
  code_promo?: string | null
  nom_affilie?: string | null
  tel?: string
  email?: string
  date?: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log('[PASS PROXY] Requête reçue')

  // ── Vérification origine ─────────────────────────────────────────
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigins = [
    'l-et-lui-signature.com',
    'letlui-signature.netlify.app',
    'localhost',
    '127.0.0.1',
  ]
  const originOk = allowedOrigins.some((o) => origin.includes(o))
  if (!originOk) {
    console.warn('[PASS PROXY] Origine refusée:', origin)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403, headers: CORS_HEADERS })
  }

  // ── Rate limiting ────────────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  if (!checkRateLimit(ip)) {
    console.warn('[PASS PROXY] Rate limit dépassé:', ip)
    return NextResponse.json({ error: 'Trop de requêtes — réessayez dans 1 heure' }, { status: 429, headers: CORS_HEADERS })
  }

  // ── Parse body ───────────────────────────────────────────────────
  let data: ProxyPayload
  try {
    data = (await req.json()) as ProxyPayload
    console.log('[PASS PROXY] Body:', JSON.stringify(data).slice(0, 400))
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400, headers: CORS_HEADERS })
  }

  // ── Validation ───────────────────────────────────────────────────
  if (!data.nom || !data.type_pass || !data.montant || !data.tel || !data.email) {
    return NextResponse.json(
      { error: 'Données manquantes', required: ['nom', 'type_pass', 'montant', 'tel', 'email'] },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  // ── Vérification secret configuré ───────────────────────────────
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? process.env.WEBHOOK_SECRET
  if (!secret) {
    console.error('[PASS PROXY] SHEETS_WEBHOOK_SECRET non configuré')
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500, headers: CORS_HEADERS })
  }

  // ── Appel endpoint privé (serveur → serveur, pas de CORS) ────────
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
  const privateUrl = `${APP_URL}/api/webhooks/boutique-pass`

  console.log('[PASS PROXY] → appel', privateUrl, '| client:', data.nom, data.type_pass)

  try {
    const response = await fetch(privateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'X-Webhook-Secret': secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nom:        data.nom,
        type_pass:  data.type_pass,
        montant:    data.montant,
        code_promo: data.code_promo ?? null,
        nom_affilie: data.nom_affilie ?? null,
        tel:        data.tel,
        email:      data.email,
        date:       data.date ?? new Date().toISOString(),
      }),
    })

    const result = await response.json()
    console.log('[PASS PROXY] Réponse endpoint privé HTTP', response.status, ':', JSON.stringify(result).slice(0, 300))

    return NextResponse.json(result, {
      status: response.ok ? 200 : response.status,
      headers: CORS_HEADERS,
    })
  } catch (err: unknown) {
    console.error('[PASS PROXY] Erreur fetch endpoint privé:', err)
    return NextResponse.json(
      { error: 'Erreur serveur proxy', details: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
