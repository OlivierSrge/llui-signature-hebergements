// app/api/portail/auth/login/route.ts
// Connexion portail mariés — pose le cookie portail_uid

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json()
    if (!uid) {
      return NextResponse.json({ error: 'uid requis' }, { status: 400 })
    }

    const db = getDb()
    const snap = await db.collection('portail_users').doc(uid).get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Identifiant introuvable' }, { status: 404 })
    }

    const cookieStore = cookies()
    // Note : portail_uid n'est PAS httpOnly intentionnellement.
    // L'uid est l'identifiant de connexion (tapé dans le formulaire login) — ce n'est pas
    // un token secret. De nombreux composants client lisent document.cookie pour l'uid.
    // La sécurité est assurée par le middleware (vérifie que le doc Firestore existe)
    // et par les API serveur qui valident l'uid contre Firestore.
    cookieStore.set('portail_uid', uid, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('portail/auth/login error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
