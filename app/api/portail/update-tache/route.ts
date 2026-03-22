// app/api/portail/update-tache/route.ts
// PATCH — Mettre à jour le statut d'une tâche

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request) {
  try {
    const jar = await cookies()
    const uid = jar.get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { tache_id, statut } = await req.json()
    if (!tache_id) return NextResponse.json({ error: 'tache_id requis' }, { status: 400 })

    const db = getDb()
    const ref = db.collection('portail_users').doc(uid).collection('todos').doc(tache_id)
    const updates: Record<string, unknown> = {
      done: statut === 'done',
      updated_at: FieldValue.serverTimestamp(),
    }
    if (statut) updates.statut = statut
    await ref.update(updates)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
