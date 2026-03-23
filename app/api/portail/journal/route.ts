// app/api/portail/journal/route.ts — #51 Journal d'activité — GET dernières actions du marié
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const uid = (await cookies()).get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const db = getDb()
    const snap = await db.collection('admin_logs')
      .where('marie_uid', '==', uid)
      .orderBy('created_at', 'desc')
      .limit(20)
      .get()

    const logs = snap.docs.map(doc => {
      const d = doc.data()
      const ts = d.created_at
      const dateISO = ts?.toDate ? ts.toDate().toISOString() : new Date().toISOString()
      return {
        id: doc.id,
        action: d.action ?? '',
        description: d.description ?? d.message ?? '',
        type: d.type ?? 'info',
        montant: d.montant ?? null,
        date: dateISO,
      }
    })

    return NextResponse.json({ logs })
  } catch (e) {
    console.error('[journal]:', e)
    return NextResponse.json({ logs: [], error: String(e) })
  }
}
