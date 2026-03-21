// app/api/portail/achats-boutique/route.ts
// CRUD achats boutique d'un marié

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const uid = new URL(req.url).searchParams.get('uid')
    if (!uid) return NextResponse.json({ error: 'uid manquant' }, { status: 400 })
    const db = getDb()
    const snap = await db.collection('portail_users').doc(uid)
      .collection('achats_boutique').orderBy('date_achat', 'desc').limit(20).get()
    const achats = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ achats })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { uid, nom, montant, categorie, date_achat, statut } = await req.json()
    if (!uid || !nom || !montant) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    const db = getDb()
    const montantNum = Math.round(Number(montant))

    // Créer l'achat
    const ref = await db.collection('portail_users').doc(uid)
      .collection('achats_boutique').add({
        nom, montant: montantNum, categorie: categorie ?? 'Autre',
        date_achat: date_achat ?? new Date().toISOString().slice(0, 10),
        statut: statut ?? 'Commandé',
        created_at: new Date(),
      })

    // Créditer REV (1 REV par tranche de 10 000 FCFA)
    const rev = Math.floor(montantNum / 10000)
    if (rev > 0) {
      await db.collection('portail_users').doc(uid).update({
        rev_lifetime: FieldValue.increment(rev),
        'wallets.credits_services': FieldValue.increment(rev),
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, id: ref.id, rev })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
