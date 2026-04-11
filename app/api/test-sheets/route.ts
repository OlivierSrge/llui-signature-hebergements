// app/api/test-sheets/route.ts
// Endpoint de diagnostic — vérifie creerAffilie() en isolation
// Usage: GET /api/test-sheets

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { creerAffilie } = await import('@/lib/sheetsCanal2')
    const result = await creerAffilie({
      nom_etablissement: 'TEST DIAGNOSTIC',
      email: 'test@llui.com',
      reduction_pct: 10,
      commission_pct: 8,
    })
    return Response.json({
      success: result.success,
      result,
      error_detail: (result as Record<string, unknown>).error_message ?? null,
      env: {
        hasSheetId: !!process.env.GOOGLE_SHEETS_CANAL2_ID,
        sheetIdComplet: process.env.GOOGLE_SHEETS_CANAL2_ID,
        hasEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
      },
    })
  } catch (error) {
    return Response.json({
      success: false,
      error: (error as Error).message,
      env: {
        hasSheetId: !!process.env.GOOGLE_SHEETS_CANAL2_ID,
        sheetIdComplet: process.env.GOOGLE_SHEETS_CANAL2_ID,
        hasEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
      },
    })
  }
}
