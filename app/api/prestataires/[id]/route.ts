import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb()
    const doc = await db.collection('prestataires').doc(params.id).get()
    if (!doc.exists) {
      return NextResponse.json({ error: 'Prestataire introuvable' }, { status: 404 })
    }
    const data = doc.data()!
    return NextResponse.json({
      id: doc.id,
      ...data,
      disponibilites: (data.disponibilites ?? []).map((d: any) => ({
        ...d,
        date: d.date?.toDate ? d.date.toDate().toISOString() : d.date,
      })),
      avis: (data.avis ?? []).map((a: any) => ({
        ...a,
        date: a.date?.toDate ? a.date.toDate().toISOString() : a.date,
      })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
