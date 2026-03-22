// app/api/portail/invites-stats/route.ts
// GET — Retourne portail_users/{uid}.invites[] (statuts pour dots dashboard)

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const jar = await cookies()
    const uid = jar.get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const db = getDb()
    const snap = await db.collection('portail_users').doc(uid).get()
    if (!snap.exists) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const invites: Array<{
      id?: string
      prenom?: string
      nom?: string
      statut?: string
      hebergement?: boolean
      table?: string
    }> = snap.data()?.invites ?? []

    return NextResponse.json({ invites })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
