import { db } from '@/lib/firebase'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/partenaire/[partenaireId]/canal2-stats
// Stats boutique Canal 2 depuis prescripteurs_partenaires
export async function GET(
  _req: NextRequest,
  { params }: { params: { partenaireId: string } }
) {
  try {
    const doc = await db.collection('prescripteurs_partenaires').doc(params.partenaireId).get()
    if (!doc.exists) {
      return NextResponse.json({
        total_ca_boutique_fcfa: 0,
        total_commissions_fcfa: 0,
        total_utilisations: 0,
      })
    }
    const d = doc.data()!
    return NextResponse.json({
      total_ca_boutique_fcfa: d.total_ca_boutique_fcfa ?? 0,
      total_commissions_fcfa: d.total_commissions_fcfa ?? 0,
      total_utilisations: d.total_utilisations ?? 0,
    })
  } catch (err) {
    console.error('[canal2-stats]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
