// app/api/evjf-evg/route.ts — #146 Demande EVJF/EVG
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const db = getDb()
    await db.collection('evjf_evg_demandes').add({
      ...body,
      statut: 'nouvelle',
      created_at: FieldValue.serverTimestamp(),
    })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
