// app/api/whatsapp/send/route.ts
// Route interne pour l'envoi WhatsApp via Twilio.
// C'est le SEUL endroit du projet qui importe twilio.
// Les Server Actions (actions/stars.ts) passent par fetch vers cette route
// pour éviter que twilio soit bundlé dans le graphe SSR des Server Components.

import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

const INTERNAL_SECRET = process.env.ADMIN_API_KEY

export async function POST(req: NextRequest) {
  // Auth interne : seules les Server Actions connaissent la clé
  const auth = req.headers.get('authorization')
  if (!INTERNAL_SECRET || auth !== `Bearer ${INTERNAL_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let telephone: string
  let message: string
  try {
    const body = await req.json()
    telephone = body.telephone
    message = body.message
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  if (!telephone || !message) {
    return NextResponse.json({ error: 'telephone et message requis' }, { status: 400 })
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  // Support TWILIO_WHATSAPP_NUMBER (nouvelle convention) ET TWILIO_WHATSAPP_FROM (ancienne)
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER ?? process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('[WhatsApp] Twilio non configuré — skip envoi')
    return NextResponse.json({ success: false, error: 'Config Twilio manquante' })
  }

  try {
    // Normaliser le numéro destinataire en E.164 camerounais
    let tel = telephone.replace(/[\s\-().]/g, '')
    if (tel.startsWith('00')) tel = '+' + tel.slice(2)
    if (/^237\d{8,9}$/.test(tel)) tel = '+' + tel
    if (!tel.startsWith('+')) tel = '+237' + tel

    const fromWa = fromNumber.startsWith('whatsapp:') ? fromNumber : 'whatsapp:' + fromNumber
    const toWa = 'whatsapp:' + tel

    console.log(`[WhatsApp] from=${fromWa} to=${toWa}`)

    const client = twilio(accountSid, authToken)
    const msg = await client.messages.create({ from: fromWa, to: toWa, body: message })

    console.log(`[WhatsApp] OK sid=${msg.sid}`)
    return NextResponse.json({ success: true, sid: msg.sid })
  } catch (error: unknown) {
    const e = error as Record<string, unknown>
    const detail = [
      `message=${e.message ?? String(error)}`,
      e.code ? `code=${e.code}` : null,
      e.status ? `httpStatus=${e.status}` : null,
    ].filter(Boolean).join(' | ')
    console.error(`[WhatsApp] Twilio erreur: ${detail}`)
    return NextResponse.json({ success: false, error: detail })
  }
}
