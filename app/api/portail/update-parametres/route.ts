// app/api/portail/update-parametres/route.ts
// PATCH — Mise à jour des paramètres du mariage par le marié connecté

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

    const body = await req.json()
    const { nb_invites_prevus, budget_total, budget_categories } = body

    const updates: Record<string, unknown> = {
      updated_at: FieldValue.serverTimestamp(),
    }

    if (typeof nb_invites_prevus === 'number') updates.nb_invites_prevus = nb_invites_prevus
    if (typeof budget_total === 'number') updates.budget_total = budget_total
    if (budget_categories && typeof budget_categories === 'object') {
      updates.budget_categories = budget_categories
    }

    const db = getDb()
    await db.collection('portail_users').doc(uid).update(updates)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
