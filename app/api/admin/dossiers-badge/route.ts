// app/api/admin/dossiers-badge/route.ts
// GET — Nombre de dossiers mariés actifs (role=MARIÉ) pour le badge sidebar
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

function isAdmin(): boolean {
  return cookies().get('admin_session')?.value === process.env.ADMIN_SESSION_TOKEN
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ count: 0 })

  try {
    const db = getDb()
    const snap = await db.collection('portail_users')
      .where('role', '==', 'MARIÉ')
      .limit(200)
      .get()
    return NextResponse.json({ count: snap.size })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
