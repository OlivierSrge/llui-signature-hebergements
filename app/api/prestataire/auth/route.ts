// app/api/prestataire/auth/route.ts — Authentification portail prestataire
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { Timestamp } from 'firebase-admin/firestore'

// POST /api/prestataire/auth — login prestataire par code PIN
export async function POST(req: NextRequest) {
  const { email, pin } = await req.json()
  if (!email || !pin) {
    return NextResponse.json({ error: 'Email et PIN requis' }, { status: 400 })
  }

  const db = getDb()
  const snap = await db.collection('prestataires')
    .where('email', '==', email.toLowerCase().trim())
    .limit(1)
    .get()

  if (snap.empty) {
    return NextResponse.json({ error: 'Prestataire introuvable' }, { status: 404 })
  }

  const docData = snap.docs[0].data()
  if (docData.pin !== pin) {
    return NextResponse.json({ error: 'PIN incorrect' }, { status: 401 })
  }
  if (docData.statut === 'suspendu') {
    return NextResponse.json({ error: 'Compte suspendu — contacter L&Lui' }, { status: 403 })
  }

  const prestataire_id = snap.docs[0].id
  const sessionToken = `prest_${prestataire_id}_${Date.now()}`

  // Stocker session
  await db.collection('prestataires').doc(prestataire_id).update({
    derniere_connexion: Timestamp.now(),
  })

  const cookieStore = cookies()
  cookieStore.set('prestataire_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 3600,
    path: '/',
  })
  cookieStore.set('prestataire_id', prestataire_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 3600,
    path: '/',
  })

  return NextResponse.json({
    success: true,
    prestataire_id,
    nom: docData.nom,
    type: docData.type,
    certifie: docData.certifie || false,
  })
}

// DELETE — logout
export async function DELETE() {
  const cookieStore = cookies()
  cookieStore.delete('prestataire_session')
  cookieStore.delete('prestataire_id')
  return NextResponse.json({ success: true })
}
