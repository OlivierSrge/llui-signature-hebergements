import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

function isAdmin(): boolean {
  const cookieStore = cookies()
  const session = cookieStore.get('admin_session')?.value
  return !!(session && session === process.env.ADMIN_SESSION_TOKEN)
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const db = getDb()
    const snap = await db.collection('bookings_prestataires').orderBy('created_at', 'desc').limit(100).get()
    const bookings = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        date_prestation: data.date_prestation?.toDate ? data.date_prestation.toDate().toISOString() : data.date_prestation,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at,
      }
    })
    const total_commissions = bookings
      .filter((b: any) => b.statut === 'termine')
      .reduce((sum: number, b: any) => sum + (b.commission_llui ?? 0), 0)
    return NextResponse.json({ bookings, total_commissions })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const db = getDb()
    const { id, statut } = await request.json()
    await db.collection('bookings_prestataires').doc(id).update({ statut, updated_at: new Date() })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
