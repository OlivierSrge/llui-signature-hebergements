import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

function isAdmin(): boolean {
  const cookieStore = cookies()
  const session = cookieStore.get('admin_session')?.value
  return !!(session && session === process.env.ADMIN_SESSION_TOKEN)
}

// GET — liste tous les prestataires (admin)
export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const db = getDb()
    const snap = await db.collection('prestataires').orderBy('ordre_affichage').get()
    const prestataires = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ prestataires })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — créer un prestataire
export async function POST(request: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const db = getDb()
    const body = await request.json()
    const ref = db.collection('prestataires').doc()
    await ref.set({ ...body, created_at: new Date(), updated_at: new Date() })
    return NextResponse.json({ success: true, id: ref.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — modifier un prestataire
export async function PATCH(request: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const db = getDb()
    const { id, ...data } = await request.json()
    await db.collection('prestataires').doc(id).update({ ...data, updated_at: new Date() })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — supprimer un prestataire
export async function DELETE(request: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const db = getDb()
    const { id } = await request.json()
    await db.collection('prestataires').doc(id).delete()
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
