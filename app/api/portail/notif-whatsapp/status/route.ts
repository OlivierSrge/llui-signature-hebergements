// app/api/portail/notif-whatsapp/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const uid = new URL(req.url).searchParams.get('uid')
  if (!uid) return NextResponse.json({ active: false })
  try {
    const snap = await getDb().collection('portail_users').doc(uid).get()
    const telephone: string = snap.data()?.phone ?? ''
    return NextResponse.json({ active: true, telephone })
  } catch {
    return NextResponse.json({ active: false })
  }
}
