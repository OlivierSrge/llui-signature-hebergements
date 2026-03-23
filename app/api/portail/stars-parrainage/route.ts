// app/api/portail/stars-parrainage/route.ts — #150 Envoi recommandation parrainage
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { marie_uid, nom_filleul, tel_filleul, code_parrainage } = body
    if (!marie_uid || !nom_filleul || !tel_filleul) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }
    const db = getDb()
    await db.collection('parrainage_leads').add({
      parrain_uid: marie_uid,
      code_parrainage,
      nom_filleul,
      tel_filleul,
      statut: 'nouveau',
      commission_fcfa: 50000,
      created_at: FieldValue.serverTimestamp(),
    })
    // Notif admin (log)
    await db.collection('admin_logs').add({
      type: 'parrainage_lead',
      parrain_uid: marie_uid,
      nom_filleul,
      tel_filleul,
      created_at: FieldValue.serverTimestamp(),
    })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
