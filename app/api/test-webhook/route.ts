// app/api/test-webhook/route.ts
// Teste getNomPartenairePourCode() sur Affiliés_Codes
// Usage : GET /api/test-webhook?code=581259

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code') ?? '581259'

  try {
    const { getNomPartenairePourCode } = await import('@/lib/sheetsCanal2')
    const affilieData = await getNomPartenairePourCode(code)

    return Response.json({
      code_teste: code,
      affilie_trouve: affilieData,
      sheets_ok: !!affilieData,
      env: {
        hasSheetId: !!process.env.GOOGLE_SHEETS_CANAL2_ID,
        hasEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
      },
    })
  } catch (error) {
    return Response.json({
      error: (error as Error).message,
      stack: (error as Error).stack?.slice(0, 300),
    })
  }
}
