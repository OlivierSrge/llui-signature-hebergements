// app/api/newsletter/unsubscribe/route.ts
// Webhook Twilio pour les réponses STOP + désinscription directe

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

// POST — appelé par Twilio webhook OU par la page publique /desinscription
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''
  const db = getDb()

  let telephone: string | null = null

  // ── Format Twilio (application/x-www-form-urlencoded) ────────────────────
  if (contentType.includes('application/x-www-form-urlencoded')) {
    try {
      const text = await request.text()
      const params = new URLSearchParams(text)
      const body = params.get('Body') ?? ''
      const from = params.get('From') ?? ''

      // Répondre seulement si l'abonné envoie STOP
      if (body.trim().toUpperCase() !== 'STOP') {
        return new NextResponse(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { 'Content-Type': 'text/xml' } }
        )
      }

      // Extraire le numéro depuis "whatsapp:+237XXXXXXXXX"
      telephone = from.replace('whatsapp:', '').trim()
    } catch {
      return NextResponse.json({ error: 'Parse error' }, { status: 400 })
    }
  } else {
    // ── Format JSON (page publique /desinscription) ────────────────────────
    try {
      const json = await request.json()
      telephone = json.telephone ?? null
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
  }

  if (!telephone) {
    return NextResponse.json({ error: 'Numéro manquant' }, { status: 400 })
  }

  // Normaliser le numéro pour la recherche
  const cleaned = telephone.replace(/[\s\-()]/g, '')
  const variants = [
    cleaned,
    cleaned.startsWith('+') ? cleaned.slice(1) : `+${cleaned}`,
  ]

  try {
    // Chercher dans les variantes
    let found = false
    for (const variant of variants) {
      const snap = await db
        .collection('abonnes_newsletter')
        .where('telephone', '==', variant)
        .limit(1)
        .get()
      if (!snap.empty) {
        await snap.docs[0].ref.update({ actif: false })
        found = true

        // Logger dans admin_logs
        await db.collection('admin_logs').add({
          type: 'unsubscribe',
          telephone: variant,
          source: contentType.includes('x-www-form-urlencoded') ? 'twilio_stop' : 'page_desinscription',
          created_at: new Date().toISOString(),
        })
        break
      }
    }

    // Réponse Twilio (TwiML vide)
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    return NextResponse.json({ success: true, found })
  } catch (e: any) {
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
