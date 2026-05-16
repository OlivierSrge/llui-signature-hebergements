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

  const cleanEmail = email.trim()
  const cleanEmailLower = cleanEmail.toLowerCase()
  const cleanPassword = password.trim()

  // Rechercher tous les Pass VIP actifs possibles pour cet email (gestion des tests multiples et de la casse)
  const snapExact = await db.collection('pass_vip_boutique')
    .where('email', '==', cleanEmail)
    .where('statut', '==', 'actif')
    .get()

  let docs = snapExact.docs

  if (cleanEmail !== cleanEmailLower) {
    const snapLower = await db.collection('pass_vip_boutique')
      .where('email', '==', cleanEmailLower)
      .where('statut', '==', 'actif')
      .get()
    docs = [...docs, ...snapLower.docs]
  }

  if (docs.length === 0) {
    return NextResponse.json({ error: 'Aucun Pass VIP actif pour cet email' }, { status: 401 })
  }

  // Chercher le pass qui correspond au mot de passe saisi (évite l'erreur si un email a plusieurs pass de test)
  let validDoc = null

  for (const doc of docs) {
    const pass = doc.data()
    // Ignorer si expiré
    if (pass.date_fin && new Date(pass.date_fin as string) < new Date()) {
      continue
    }
    if (verifyPassword(cleanPassword, pass.password_hash as string)) {
      validDoc = doc
      break
    }
  }

  if (!validDoc) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  // Créer la session cookie (7 jours)
  const sessionValue = makeSessionValue(validDoc.id)
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
