// app/api/pass-vip/generate-qr/route.ts
// POST { pass_id } — Génère un token QR temporaire (5 min, usage unique)

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'
import { parseSession, PASS_VIP_COOKIE, todayDate } from '@/lib/pass-vip-helpers'
import { randomBytes } from 'crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
const QR_LIFETIME_MS = 5 * 60 * 1000   // 5 minutes
const MAX_QR_PER_DAY = 20

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth session ────────────────────────────────────────────────
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(PASS_VIP_COOKIE)?.value
  const sessionPassId = parseSession(sessionCookie)

  if (!sessionPassId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  let body: { pass_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { pass_id } = body
  if (!pass_id || pass_id !== sessionPassId) {
    return NextResponse.json({ error: 'pass_id invalide' }, { status: 403 })
  }

  // ── Charger le Pass VIP ─────────────────────────────────────────
  const passDoc = await db.collection('pass_vip_boutique').doc(pass_id).get()
  if (!passDoc.exists) {
    return NextResponse.json({ error: 'Pass introuvable' }, { status: 404 })
  }

  const pass = passDoc.data()!
  if (pass.statut !== 'actif') {
    return NextResponse.json({ error: 'Pass inactif' }, { status: 403 })
  }
  if (new Date(pass.date_fin as string) < new Date()) {
    return NextResponse.json({ error: 'Pass expiré' }, { status: 403 })
  }

  // ── Vérifier limite quotidienne ─────────────────────────────────
  const today = todayDate()
  const qrToday = (pass.qr_reset_date as string) === today ? (pass.qr_generated_today as number ?? 0) : 0
  if (qrToday >= MAX_QR_PER_DAY) {
    return NextResponse.json({ error: 'Limite de 20 QR par jour atteinte' }, { status: 429 })
  }

  // ── Générer token ────────────────────────────────────────────────
  const token = randomBytes(32).toString('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + QR_LIFETIME_MS)

  // ── Sauvegarder dans Firestore ──────────────────────────────────
  await Promise.all([
    db.collection('qr_tokens').doc(token).set({
      token,
      pass_id,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      used: false,
      used_at: null,
      used_by_partner: null,
    }),
    passDoc.ref.update({
      qr_generated_today: qrToday + 1,
      qr_reset_date: today,
    }),
  ])

  const verifyUrl = `${APP_URL}/pass-vip/verify/${token}`

  return NextResponse.json({
    success: true,
    token,
    expires_at: expiresAt.toISOString(),
    url: verifyUrl,
  })
}
