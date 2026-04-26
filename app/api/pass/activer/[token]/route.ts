// GET /api/pass/activer/[token]?secret=WEBHOOK_SECRET
// Olivier clicks this link from his admin email → activates the pass → redirects to card.
// Idempotent: already-active passes redirect to the card without error.
// Unknown token: redirects to /pass/[token] which shows PassIntrouvable.
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { activerPassAuPremierClic } from '@/actions/pass-vip'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { token } = await params
  if (!token) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
  }

  const result = await activerPassAuPremierClic(token)

  // Success (activated or already active) → show card
  if (result.success) {
    return NextResponse.redirect(`${APP_URL}/pass/${token}`)
  }

  // Pass not found → redirect to pass page (PassIntrouvable component will display)
  if (result.error === 'Pass introuvable') {
    return NextResponse.redirect(`${APP_URL}/pass/${token}`)
  }

  // Other system error → JSON for easier debugging
  return NextResponse.json({ error: result.error ?? 'Activation échouée' }, { status: 500 })
}
