// app/api/stars/qr-scan/validate/route.ts
// POST { requestId, partenaireId } — validation depuis StarTerminal partenaire

import { NextRequest, NextResponse } from 'next/server'
import { validateQrScanRequest } from '@/actions/qr-scan'

export async function POST(req: NextRequest) {
  let requestId: string
  let partenaireId: string

  try {
    const body = await req.json()
    requestId = body.requestId
    partenaireId = body.partenaireId
  } catch {
    return NextResponse.json({ success: false, error: 'Body JSON invalide' }, { status: 400 })
  }

  if (!requestId || !partenaireId) {
    return NextResponse.json({ success: false, error: 'requestId et partenaireId requis' }, { status: 400 })
  }

  const result = await validateQrScanRequest(requestId, partenaireId)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}
