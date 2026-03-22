// app/api/admin/liste-maries/route.ts
// GET — Retourne la liste complète des mariés depuis portail_users (role=MARIÉ)

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
    // Lecture depuis portail_users (source de vérité : noms, code, lieu, cagnotte, date)
    const snap = await db.collection('portail_users')
      .where('role', '==', 'MARIÉ')
      .orderBy('created_at', 'desc')
      .limit(100)
      .get()

    const maries = snap.docs.map(doc => {
      const d = doc.data()
      const dateTs = d.projet?.date_evenement
      const dateISO = dateTs?.toDate ? dateTs.toDate().toISOString().slice(0, 10)
        : typeof dateTs === 'string' ? dateTs : ''
      return {
        uid: doc.id,
        noms_maries: (d.noms_maries as string) || '',
        code: (d.code_promo as string) || '',
        date_mariage: dateISO,
        lieu: (d.projet?.lieu as string) || '',
        cagnotte_cash: (d.wallets?.cash as number) || 0,
        actif: (d.actif as boolean) ?? true,
      }
    })

    return NextResponse.json({ maries })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
