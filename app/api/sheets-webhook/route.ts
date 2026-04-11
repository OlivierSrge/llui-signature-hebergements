// app/api/sheets-webhook/route.ts
// Webhook sécurisé — reçoit les mises à jour depuis Google Apps Script
// Apps Script appelle cet endpoint quand une ligne du Sheet est modifiée
//
// Env var requise : SHEETS_WEBHOOK_SECRET (chaîne aléatoire longue)
//
// Payload attendu (JSON POST) :
// {
//   "secret": "...",
//   "action": "update_statut",
//   "code": "456789",
//   "statut": "expire"  // ou "epuise" | "actif"
// }
//
// Réponse : { "ok": true } ou { "error": "..." }

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { updateSyncStatus } from '@/lib/sheetsCanal2'

export const dynamic = 'force-dynamic'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>

    // Authentification par secret partagé
    const secret = body.secret as string | undefined
    if (!process.env.SHEETS_WEBHOOK_SECRET || secret !== process.env.SHEETS_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: CORS_HEADERS })
    }

    const action = body.action as string | undefined
    const code = body.code as string | undefined

    if (!action || !code) {
      return NextResponse.json({ error: 'action et code requis' }, { status: 400, headers: CORS_HEADERS })
    }

    // Validation format code 6 chiffres
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Code invalide' }, { status: 400, headers: CORS_HEADERS })
    }

    if (action === 'update_statut') {
      const statut = body.statut as string | undefined
      const statutsValides = ['actif', 'expire', 'epuise']
      if (!statut || !statutsValides.includes(statut)) {
        return NextResponse.json(
          { error: `statut invalide (attendu: ${statutsValides.join(' | ')})` },
          { status: 400, headers: CORS_HEADERS }
        )
      }

      const ref = db.collection('codes_sessions').doc(code)
      const snap = await ref.get()
      if (!snap.exists) {
        await updateSyncStatus(code, '❌ Code introuvable')
        return NextResponse.json({ error: 'Code introuvable dans Firestore' }, { status: 404, headers: CORS_HEADERS })
      }

      await ref.update({ statut, updated_via_sheets_at: new Date().toISOString() })

      // Feedback dans la colonne Sync_Firebase
      const ts = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Douala' })
      await updateSyncStatus(code, `✅ ${statut} — ${ts}`)

      return NextResponse.json({ ok: true, code, statut }, { headers: CORS_HEADERS })
    }

    return NextResponse.json(
      { error: `action inconnue: ${action}` },
      { status: 400, headers: CORS_HEADERS }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[sheets-webhook] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS_HEADERS })
  }
}
