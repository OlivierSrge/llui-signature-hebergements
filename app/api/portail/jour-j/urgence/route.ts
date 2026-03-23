// app/api/portail/jour-j/urgence/route.ts — #172 Bouton urgence → Olivier
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { sendWhatsApp } from '@/lib/whatsappNotif'

export const dynamic = 'force-dynamic'

const OLIVIER_TEL = process.env.OLIVIER_PHONE || process.env.ADMIN_PHONE || '+237693407964'

export async function POST(req: NextRequest) {
  try {
    const { marie_uid } = await req.json()
    if (!marie_uid) return NextResponse.json({ error: 'marie_uid requis' }, { status: 400 })

    const db = getDb()
    const snap = await db.collection('portail_users').doc(marie_uid).get()
    const d = snap.data() || {}
    const noms = (d.noms_maries as string) || 'Mariés inconnus'

    const message = `🚨 *URGENCE JOUR J — L&Lui Signature*\n\nLes mariés *${noms}* ont déclenché l'alerte urgence.\n\n⏰ ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\n\nContactez-les immédiatement.`

    await sendWhatsApp(OLIVIER_TEL, message)

    // Log dans admin_logs
    await db.collection('admin_logs').add({
      type: 'urgence_jour_j',
      marie_uid,
      noms_maries: noms,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
