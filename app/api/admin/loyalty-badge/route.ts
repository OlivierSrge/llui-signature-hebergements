import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const snap = await db.collectionGroup('pendingNotifications')
      .where('status', '==', 'pending')
      .get()
    return NextResponse.json({ count: snap.size })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
