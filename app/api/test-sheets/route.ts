// app/api/test-sheets/route.ts
// Endpoint de diagnostic — vérifie que creerAffilie() écrit bien dans Google Sheets
// Usage: GET /api/test-sheets?secret=[ADMIN_SECRET]
// À supprimer après validation en production

import { NextRequest, NextResponse } from 'next/server'
import { creerAffilie } from '@/lib/sheetsCanal2'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const env = {
    GOOGLE_SHEETS_CANAL2_ID: process.env.GOOGLE_SHEETS_CANAL2_ID ?? null,
    HAS_GOOGLE_CLIENT_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
    HAS_GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
  }

  console.log('[test-sheets] env check:', env)

  if (!env.GOOGLE_SHEETS_CANAL2_ID || !env.HAS_GOOGLE_CLIENT_EMAIL || !env.HAS_GOOGLE_PRIVATE_KEY) {
    return NextResponse.json({
      ok: false,
      message: 'Variables d\'environnement manquantes',
      env,
    }, { status: 500 })
  }

  const result = await creerAffilie({
    nom_etablissement: 'TEST Diagnostic ' + new Date().toISOString().slice(11, 19),
    email: 'test@llui-diagnostic.fr',
    reduction_pct: 10,
    commission_pct: 5,
  })

  return NextResponse.json({
    ok: result.success,
    code_promo: result.code_promo,
    env,
    message: result.success
      ? '✅ Ligne insérée dans Affiliés_Codes'
      : '❌ Échec écriture Sheets — voir logs Vercel Function',
  })
}
