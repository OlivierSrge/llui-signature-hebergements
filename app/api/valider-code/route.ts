import { NextRequest, NextResponse } from 'next/server'
import { validerCode } from '@/actions/codes-sessions'

const ORIGINES_AUTORISEES = [
  'https://llui-signature-hebergements.vercel.app',
  'https://l-et-lui-signature.com',
  'https://www.l-et-lui-signature.com',
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_BOUTIQUE_URL,
].filter(Boolean) as string[]

function corsHeaders(origin: string | null) {
  const autorise = origin && ORIGINES_AUTORISEES.includes(origin) ? origin : ORIGINES_AUTORISEES[0]
  return {
    'Access-Control-Allow-Origin': autorise,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  const headers = corsHeaders(origin)

  try {
    const body = await req.json() as { code?: string; montant_fcfa?: number; canal?: string }
    const { code, montant_fcfa, canal } = body

    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code))
      return NextResponse.json({ valide: false, raison: 'invalide', message: 'Code invalide (6 chiffres requis)' }, { status: 400, headers })

    if (!montant_fcfa || typeof montant_fcfa !== 'number' || montant_fcfa <= 0)
      return NextResponse.json({ valide: false, raison: 'invalide', message: 'Montant invalide' }, { status: 400, headers })

    if (canal !== 'hebergement' && canal !== 'boutique')
      return NextResponse.json({ valide: false, raison: 'invalide', message: 'Canal invalide' }, { status: 400, headers })

    const result = await validerCode(code, montant_fcfa, canal)
    return NextResponse.json(result, { status: result.valide ? 200 : 422, headers })
  } catch {
    return NextResponse.json({ valide: false, raison: 'invalide', message: 'Erreur serveur' }, { status: 500, headers })
  }
}
