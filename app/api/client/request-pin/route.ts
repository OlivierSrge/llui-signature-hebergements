import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { generatePin, hashPin } from '@/lib/pin-utils'

const PIN_EXPIRY_MS = 15 * 60 * 1000 // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

    const snap = await db.collection('clients')
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get()

    if (snap.empty) {
      return NextResponse.json({ error: 'Aucun compte trouvé avec cet email. Effectuez une réservation pour rejoindre L&Lui Stars.' }, { status: 404 })
    }

    const doc = snap.docs[0]
    const client = { id: doc.id, ...doc.data() } as any

    // Si le client a déjà un PIN permanent, pas besoin d'en générer un nouveau
    if (client.accessPinPermanent && client.accessPin) {
      return NextResponse.json({
        success: true,
        hasPin: true,
        phone: client.phone,
      })
    }

    // Générer un PIN temporaire 4 chiffres
    const pin = generatePin()
    const pinHash = hashPin(pin)
    const pinExpiry = new Date(Date.now() + PIN_EXPIRY_MS).toISOString()

    await db.collection('clients').doc(client.id).update({
      accessPin: pinHash,
      accessPinExpiry: pinExpiry,
      accessPinPermanent: false,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      hasPin: false,
      phone: client.phone,
      pin, // PIN en clair transmis via HTTPS — affiché à l'écran + lien WA
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
