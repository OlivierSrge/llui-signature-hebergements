// app/api/admin/upload-carousel-image/route.ts
// Upload d'une image de carrousel vers Firebase Storage (retourne l'URL, ne sauvegarde pas en Firestore)
// Auth : cookie admin_session uniquement

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getStorageBucket } from '@/lib/firebase'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

async function isAdmin(): Promise<boolean> {
  const cookieStore = cookies()
  const adminSession = cookieStore.get('admin_session')?.value
  return !!adminSession && adminSession === process.env.ADMIN_SESSION_TOKEN
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const partnerId = (formData.get('partnerId') as string | null)?.trim()
    const slotIndex = parseInt((formData.get('slotIndex') as string | null) ?? '0', 10)

    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    if (!partnerId) return NextResponse.json({ error: 'partnerId manquant' }, { status: 400 })

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 })
    }

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!allowed.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
      return NextResponse.json({ error: 'Format non supporté (JPEG, PNG, WebP)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Optimisation carrousel : 1200×675 (ratio 16:9), qualité 85%
    const optimized = await sharp(buffer)
      .rotate()
      .resize(1200, 675, { fit: 'cover', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer()

    const filename = `partenaires-prescripteurs/carousel/${partnerId}-slot${slotIndex}-${Date.now()}.jpg`
    const bucket = getStorageBucket()
    const fileRef = bucket.file(filename)

    await fileRef.save(optimized, {
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      },
    })

    try {
      await fileRef.makePublic()
    } catch (aclErr: unknown) {
      console.warn('[upload-carousel-image] makePublic skipped:', (aclErr as Error).message)
    }

    const url = `https://storage.googleapis.com/${bucket.name}/${filename}`
    console.log(`[upload-carousel-image] ✅ ${partnerId} slot${slotIndex} → ${url}`)
    return NextResponse.json({ success: true, url })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[upload-carousel-image]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
