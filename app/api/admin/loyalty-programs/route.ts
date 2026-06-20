import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { serializeFirestoreDoc } from '@/lib/serialization'

export const dynamic = 'force-dynamic'

// GET /api/admin/loyalty-programs — liste tous les programmes de fidélité
// ?partenaire_id=xxx → filtre par partenaire
export async function GET(req: NextRequest) {
  try {
    const partenaireId = req.nextUrl.searchParams.get('partenaire_id')
    const snap = partenaireId
      ? await db.collection('loyalty_programs').where('partenaire_id', '==', partenaireId).get()
      : await db.collection('loyalty_programs').get()
    const programs = snap.docs.map((doc) => ({
      program_id: doc.id,
      ...serializeFirestoreDoc(doc.data()),
    }))
    return NextResponse.json({ programs })
  } catch (err) {
    console.error('[admin/loyalty-programs GET]', err)
    return NextResponse.json({ programs: [] })
  }
}

// PATCH /api/admin/loyalty-programs — met à jour un programme
// Body: { program_id, prix_fcfa, duree_validite_mois, commission_lui_percent }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { program_id, prix_fcfa, duree_validite_mois, commission_lui_percent } = body

    if (!program_id) {
      return NextResponse.json({ error: 'program_id manquant' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (prix_fcfa !== undefined) updates.prix_fcfa = Number(prix_fcfa)
    if (duree_validite_mois !== undefined) updates.duree_validite_mois = Number(duree_validite_mois)
    if (commission_lui_percent !== undefined) {
      updates.commission_lui_percent = Number(commission_lui_percent)
      updates.commission_partner_percent = 100 - Number(commission_lui_percent)
    }

    await db.collection('loyalty_programs').doc(program_id).update(updates)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/loyalty-programs PATCH]', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
