// app/api/portail/taches/route.ts
// GET — Lire les tâches depuis la subcollection todos du marié connecté

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
    const snap = await db.collection('portail_users').doc(uid)
      .collection('todos')
      .orderBy('created_at', 'asc')
      .limit(50)
      .get()

    const taches = snap.docs.map(doc => {
      const d = doc.data()
      const dlTs = d.date_limite
      const dlISO = dlTs?.toDate ? dlTs.toDate().toISOString().split('T')[0]
        : (typeof dlTs === 'string' ? dlTs : null)
      return {
        id: doc.id,
        libelle: d.libelle ?? '',
        done: d.done ?? false,
        phase: d.phase ?? 1,
        priorite: d.priorite ?? 'basse',
        rev: d.rev ?? 0,
        date_limite: dlISO,
        cta_url: d.cta_url ?? null,
        cta_label: d.cta_label ?? null,
      }
    })

    return NextResponse.json({ taches })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
