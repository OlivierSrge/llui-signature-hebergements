// app/api/portail/ajouter-tache/route.ts
// POST — Ajouter une tâche dans la subcollection todos

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const jar = await cookies()
    const uid = jar.get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { titre, phase, priorite, date_limite } = await req.json()
    if (!titre?.trim()) return NextResponse.json({ error: 'Titre requis' }, { status: 400 })

    const revMap: Record<string, number> = { haute: 50, moyenne: 30, basse: 20 }

    const db = getDb()
    const ref = db.collection('portail_users').doc(uid).collection('todos').doc()
    await ref.set({
      libelle: titre.trim(),
      done: false,
      phase: phase ?? 1,
      priorite: priorite ?? 'moyenne',
      rev: revMap[priorite ?? 'moyenne'] ?? 20,
      date_limite: date_limite ? Timestamp.fromDate(new Date(date_limite)) : null,
      created_at: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, id: ref.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
