// app/api/pass-vip/use-token/route.ts
// POST { token, partner_id? } — Marque un QR token comme utilisé + log audit

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { token?: string; partner_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { token, partner_id } = body
  if (!token) {
    return NextResponse.json({ error: 'token requis' }, { status: 400 })
  }

  // ── Charger le token ────────────────────────────────────────────
  const tokenDoc = await db.collection('qr_tokens').doc(token).get()
  if (!tokenDoc.exists) {
    return NextResponse.json({ error: 'Token invalide' }, { status: 404 })
  }

  const qr = tokenDoc.data()!
  const now = new Date()

  if (qr.used) {
    return NextResponse.json({ error: 'Token déjà utilisé' }, { status: 409 })
  }
  if (new Date(qr.expires_at as string) < now) {
    return NextResponse.json({ error: 'Token expiré' }, { status: 410 })
  }

  // ── Marquer utilisé + log audit ─────────────────────────────────
  const nowIso = now.toISOString()
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
  const userAgent = req.headers.get('user-agent') ?? ''

  await Promise.all([
    tokenDoc.ref.update({
      used: true,
      used_at: nowIso,
      used_by_partner: partner_id ?? null,
    }),
    db.collection('pass_vip_audit').add({
      pass_id: qr.pass_id,
      action: 'qr_used',
      token,
      partner_id: partner_id ?? null,
      timestamp: nowIso,
      ip,
      user_agent: userAgent,
    }),
  ])

  console.log('[USE TOKEN] ✅ Token utilisé — pass_id:', qr.pass_id, '| partner:', partner_id ?? 'inconnu')

  return NextResponse.json({ success: true, message: 'Utilisation enregistrée' })
}
