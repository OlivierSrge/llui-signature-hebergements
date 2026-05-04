import { NextRequest, NextResponse } from 'next/server'
import { getStorageBucket } from '@/lib/firebase'

const MAX_SIZE = 5 * 1024 * 1024   // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Format invalide — PNG ou JPG uniquement' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop lourd — 5 MB maximum' }, { status: 400 })
    }

    const ext = file.type === 'image/png' ? 'png' : 'jpg'
    const filename = `alliance-privee/payment-proofs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const bucket = getStorageBucket()
    const fileRef = bucket.file(filename)

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        cacheControl: 'private, max-age=0',
      },
    })

    // URL signée valide 7 jours (justificatif admin seulement)
    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })

    return NextResponse.json({ success: true, url: signedUrl, filename })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[upload-payment-proof]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
