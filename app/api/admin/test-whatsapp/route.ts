// app/api/admin/test-whatsapp/route.ts
// GET — Test envoi WhatsApp via Twilio sandbox
// Usage : GET /api/admin/test-whatsapp?to=+237XXXXXXXXX

import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsApp } from '@/lib/whatsappNotif'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const accountSid  = process.env.TWILIO_ACCOUNT_SID
  const authToken   = process.env.TWILIO_AUTH_TOKEN
  const fromNumber  = process.env.TWILIO_WHATSAPP_FROM

  // Vérification variables d'environnement
  const missing: string[] = []
  if (!accountSid)  missing.push('TWILIO_ACCOUNT_SID')
  if (!authToken)   missing.push('TWILIO_AUTH_TOKEN')
  if (!fromNumber)  missing.push('TWILIO_WHATSAPP_FROM')
  if (missing.length > 0) {
    return NextResponse.json({
      success: false,
      error: `Variables manquantes : ${missing.join(', ')}`,
    }, { status: 500 })
  }

  // Numéro cible : param ?to= ou fallback numéro test
  const toParam = req.nextUrl.searchParams.get('to') ?? '+237693407964'

  // Diagnostic : affiche ce qui sera envoyé à Twilio (sans authToken)
  const fromWa = fromNumber!.startsWith('whatsapp:') ? fromNumber! : 'whatsapp:' + fromNumber!
  const diagInfo = {
    TWILIO_ACCOUNT_SID: accountSid!.slice(0, 8) + '…',
    TWILIO_WHATSAPP_FROM_raw: fromNumber,
    from_will_be: fromWa,
    to_param: toParam,
  }

  console.log('[test-whatsapp] Tentative envoi:', diagInfo)

  const result = await sendWhatsApp(
    toParam,
    `✅ Test L&Lui Signature\nWhatsApp Twilio opérationnel !\n\nEnvoyé depuis sandbox Twilio.\nHeure : ${new Date().toISOString()}`,
  )

  if (result.success) {
    return NextResponse.json({ success: true, message: 'Message envoyé', diag: diagInfo })
  } else {
    return NextResponse.json({ success: false, error: result.error, diag: diagInfo }, { status: 500 })
  }
}
