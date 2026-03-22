// app/api/invite/[marie_uid]/route.ts
// GET — Retourne les données publiques d'un marié pour la fiche invitation
// PUBLIQUE : pas d'auth requise

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { marie_uid: string } }
) {
  try {
    const { marie_uid } = params
    if (!marie_uid) return NextResponse.json({ error: 'marie_uid requis' }, { status: 400 })

    const db = getDb()
    const snap = await db.collection('portail_users').doc(marie_uid).get()

    if (!snap.exists) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const d = snap.data()!

    // Date formatée
    const dateTs = d.date_mariage ?? d.projet?.date_evenement
    const dateISO = dateTs?.toDate
      ? dateTs.toDate().toISOString().slice(0, 10)
      : typeof dateTs === 'string' ? dateTs : ''

    return NextResponse.json({
      noms_maries: (d.noms_maries as string) || '',
      date_mariage: dateISO,
      lieu: (d.lieu as string) || (d.projet?.lieu as string) || 'Kribi, Cameroun',
      code_promo: (d.code_promo as string) || '',
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
