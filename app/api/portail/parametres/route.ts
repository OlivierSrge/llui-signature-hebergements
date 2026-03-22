// app/api/portail/parametres/route.ts
// GET — Lire les paramètres du marié connecté

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
    if (!snap.exists) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    const d = snap.data()!
    return NextResponse.json({
      nb_invites_prevus: d.nb_invites_prevus ?? d.projet?.nombre_invites_prevu ?? 0,
      budget_total: d.budget_total ?? d.projet?.budget_previsionnel ?? 0,
      budget_categories: d.budget_categories ?? {},
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
