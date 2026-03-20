// app/api/portail/invites/route.ts
// Guest Connect — liste + ajout d'invités

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

function getUid(): string | null {
  return cookies().get('portail_uid')?.value ?? null
}

export async function GET() {
  const uid = getUid()
  if (!uid) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const db = getDb()
  const snap = await db.collection(`portail_users/${uid}/invites_guests`)
    .orderBy('created_at', 'desc').get()
  const guests = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return NextResponse.json({ guests })
}

export async function POST(req: NextRequest) {
  const uid = getUid()
  if (!uid) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { nom, telephone, email, magic_link_slug } = await req.json()
  if (!nom || !telephone || !magic_link_slug) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }
  const db = getDb()
  const ref = await db.collection(`portail_users/${uid}/invites_guests`).add({
    mariage_uid: uid, nom, telephone, email: email || null,
    magic_link_slug, lien_envoye: false, converted: false,
    total_achats: 0, commissions_generees: 0,
    created_at: FieldValue.serverTimestamp(),
  })
  return NextResponse.json({ id: ref.id })
}
