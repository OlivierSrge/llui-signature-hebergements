import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getStorageBucket } from '@/lib/firebase'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const session = cookieStore.get('admin_session')?.value
    if (!session || session !== process.env.ADMIN_SESSION_TOKEN) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string | null) ?? 'evenements_kribi'

    if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 })
    }

    const isImage = file.type.startsWith('image/')
    const isPDF = file.type === 'application/pdf'
    if (!isImage && !isPDF) {
      return NextResponse.json({ error: 'Format non supporté (JPEG, PNG, WebP, PDF)' }, { status: 400 })
    }

    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const ext = isPDF ? 'pdf' : 'jpg'
    const filename = `${folder}/${timestamp}-${random}.${ext}`

    const bucket = getStorageBucket()
    const fileRef = bucket.file(filename)

    if (isImage) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const optimized = await sharp(buffer)
        .rotate()
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82, progressive: true })
        .toBuffer()
      await fileRef.save(optimized, {
        metadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' },
      })
    } else {
      const buffer = Buffer.from(await file.arrayBuffer())
      await fileRef.save(buffer, {
        metadata: { contentType: 'application/pdf', cacheControl: 'public, max-age=3600' },
      })
    }

    try {
      await fileRef.makePublic()
    } catch {
      // UAC bucket — ignore
    }

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`
    return NextResponse.json({ url: publicUrl, type: isImage ? 'image' : 'pdf' })
  } catch (err: any) {
    console.error('[upload-evenement]', err)
    return NextResponse.json({ error: err.message || 'Erreur upload' }, { status: 500 })
  }
}
