// app/api/stars/qr-scan/poll/route.ts
// GET ?client_tel=+237... — polling côté client (status de sa demande)
// GET ?partner_id=uid    — polling côté partenaire (demandes pending à valider)

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { serializeFirestoreDoc } from '@/lib/serialization'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const clientTel = searchParams.get('client_tel')
  const partnerId = searchParams.get('partner_id')

  if (!clientTel && !partnerId) {
    return NextResponse.json({ success: false, error: 'client_tel ou partner_id requis' }, { status: 400 })
  }

  try {
    const now = new Date().toISOString()

    // ── Mode partenaire : liste toutes les demandes pending ───────
    if (partnerId) {
      const snap = await db
        .collection('qr_scan_requests')
        .where('partenaire_id', '==', partnerId)
        .where('status', '==', 'pending')
        .where('expires_at', '>', now)
        .orderBy('expires_at', 'asc')
        .get()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requests = snap.docs.map((doc: any) => {
        const s = serializeFirestoreDoc(doc.data())
        return { id: doc.id, ...s }
      })
      return NextResponse.json({ success: true, requests })
    }

    // ── Mode client : 1 demande pending ou récemment terminée ────
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const [pendingSnap, recentSnap] = await Promise.all([
      db.collection('qr_scan_requests')
        .where('client_uid', '==', clientTel!)
        .where('status', '==', 'pending')
        .where('expires_at', '>', now)
        .orderBy('expires_at', 'desc')
        .limit(1)
        .get(),
      db.collection('qr_scan_requests')
        .where('client_uid', '==', clientTel!)
        .where('status', 'in', ['validated', 'rejected'])
        .where('expires_at', '>', fiveMinAgo)
        .orderBy('expires_at', 'desc')
        .limit(1)
        .get(),
    ])

    const snap = !pendingSnap.empty ? pendingSnap : recentSnap
    if (snap.empty) {
      return NextResponse.json({ success: true, request: null })
    }

    const doc = snap.docs[0]
    const s = serializeFirestoreDoc(doc.data())
    return NextResponse.json({ success: true, request: { id: doc.id, ...s } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[QrScan/poll] erreur:', e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
