import { NextRequest, NextResponse } from 'next/server'
import { getPendingSpendForPartner } from '@/actions/stars'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const partnerId = req.nextUrl.searchParams.get('partnerId')
    if (!partnerId) {
      return NextResponse.json({ success: false, error: 'partnerId requis' }, { status: 400 })
    }

    const transactions = await getPendingSpendForPartner(partnerId)
    return NextResponse.json({ success: true, transactions })
  } catch (e) {
    console.error('[poll-spend] erreur:', e)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
