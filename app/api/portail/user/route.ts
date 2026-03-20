// app/api/portail/user/route.ts
// Données publiques d'un utilisateur portail (lecture légère)

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const uid = searchParams.get('uid')
    if (!uid) return NextResponse.json({ error: 'uid manquant' }, { status: 400 })

    const db = getDb()
    const snap = await db.collection('portail_users').doc(uid).get()
    if (!snap.exists) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    const d = snap.data()!
    return NextResponse.json({
      uid,
      displayName: d.displayName ?? '',
      date_evenement: d.projet?.date_evenement ?? d.date_evenement ?? '',
      lieu: d.projet?.lieu ?? d.lieu ?? '',
      budget_previsionnel: d.projet?.budget_previsionnel ?? d.budget_previsionnel ?? 0,
      nombre_invites_prevu: d.projet?.nombre_invites_prevu ?? d.nombre_invites_prevu ?? 0,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
