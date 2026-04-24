// app/api/pass-vip/login/route.ts
// POST { email, password } → set cookie pass_vip_session → redirect dashboard

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { verifyPassword, makeSessionValue, PASS_VIP_COOKIE } from '@/lib/pass-vip-helpers'

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
  }

  // Rechercher le Pass VIP actif par email
  const snap = await db.collection('pass_vip_boutique')
    .where('email', '==', email.trim().toLowerCase())
    .where('statut', '==', 'actif')
    .limit(1)
    .get()

  if (snap.empty) {
    return NextResponse.json({ error: 'Aucun Pass VIP actif pour cet email' }, { status: 401 })
  }

  const doc = snap.docs[0]
  const pass = doc.data()

  // Vérifier que le pass n'est pas expiré
  if (pass.date_fin && new Date(pass.date_fin as string) < new Date()) {
    return NextResponse.json({ error: 'Votre Pass VIP a expiré' }, { status: 401 })
  }

  // Vérifier le mot de passe
  if (!verifyPassword(password, pass.password_hash as string)) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  // Créer la session cookie (7 jours)
  const sessionValue = makeSessionValue(doc.id)
  const res = NextResponse.json({ success: true })
  res.cookies.set(PASS_VIP_COOKIE, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 3600,
    path: '/',
  })
  return res
}
