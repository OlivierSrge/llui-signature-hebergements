// app/api/cron/expire-qr-scans/route.ts
// Vercel Cron — expire les demandes QR dépassant 120s

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date().toISOString()
    const snap = await db
      .collection('qr_scan_requests')
      .where('status', '==', 'pending')
      .where('expires_at', '<=', now)
      .get()

    if (snap.empty) {
      return NextResponse.json({ expired: 0 })
    }

    const batch = db.batch()
    snap.docs.forEach((doc) => {
      batch.update(doc.ref, { status: 'expired' })
    })
    await batch.commit()

    console.log(`[Cron/expire-qr-scans] ${snap.size} demande(s) expirée(s)`)
    return NextResponse.json({ expired: snap.size })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[Cron/expire-qr-scans] erreur:', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
