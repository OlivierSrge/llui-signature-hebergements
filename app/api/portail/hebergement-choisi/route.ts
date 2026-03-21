// app/api/portail/hebergement-choisi/route.ts
// Enregistrer / lire l'hébergement choisi par le marié

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const uid = new URL(req.url).searchParams.get('uid')
    if (!uid) return NextResponse.json({ error: 'uid manquant' }, { status: 400 })
    const db = getDb()
    const snap = await db.collection('portail_users').doc(uid).get()
    const d = snap.data() ?? {}
    return NextResponse.json({ hebergement: d.hebergement_choisi ?? null })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { uid, nom, date_arrivee, date_depart, montant, numero_reservation, statut } = await req.json()
    if (!uid || !nom) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    const db = getDb()
    const hebergement = {
      nom, date_arrivee: date_arrivee ?? '', date_depart: date_depart ?? '',
      montant: montant ? Math.round(Number(montant)) : 0,
      numero_reservation: numero_reservation ?? '',
      statut: statut ?? 'En attente',
      updated_at: new Date().toISOString(),
    }
    await db.collection('portail_users').doc(uid).update({ hebergement_choisi: hebergement })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
