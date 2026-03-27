// app/api/influenceurs/route.ts — #165 Programme influenceurs Cameroun
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { Timestamp } from 'firebase-admin/firestore'

function isAdmin(): boolean {
  return cookies().get('admin_session')?.value === process.env.ADMIN_SESSION_TOKEN
}

// GET — liste influenceurs + stats commissions
export async function GET(req: NextRequest) {
  const db = getDb()
  const publicMode = req.nextUrl.searchParams.get('public') === '1'

  if (!publicMode && !isAdmin()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const snap = await db.collection('influenceurs').orderBy('created_at', 'desc').get()
  const influenceurs = snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      nom: data.nom,
      instagram: data.instagram,
      tiktok: data.tiktok,
      followers: data.followers,
      niche: data.niche,
      utm_code: data.utm_code,
      contrats_signes: data.contrats_signes || 0,
      commission_totale: data.commission_totale || 0,
      statut: data.statut,
      created_at: data.created_at?.toDate?.()?.toISOString() ?? null,
    }
  })

  return NextResponse.json({ influenceurs })
}

// POST — créer un influenceur
export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { nom, instagram, tiktok, followers, niche, taux_commission } = await req.json()
  if (!nom) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

  const db = getDb()
  const utm_code = `LLUI-${nom.replace(/\s+/g, '').toUpperCase().slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`

  const id = `inf_${Date.now()}`
  await db.collection('influenceurs').doc(id).set({
    id,
    nom,
    instagram: instagram || '',
    tiktok: tiktok || '',
    followers: followers || 0,
    niche: niche || 'lifestyle',
    utm_code,
    taux_commission: taux_commission || 5, // % par contrat signé
    contrats_signes: 0,
    commission_totale: 0,
    statut: 'actif',
    created_at: Timestamp.now(),
  })

  const lien_tracke = `https://llui-signature-hebergements.vercel.app/?utm_source=influenceur&utm_medium=social&utm_campaign=${utm_code}`

  return NextResponse.json({ id, utm_code, lien_tracke })
}

// PATCH — MAJ stats influenceur (admin ou via tracking automatique)
export async function PATCH(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id, contrats_signes_delta, montant_contrat } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const db = getDb()
  const infDoc = await db.collection('influenceurs').doc(id).get()
  if (!infDoc.exists) return NextResponse.json({ error: 'Influenceur introuvable' }, { status: 404 })

  const inf = infDoc.data()!
  const commission = Math.round((montant_contrat || 0) * (inf.taux_commission / 100))

  const { FieldValue } = require('firebase-admin/firestore')
  await db.collection('influenceurs').doc(id).update({
    contrats_signes: FieldValue.increment(contrats_signes_delta || 0),
    commission_totale: FieldValue.increment(commission),
  })

  // Log transaction
  await db.collection('influenceurs').doc(id).collection('transactions').add({
    date: Timestamp.now(),
    montant_contrat: montant_contrat || 0,
    commission,
    type: 'contrat_signe',
  })

  return NextResponse.json({ success: true, commission })
}
