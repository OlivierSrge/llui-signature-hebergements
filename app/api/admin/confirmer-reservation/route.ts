// app/api/admin/confirmer-reservation/route.ts
// POST — Enregistre une réservation hébergement confirmée + crédite 2% cash dans la cagnotte marié

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

interface Body {
  marie_uid: string
  logement: string
  prix_nuit: number
  nb_nuits: number
}

function checkAdminAuth(session: string | undefined): boolean {
  if (!session) return false
  const token = process.env.ADMIN_SESSION_TOKEN
  return !token || session === token
}

export async function POST(req: Request) {
  const jar = await cookies()
  const session = jar.get('admin_session')?.value
  if (!checkAdminAuth(session)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body: Body = await req.json()
    const { marie_uid, logement, prix_nuit, nb_nuits } = body

    if (!marie_uid || !logement || !prix_nuit || !nb_nuits) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }
    if (prix_nuit <= 0 || nb_nuits <= 0) {
      return NextResponse.json({ error: 'Prix/nuit et nombre de nuits doivent être > 0' }, { status: 400 })
    }

    const db = getDb()

    // Vérifier que le marié existe
    const marieSnap = await db.collection('portail_users').doc(marie_uid).get()
    if (!marieSnap.exists) {
      return NextResponse.json({ error: 'Marié introuvable' }, { status: 404 })
    }

    const montant_total = Math.round(prix_nuit * nb_nuits)
    const commission_cash = Math.round(montant_total * 0.02)

    const now = Timestamp.now()

    // Écrire la transaction
    const txRef = db.collection('transactions').doc()
    await txRef.set({
      type: 'HEBERGEMENT',
      marie_uid,
      logement,
      prix_nuit,
      nb_nuits,
      montant_total,
      commission_cash,
      date: now,
      statut: 'CONFIRMÉ',
      created_by: 'admin',
    })

    // Créditer la cagnotte cash du marié
    await db.collection('portail_users').doc(marie_uid).update({
      'wallets.cash': FieldValue.increment(commission_cash),
    })

    return NextResponse.json({
      success: true,
      transaction_id: txRef.id,
      montant_total,
      commission_cash,
      message: `${commission_cash.toLocaleString('fr-FR')} FCFA crédités dans la cagnotte`,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
