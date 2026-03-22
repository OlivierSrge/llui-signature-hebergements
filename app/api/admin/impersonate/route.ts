// app/api/admin/impersonate/route.ts
// POST — Génère un token one-time pour accéder à l'espace d'un marié sans mot de passe

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

function checkAdminAuth(session: string | undefined): boolean {
  if (!session) return false
  const token = process.env.ADMIN_SESSION_TOKEN
  return !token || session === token
}

export async function POST(req: Request) {
  const jar = await cookies()
  const session = jar.get('admin_session')?.value
  if (!checkAdminAuth(session)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { marie_uid } = await req.json()
    if (!marie_uid) {
      return NextResponse.json({ error: 'marie_uid requis' }, { status: 400 })
    }

    const db = getDb()

    // Vérifier que le marié existe
    const marieSnap = await db.collection('portail_users').doc(marie_uid).get()
    if (!marieSnap.exists) {
      return NextResponse.json({ error: 'Marié introuvable' }, { status: 404 })
    }
    const nomsMaries = (marieSnap.data()?.noms_maries as string) || marie_uid

    // Générer token one-time (expire dans 5 minutes)
    const token = randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await db.collection('impersonate_tokens').doc(token).set({
      marie_uid,
      noms_maries: nomsMaries,
      expires_at: Timestamp.fromDate(expiresAt),
      used: false,
      created_at: FieldValue.serverTimestamp(),
    })

    // Log dans admin_logs
    await db.collection('admin_logs').add({
      action: 'impersonate',
      marie_uid,
      noms_maries: nomsMaries,
      admin: 'olivier',
      timestamp: FieldValue.serverTimestamp(),
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
    return NextResponse.json({
      success: true,
      url: `${appUrl}/api/admin/open-portail?token=${token}`,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
