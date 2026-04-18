import { NextRequest, NextResponse } from 'next/server'
import { confirmSpendTransaction } from '@/actions/stars'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

async function sendWhatsApp(telephone: string, message: string): Promise<void> {
  try {
    await fetch(`${APP_URL}/api/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ADMIN_API_KEY ?? ''}`,
      },
      body: JSON.stringify({ telephone, message }),
    })
  } catch (e) {
    console.warn('[confirm-spend] sendWhatsApp erreur:', e)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as { transactionId?: string; partnerId?: string; clientTel?: string }
    const { transactionId, partnerId, clientTel } = body

    if (!transactionId || !partnerId) {
      return NextResponse.json({ success: false, error: 'transactionId et partnerId requis' }, { status: 400 })
    }

    const result = await confirmSpendTransaction(transactionId, partnerId)

    if (result.success && clientTel) {
      const msg = `✅ *Réduction L&Lui Stars confirmée !*\n\n${result.reductionFcfa?.toLocaleString('fr-FR')} FCFA déduits de votre note.\n\nMerci de votre fidélité ⭐\n\nL&Lui Signature`
      await sendWhatsApp(clientTel, msg)
    }

    return NextResponse.json(result)
  } catch (e) {
    console.error('[confirm-spend] erreur:', e)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
