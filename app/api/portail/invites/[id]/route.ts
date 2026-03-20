// app/api/portail/invites/[id]/route.ts
// Guest Connect — mise à jour + suppression d'un invité

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

function getUid(): string | null {
  return cookies().get('portail_uid')?.value ?? null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = getUid()
  if (!uid) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const data = await req.json()
  const db = getDb()
  await db.doc(`portail_users/${uid}/invites_guests/${params.id}`).update(data)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const uid = getUid()
  if (!uid) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const db = getDb()
  await db.doc(`portail_users/${uid}/invites_guests/${params.id}`).delete()
  return NextResponse.json({ ok: true })
}
