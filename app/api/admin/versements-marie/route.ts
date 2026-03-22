// app/api/admin/versements-marie/route.ts
// GET — Retourne portail_users/{uid}.versements[] pour le panneau admin

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const jar = await cookies()
    const adminSession = jar.get('admin_session')?.value
    if (!adminSession) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const uid = searchParams.get('uid')
    if (!uid) return NextResponse.json({ error: 'uid requis' }, { status: 400 })

    const db = getDb()
    const snap = await db.collection('portail_users').doc(uid).get()
    if (!snap.exists) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const versements = Array.isArray(snap.data()?.versements) ? snap.data()!.versements : []
    return NextResponse.json({ versements })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
