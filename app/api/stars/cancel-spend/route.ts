import { NextRequest, NextResponse } from 'next/server'
import { cancelSpendTransaction } from '@/actions/stars'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as { transactionId?: string; reason?: string }
    const { transactionId, reason } = body

    if (!transactionId) {
      return NextResponse.json({ success: false, error: 'transactionId requis' }, { status: 400 })
    }

    const result = await cancelSpendTransaction(transactionId, reason ?? 'Annulé par le partenaire')
    return NextResponse.json(result)
  } catch (e) {
    console.error('[cancel-spend] erreur:', e)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
