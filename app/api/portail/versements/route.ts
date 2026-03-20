// app/api/portail/versements/route.ts
// Déclarer un versement + notifier l'admin WhatsApp

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export interface VersementDeclare {
  id?: string
  commande_id: string
  uid: string
  montant: number
  mode: string       // OM | MOMO | VIREMENT | CASH
  reference: string  // numéro de transaction
  statut: 'EN_ATTENTE' | 'VALIDE' | 'REFUSE'
  declared_at?: unknown
}

async function notifyAdminWhatsApp(message: string): Promise<void> {
  const phone = process.env.ADMIN_PHONE_NUMBER
  const apiKey = process.env.ADMIN_CALLMEBOT_APIKEY
  if (!phone || !apiKey) return
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${apiKey}`
  await fetch(url).catch(() => {})
}

// POST — Déclarer un versement
export async function POST(req: Request) {
  try {
    const body = await req.json() as Pick<VersementDeclare, 'commande_id' | 'uid' | 'montant' | 'mode' | 'reference'>
    const { commande_id, uid, montant, mode, reference } = body

    if (!commande_id || !uid || !montant || !mode) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const db = getDb()

    // Vérifier que la commande appartient bien à cet uid
    const commandeSnap = await db.collection('commandes').doc(commande_id).get()
    if (!commandeSnap.exists || commandeSnap.data()?.uid !== uid) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    const ref = db.collection('versements').doc()
    const versement: Omit<VersementDeclare, 'id'> = {
      commande_id, uid, montant, mode,
      reference: reference ?? '',
      statut: 'EN_ATTENTE',
      declared_at: FieldValue.serverTimestamp(),
    }
    await ref.set(versement)

    // Notification WhatsApp admin
    const modeLabel: Record<string, string> = { OM: 'Orange Money', MOMO: 'MTN MoMo', VIREMENT: 'Virement', CASH: 'Espèces' }
    const msg = `💸 Nouveau versement déclaré\nCommande: ${commande_id}\nMontant: ${montant.toLocaleString('fr-FR')} FCFA\nMode: ${modeLabel[mode] ?? mode}\nRéf: ${reference ?? '-'}\nUID: ${uid}`
    await notifyAdminWhatsApp(msg)

    return NextResponse.json({ id: ref.id, success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

// GET — Versements d'une commande
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const commande_id = searchParams.get('commande_id')
    const uid = searchParams.get('uid')

    if (!commande_id || !uid) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const db = getDb()

    // Vérifier ownership
    const commandeSnap = await db.collection('commandes').doc(commande_id).get()
    if (!commandeSnap.exists || commandeSnap.data()?.uid !== uid) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    const snap = await db.collection('versements')
      .where('commande_id', '==', commande_id)
      .orderBy('declared_at', 'desc')
      .get()

    const versements: VersementDeclare[] = snap.docs.map(doc => {
      const d = doc.data()
      return {
        id: doc.id,
        commande_id: d.commande_id,
        uid: d.uid,
        montant: d.montant,
        mode: d.mode,
        reference: d.reference ?? '',
        statut: d.statut ?? 'EN_ATTENTE',
        declared_at: d.declared_at,
      }
    })

    return NextResponse.json({ versements })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
