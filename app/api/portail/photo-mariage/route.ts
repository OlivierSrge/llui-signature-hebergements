// app/api/portail/photo-mariage/route.ts
// POST — Upload photo principale du mariage vers Firebase Storage
// DELETE — Effacer la photo (reset URL dans Firestore)
// Storage : mariages/{uid}/photo-principale.{ext}
// Firestore : portail_users/{uid}.photo_url

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
    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Format non supporté (jpg, png, webp uniquement)' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop lourd (5 Mo max)' }, { status: 400 })
    }

    const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'
    const destPath = `mariages/${uid}/photo-principale.${ext}`

    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    if (!storageBucket) return NextResponse.json({ error: 'Storage non configuré' }, { status: 500 })

    const bucket = getStorage(getApp()).bucket(storageBucket)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const fileRef = bucket.file(destPath)
    await fileRef.save(buffer, { metadata: { contentType: file.type } })
    await fileRef.makePublic()

    // Cache-bust pour forcer le rechargement même si même nom de fichier
    const publicUrl = `https://storage.googleapis.com/${storageBucket}/${destPath}?v=${Date.now()}`

    const db = getDb()
    await db.collection('portail_users').doc(uid).update({ photo_url: publicUrl })

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const jar = await cookies()
    const uid = jar.get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const db = getDb()
    await db.collection('portail_users').doc(uid).update({ photo_url: '' })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
