// app/api/portail/upload/route.ts
// POST — Upload d'un fichier vers Firebase Storage (admin SDK)
// Body: FormData avec "file" (fichier) et "path" (chemin de destination)

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getStorage } from 'firebase-admin/storage'
import { getApp } from 'firebase-admin/app'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const jar = await cookies()
    const uid = jar.get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const destPath = (formData.get('path') as string) || `maries/${uid}/uploads/${Date.now()}`

    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

    // Vérifier que le chemin appartient bien au marié connecté
    if (!destPath.startsWith(`maries/${uid}/`)) {
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 })
    }

    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    if (!storageBucket) return NextResponse.json({ error: 'Storage bucket non configuré' }, { status: 500 })

    const bucket = getStorage(getApp()).bucket(storageBucket)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const fileRef = bucket.file(destPath)
    await fileRef.save(buffer, {
      metadata: { contentType: file.type || 'application/octet-stream' },
    })
    await fileRef.makePublic()
    const publicUrl = `https://storage.googleapis.com/${storageBucket}/${destPath}`

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Aussi exposer comme handler pour GetDb init
const _db = getDb
void _db
