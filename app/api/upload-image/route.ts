import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getStorageBucket } from '@/lib/firebase'
import sharp from 'sharp'

// Protect: admin or partner session required
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
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

  const maxSize = 10 * 1024 * 1024 // 10 MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
    return NextResponse.json({ error: 'Format non supporté (JPEG, PNG, WebP)' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    // Compresser et redimensionner avec sharp (max 1600px, qualité 82%)
    const optimized = await sharp(buffer)
      .rotate() // auto-rotation EXIF
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true })
      .toBuffer()

    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const filename = `hebergements/${timestamp}-${random}.jpg`

    const bucket = getStorageBucket()
    const fileRef = bucket.file(filename)

    await fileRef.save(optimized, {
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      },
    })

    // Rendre le fichier public et obtenir l'URL
    await fileRef.makePublic()
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`

    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    console.error('[upload-image]', err)
    return NextResponse.json(
      { error: err.message || 'Erreur lors de l\'upload' },
      { status: 500 }
    )
  }
}
