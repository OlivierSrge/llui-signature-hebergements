// app/api/portail/setup-projet/route.ts
// Initialise le sous-objet "projet" lors de l'onboarding mariage

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { Timestamp } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { uid, noms_maries, date_evenement, lieu, budget_previsionnel, nombre_invites_prevu } = body

    if (!uid || !noms_maries || !date_evenement || !lieu) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const db = getDb()
    await db.collection('portail_users').doc(uid).update({
      noms_maries,
      projet: {
        nom: 'Mariage ' + noms_maries,
        date_evenement: Timestamp.fromDate(new Date(date_evenement)),
        lieu,
        budget_previsionnel: Number(budget_previsionnel) || 0,
        nombre_invites_prevu: Number(nombre_invites_prevu) || 0,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[setup-projet]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
