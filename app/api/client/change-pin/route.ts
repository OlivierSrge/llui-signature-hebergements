import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { verifyPin, hashPin } from '@/lib/pin-utils'

export async function POST(request: NextRequest) {
  try {
    const clientId = request.cookies.get('client_session')?.value
    if (!clientId) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
    }

    const { currentPin, newPin } = await request.json()

    if (!newPin || !/^\d{4,6}$/.test(newPin)) {
      return NextResponse.json({ error: 'Le nouveau PIN doit contenir 4 à 6 chiffres' }, { status: 400 })
    }

    const doc = await db.collection('clients').doc(clientId).get()
    if (!doc.exists) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    }

    const client = doc.data() as any

    // Si le client a déjà un PIN permanent, vérifier l'ancien
    if (client.accessPinPermanent && client.accessPin) {
      if (!currentPin || !verifyPin(currentPin, client.accessPin)) {
        return NextResponse.json({ error: 'Code PIN actuel incorrect' }, { status: 401 })
      }
    }

    await db.collection('clients').doc(clientId).update({
      accessPin: hashPin(newPin),
      accessPinPermanent: true,
      accessPinExpiry: null,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
