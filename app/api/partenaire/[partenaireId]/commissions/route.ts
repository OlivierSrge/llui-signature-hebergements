import { db } from '@/lib/firebase'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/partenaire/[partenaireId]/commissions
// Dernières commissions Canal 2 du partenaire
export async function GET(
  _req: NextRequest,
  { params }: { params: { partenaireId: string } }
) {
  try {
    const snap = await db
      .collection('commissions_canal2')
      .where('prescripteur_partenaire_id', '==', params.partenaireId)
      .orderBy('created_at', 'desc')
      .limit(20)
      .get()

    const commissions = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      created_at: d.data().created_at?.toDate?.()?.toISOString() ?? null,
      confirmee_at: d.data().confirmee_at?.toDate?.()?.toISOString() ?? null,
    }))

    return NextResponse.json({ commissions })
  } catch (err) {
    console.error('[commissions]', err)
    return NextResponse.json({ commissions: [] })
  }
}
