// app/api/admin/send-template-test/route.ts — #18 Envoi test message template
import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsApp } from '@/lib/whatsappNotif'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { phone, message } = await req.json() as { phone: string; message: string }
    if (!phone || !message) return NextResponse.json({ error: 'phone et message requis' }, { status: 400 })
    const result = await sendWhatsApp(phone, message)
    if (result.success) return NextResponse.json({ success: true })
    return NextResponse.json({ success: false, error: result.error }, { status: 500 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
