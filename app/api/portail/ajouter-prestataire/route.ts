// app/api/portail/ajouter-prestataire/route.ts
// POST — Ajouter un prestataire dans mariés/[uid].prestataires[]

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const jar = await cookies()
    const uid = jar.get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { nom, type, tel, statut, montant, notes } = await req.json()
    if (!nom?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

    const nouveau = {
      id: `prest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      nom: nom.trim(),
      type: type ?? 'autre',
      tel: tel?.trim() ?? '',
      statut: statut ?? 'a_confirmer',
      montant: Number(montant) || 0,
      notes: notes?.trim() ?? '',
      recu_url: '',
      created_at: new Date().toISOString(),
    }

    const db = getDb()
    await db.collection('portail_users').doc(uid).update({
      prestataires: FieldValue.arrayUnion(nouveau),
    })

    return NextResponse.json({ success: true, prestataire: nouveau })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
