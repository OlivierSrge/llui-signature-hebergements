// app/api/evenements/abonnement/route.ts
// Enregistre un numéro WhatsApp dans abonnes_newsletter

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { telephone } = await req.json()

    if (!telephone || typeof telephone !== 'string') {
      return NextResponse.json({ error: 'Numéro de téléphone requis' }, { status: 400 })
    }

    const cleaned = telephone.trim().replace(/\s+/g, '')
    if (cleaned.length < 8) {
      return NextResponse.json({ error: 'Numéro invalide' }, { status: 400 })
    }

    const db = getDb()

    // Vérifier si déjà abonné
    const existing = await db
      .collection('abonnes_newsletter')
      .where('telephone', '==', cleaned)
      .limit(1)
      .get()

    if (!existing.empty) {
      return NextResponse.json({ success: true, already: true })
    }

    await db.collection('abonnes_newsletter').add({
      telephone: cleaned,
      actif: true,
      source: 'home_kribi',
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, already: false })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}
