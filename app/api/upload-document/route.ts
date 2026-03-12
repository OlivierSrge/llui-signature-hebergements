import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getStorageBucket } from '@/lib/firebase'
import { saveDocumentMeta } from '@/actions/documents'
import type { DocKey } from '@/actions/documents'

const ALLOWED_KEYS: DocKey[] = ['notice_partenaire', 'notice_client', 'notice_administrateur']

export async function POST(req: NextRequest) {
  // Auth admin uniquement
  const cookieStore = cookies()
  if (cookieStore.get('admin_session')?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const key = formData.get('key') as DocKey | null

  if (!file || !key || !ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Seuls les fichiers PDF sont acceptés' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = `documents/notices/${key}.pdf`
  const bucket = getStorageBucket()
  const fileRef = bucket.file(filename)

  await fileRef.save(buffer, {
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'public, max-age=3600',
    },
  })

  try {
    await fileRef.makePublic()
  } catch {
    // UAC bucket — ignore
  }

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`
  await saveDocumentMeta(key, publicUrl, file.size)

  return NextResponse.json({ url: publicUrl })
}
