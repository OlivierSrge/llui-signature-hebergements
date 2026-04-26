// app/api/admin/test-email-pass/route.ts
// GET ?key=ADMIN_API_KEY — Envoie un email Pass VIP test à l'admin pour vérifier Resend

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sendPassVipEmails } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const diag = {
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    FROM_EMAIL: process.env.FROM_EMAIL ?? '(non défini → onboarding@resend.dev)',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? '(non défini → olivierfinestone@gmail.com)',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? '(non défini)',
  }

  console.log('[TEST EMAIL PASS] Diagnostic env:', JSON.stringify(diag))

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({
      success: false,
      error: 'RESEND_API_KEY non configurée dans les variables Vercel',
      diag,
    }, { status: 500 })
  }

  const fakeToken = 'test-' + crypto.randomUUID()

  try {
    await sendPassVipEmails({
      nom_usage: 'CLIENT TEST',
      grade: 'OR',
      duree: 90,
      prix: 15000,
      remise_min: 10,
      ref_lisible: 'L&Lui-OR-TEST',
      pass_url: `${APP_URL}/pass/${fakeToken}`,
      activation_url: `${APP_URL}/admin/confirm/${fakeToken}`,
      created_at: new Date().toISOString(),
      contact: '+237693407964',
      email: null,
      prescripteur_nom: null,
    })
    return NextResponse.json({ success: true, message: 'Email test envoyé à l\'admin', diag })
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : String(e),
      diag,
    }, { status: 500 })
  }
}
