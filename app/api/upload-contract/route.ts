import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getStorageBucket } from '@/lib/firebase'

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = cookies()
  const adminSession = cookieStore.get('admin_session')?.value
  const partnerSession = cookieStore.get('partner_session')?.value
  return (
    (!!adminSession && adminSession === process.env.ADMIN_SESSION_TOKEN) ||
    !!partnerSession
  )
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { pdfBase64, contractId, partnerId } = body

    if (!pdfBase64 || !contractId || !partnerId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    // Décoder le base64 en buffer
    const buffer = Buffer.from(pdfBase64, 'base64')

    const filename = `contrats/${partnerId}/${contractId}.pdf`
    const bucket = getStorageBucket()
    const fileRef = bucket.file(filename)

    await fileRef.save(buffer, {
      metadata: {
        contentType: 'application/pdf',
        cacheControl: 'private, max-age=0',
      },
    })

    // Rendre public
    try {
      await fileRef.makePublic()
    } catch {
      // UAC bucket — ignorer
    }

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`
    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    console.error('[upload-contract]', err)
    return NextResponse.json(
      { error: err.message || 'Erreur upload PDF' },
      { status: 500 }
    )
  }
}
