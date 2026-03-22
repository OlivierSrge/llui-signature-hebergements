// app/api/admin/liste-maries/route.ts
// GET — Retourne la liste des mariés (uid + noms + code) depuis codes_promos

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

function checkAdminAuth(session: string | undefined): boolean {
  if (!session) return false
  const token = process.env.ADMIN_SESSION_TOKEN
  return !token || session === token
}

export async function GET() {
  const jar = await cookies()
  const session = jar.get('admin_session')?.value
  if (!checkAdminAuth(session)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const db = getDb()
    const snap = await db.collection('codes_promos').where('actif', '==', true).orderBy('created_at', 'desc').limit(100).get()
    const maries = snap.docs.map(doc => {
      const d = doc.data()
      return {
        uid: d.mariage_uid as string,
        noms_maries: d.noms_maries as string,
        code: doc.id,
      }
    })
    return NextResponse.json({ maries })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
