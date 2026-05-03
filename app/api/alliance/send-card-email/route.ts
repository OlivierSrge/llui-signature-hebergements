import { NextRequest, NextResponse } from 'next/server'
import { getMemberCardDetails, sendCardByEmail } from '@/actions/alliance-privee'

export async function POST(req: NextRequest) {
  try {
    const { card_id, email } = await req.json()

    if (!card_id || !email) {
      return NextResponse.json({ success: false, error: 'card_id et email requis' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Email invalide' }, { status: 400 })
    }

    const card = await getMemberCardDetails(card_id)
    if (!card) {
      return NextResponse.json({ success: false, error: 'Carte introuvable' }, { status: 404 })
    }

    const result = await sendCardByEmail(card_id, email, card)
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
