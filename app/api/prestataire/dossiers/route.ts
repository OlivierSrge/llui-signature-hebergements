// app/api/prestataire/dossiers/route.ts — Dossiers assignés au prestataire connecté
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { Timestamp } from 'firebase-admin/firestore'

function getPrestataire(): string | null {
  return cookies().get('prestataire_id')?.value || null
}

export async function GET(req: NextRequest) {
  const prestataire_id = getPrestataire()
  if (!prestataire_id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const db = getDb()

  // Récupérer infos prestataire
  const prestDoc = await db.collection('prestataires').doc(prestataire_id).get()
  if (!prestDoc.exists) return NextResponse.json({ error: 'Prestataire introuvable' }, { status: 404 })

  const prest = prestDoc.data()!

  // Récupérer dossiers assignés à ce prestataire
  const dossiersSnap = await db.collection('portail_users')
    .where('prestataires_assignes', 'array-contains', prestataire_id)
    .orderBy('date_mariage', 'asc')
    .limit(20)
    .get()

  const dossiers = dossiersSnap.docs.map((d) => {
    const data = d.data()
    return {
      marie_uid: d.id,
      noms_maries: data.noms_maries,
      date_mariage: data.date_mariage?.toDate?.()?.toISOString() ?? null,
      lieu: data.lieu || 'Kribi',
      nb_invites: data.nb_invites_prevus || 0,
      statut: data.statut || 'actif',
      brief: data.briefs_prestataires?.[prestataire_id] || null,
      confirmation: data.confirmations_prestataires?.[prestataire_id] || null,
    }
  })

  return NextResponse.json({
    prestataire: {
      id: prestataire_id,
      nom: prest.nom,
      type: prest.type,
      email: prest.email,
      telephone: prest.telephone,
      certifie: prest.certifie || false,
    },
    dossiers,
  })
}

// POST — confirmer participation à un dossier
export async function POST(req: NextRequest) {
  const prestataire_id = getPrestataire()
  if (!prestataire_id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { marie_uid, confirmation, notes } = await req.json()
  if (!marie_uid || !confirmation) {
    return NextResponse.json({ error: 'marie_uid et confirmation requis' }, { status: 400 })
  }

  const db = getDb()
  await db.collection('portail_users').doc(marie_uid).update({
    [`confirmations_prestataires.${prestataire_id}`]: {
      statut: confirmation,
      notes: notes || '',
      date: Timestamp.now(),
    },
  })

  return NextResponse.json({ success: true })
}
