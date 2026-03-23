// app/api/portail/album/route.ts — #9 Upload photo album (base64 → Firestore URL)
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { marie_uid, url, caption } = await req.json()
    if (!marie_uid || !url) return NextResponse.json({ error: 'marie_uid et url requis' }, { status: 400 })

    const db = getDb()
    await db.collection('portail_users').doc(marie_uid).update({
      album_photos: FieldValue.arrayUnion({
        url,
        caption: caption || '',
        uploaded_at: new Date().toISOString(),
      }),
    })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { marie_uid, url } = await req.json()
    if (!marie_uid || !url) return NextResponse.json({ error: 'marie_uid et url requis' }, { status: 400 })

    const db = getDb()
    const snap = await db.collection('portail_users').doc(marie_uid).get()
    const photos = (snap.data()?.album_photos as Array<{ url: string }>) ?? []
    const updated = photos.filter(p => p.url !== url)
    await db.collection('portail_users').doc(marie_uid).update({ album_photos: updated })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
