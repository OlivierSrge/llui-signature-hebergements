// app/api/portail/commandes/route.ts
// Créer + lire les commandes du portail marié

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export interface Versement {
  label: string      // 'Acompte (30%)', 'Tranche 2 (40%)', 'Solde (30%)'
  montant: number
  echeance: string   // date ISO string ou label
  statut: 'EN_ATTENTE' | 'DECLARE' | 'VALIDE'
}

export interface Commande {
  id?: string
  uid: string
  articles: Array<{
    id: string
    nom: string
    categorie: string
    prix_unitaire: number
    quantite: number
  }>
  total_ht: number
  mode_paiement: string
  versements: Versement[]
  statut: 'EN_COURS' | 'VALIDE' | 'ANNULE'
  created_at?: unknown
  date_evenement?: string
}

// POST — Créer une nouvelle commande
export async function POST(req: Request) {
  try {
    const body = await req.json() as Omit<Commande, 'id' | 'created_at' | 'statut'>
    const { uid, articles, total_ht, mode_paiement, versements, date_evenement } = body

    if (!uid || !articles?.length || !total_ht || !mode_paiement) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const db = getDb()
    const ref = db.collection('commandes').doc()

    const commande: Omit<Commande, 'id'> = {
      uid, articles, total_ht, mode_paiement,
      versements: versements ?? [],
      statut: 'EN_COURS',
      created_at: FieldValue.serverTimestamp(),
      date_evenement: date_evenement ?? '',
    }

    await ref.set(commande)

    return NextResponse.json({ id: ref.id, success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

// GET — Récupérer les commandes d'un uid
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const uid = searchParams.get('uid')
    if (!uid) return NextResponse.json({ error: 'uid manquant' }, { status: 400 })

    const db = getDb()
    const snap = await db.collection('commandes').where('uid', '==', uid).orderBy('created_at', 'desc').limit(10).get()

    const commandes: Commande[] = snap.docs.map(doc => {
      const d = doc.data()
      return {
        id: doc.id,
        uid: d.uid,
        articles: d.articles ?? [],
        total_ht: d.total_ht ?? 0,
        mode_paiement: d.mode_paiement ?? '',
        versements: d.versements ?? [],
        statut: d.statut ?? 'EN_COURS',
        date_evenement: d.date_evenement ?? '',
        created_at: d.created_at,
      }
    })

    return NextResponse.json({ commandes })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
