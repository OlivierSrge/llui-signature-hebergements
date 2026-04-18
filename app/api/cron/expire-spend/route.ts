import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get('authorization') ?? ''
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date().toISOString()

    const snap = await db
      .collection('transactions_fidelite')
      .where('type', '==', 'spend')
      .where('status', '==', 'pending')
      .where('expires_at', '<', now)
      .get()

    if (snap.empty) {
      return NextResponse.json({ success: true, expired: 0 })
    }

    let count = 0
    const batch = db.batch()

    for (const doc of snap.docs) {
      const d = doc.data()
      const clientId = d.client_id as string

      batch.update(doc.ref, {
        status: 'expired',
        cancelled_at: FieldValue.serverTimestamp(),
        cancel_reason: 'expired',
      })

      if (clientId) {
        const clientRef = db.collection('clients_fidelite').doc(clientId)
        batch.update(clientRef, {
          has_pending_spend: false,
          pending_spend_id: FieldValue.delete(),
          updated_at: FieldValue.serverTimestamp(),
        })
      }

      count++
    }

    await batch.commit()

    console.log(`[Cron expire-spend] ${count} transaction(s) expirée(s)`)
    return NextResponse.json({ success: true, expired: count })
  } catch (e) {
    console.error('[Cron expire-spend] erreur:', e)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
