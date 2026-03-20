// app/api/admin/test-whatsapp/route.ts
// GET — Test envoi WhatsApp via Twilio

import { NextResponse } from 'next/server'
import twilio from 'twilio'

export const dynamic = 'force-dynamic'

export async function GET() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid) return NextResponse.json({ success: false, error: 'Variable manquante : TWILIO_ACCOUNT_SID' })
  if (!authToken)  return NextResponse.json({ success: false, error: 'Variable manquante : TWILIO_AUTH_TOKEN' })
  if (!from)       return NextResponse.json({ success: false, error: 'Variable manquante : TWILIO_WHATSAPP_FROM' })

  try {
    const client = twilio(accountSid, authToken)
    await client.messages.create({
      from,
      to: 'whatsapp:+237693407964',
      body: '✅ Test L&Lui Signature\nWhatsApp Twilio opérationnel !\nNotifications actives.',
    })
    return NextResponse.json({ success: true, message: 'Message envoyé' })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) })
  }
}
