// app/api/test-sheets/route.ts
// Endpoint de diagnostic — vérifie creerAffilie() en isolation
// Accessible uniquement hors production
// Usage: GET /api/test-sheets

import { NextResponse } from 'next/server'
import { creerAffilie } from '@/lib/sheetsCanal2'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Non disponible en production' }, { status: 403 })
  }

  try {
    const result = await creerAffilie({
      nom_etablissement: 'TEST DIAGNOSTIC',
      email: 'test@llui.com',
      reduction_pct: 10,
      commission_pct: 8,
    })
    return Response.json({
      result,
      env: {
        hasSheetId: !!process.env.GOOGLE_SHEETS_CANAL2_ID,
        hasEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
        sheetIdPreview: process.env.GOOGLE_SHEETS_CANAL2_ID?.slice(0, 10) + '...',
      },
    })
  } catch (error) {
    return Response.json({
      success: false,
      error: (error as Error).message,
      env: {
        hasSheetId: !!process.env.GOOGLE_SHEETS_CANAL2_ID,
        hasEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
      },
    })
  }
}
