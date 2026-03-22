// app/api/portail/ajouter-invite/route.ts
// POST — Ajouter un invité dans mariés/[uid].invites[]

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

    const { prenom, nom, tel, table, hebergement } = await req.json()
    if (!prenom?.trim() && !nom?.trim()) {
      return NextResponse.json({ error: 'Prénom ou nom requis' }, { status: 400 })
    }

    const nouvelInvite = {
      id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      prenom: prenom?.trim() ?? '',
      nom: nom?.trim() ?? '',
      tel: tel?.trim() ?? '',
      table: table?.trim() ?? '',
      hebergement: !!hebergement,
      statut: 'en_attente',
      created_at: new Date().toISOString(),
    }

    const db = getDb()
    await db.collection('portail_users').doc(uid).update({
      invites: FieldValue.arrayUnion(nouvelInvite),
    })

    return NextResponse.json({ success: true, invite: nouvelInvite })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
