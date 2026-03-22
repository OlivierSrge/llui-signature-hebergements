// app/api/portail/update-prestataire/route.ts
// PATCH — Mettre à jour un prestataire (statut, notes, montant, recu_url)

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request) {
  try {
    const jar = await cookies()
    const uid = jar.get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { prestataire_id, statut, notes, montant, recu_url } = await req.json()
    if (!prestataire_id) return NextResponse.json({ error: 'prestataire_id requis' }, { status: 400 })

    const db = getDb()
    const snap = await db.collection('portail_users').doc(uid).get()
    if (!snap.exists) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    const prestataires: Array<Record<string, unknown>> = snap.data()?.prestataires ?? []
    const updated = prestataires.map(p => {
      if (p.id !== prestataire_id) return p
      const u = { ...p }
      if (statut !== undefined) u.statut = statut
      if (notes !== undefined) u.notes = notes
      if (montant !== undefined) u.montant = Number(montant) || 0
      if (recu_url !== undefined) u.recu_url = recu_url
      return u
    })

    await db.collection('portail_users').doc(uid).update({ prestataires: updated })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
