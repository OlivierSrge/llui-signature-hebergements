// app/api/influenceurs/demande/route.ts — Candidature influenceur publique
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { Timestamp } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nom, email, instagram, tiktok, followers, message } = body

  if (!nom || !email) {
    return NextResponse.json({ error: 'Nom et email requis' }, { status: 400 })
  }

  const db = getDb()
  const id = `dem_inf_${Date.now()}`
  await db.collection('demandes_influenceurs').doc(id).set({
    id,
    nom,
    email,
    instagram: instagram || '',
    tiktok: tiktok || '',
    followers: parseInt(followers || '0'),
    message: message || '',
    statut: 'en_attente',
    created_at: Timestamp.now(),
  })

  return NextResponse.json({ success: true, id })
}
