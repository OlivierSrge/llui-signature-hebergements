// app/api/whatsapp/send/route.ts
// Notifications WhatsApp désactivées — retourne success sans envoyer.
// Pour réactiver : brancher un provider (Fonnte, UltraMsg, Meta API…).

import { NextRequest, NextResponse } from 'next/server'

const INTERNAL_SECRET = process.env.ADMIN_API_KEY

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!INTERNAL_SECRET || auth !== `Bearer ${INTERNAL_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Lire le body pour éviter les erreurs de parsing en amont
  try { await req.json() } catch { /* non bloquant */ }

  // Notifications désactivées
  return NextResponse.json({ success: true, skipped: true })
}
