// app/api/test-webhook-simulate/route.ts
// Simule un appel depuis Apps Script vers le webhook
// Usage : GET /api/test-webhook-simulate?code=581259&amount=1097400

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code') ?? '581259'
  const amount = parseFloat(url.searchParams.get('amount') ?? '1097400')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
  const webhookUrl = `${appUrl}/api/sheets-webhook`

  const payload = {
    action: 'update_statut',
    code,
    amount,
    statut: 'Payé',
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SHEETS_WEBHOOK_SECRET ?? ''}`,
      },
      body: JSON.stringify(payload),
    })

    let result: unknown
    try { result = await response.json() } catch { result = await response.text() }

    return Response.json({
      webhook_url: webhookUrl,
      payload_envoyé: payload,
      status: response.status,
      result,
      HAS_SECRET: !!process.env.SHEETS_WEBHOOK_SECRET,
    })
  } catch (error) {
    return Response.json({
      error: (error as Error).message,
      webhook_url: webhookUrl,
    })
  }
}
