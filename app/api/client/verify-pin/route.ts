import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { verifyPin } from '@/lib/pin-utils'

export async function POST(request: NextRequest) {
  try {
    const { email, pin } = await request.json()
    if (!email || !pin) {
      return NextResponse.json({ error: 'Email et code PIN requis' }, { status: 400 })
    }

    const snap = await db.collection('clients')
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get()

    if (snap.empty) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
    }

    const doc = snap.docs[0]
    const client = { id: doc.id, ...doc.data() } as any

    if (!client.accessPin) {
      return NextResponse.json({ error: 'Aucun code PIN actif. Demandez-en un nouveau.' }, { status: 400 })
    }

    // Vérifier l'expiry pour les PINs temporaires
    if (!client.accessPinPermanent && client.accessPinExpiry) {
      if (new Date(client.accessPinExpiry) < new Date()) {
        return NextResponse.json({ error: 'Code PIN expiré (15 min). Demandez-en un nouveau.' }, { status: 400 })
      }
    }

    if (!verifyPin(pin, client.accessPin)) {
      return NextResponse.json({ error: 'Code PIN incorrect' }, { status: 401 })
    }

    // PIN valide → set cookie de session (7 jours)
    const response = NextResponse.json({ success: true })
    response.cookies.set('client_session', client.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
