// app/api/admin/paiements/route.ts
// POST admin — VALIDER | PAYER | REJETER une demande Fast Start ou retrait

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { demande_id, type_demande, action, reference_om, motif } = await req.json() as {
      demande_id: string; type_demande: string
      action: 'VALIDER' | 'PAYER' | 'REJETER'
      reference_om?: string; motif?: string
    }
    if (!demande_id || !type_demande || !action) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })

    const db = getDb()
    const collection = type_demande === 'fast_start' ? 'fast_start_demandes' : 'retraits_demandes'
    const ref = db.collection(collection).doc(demande_id)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

    const d = snap.data()!
    let update: Record<string, unknown> = {}
    let notifType = ''
    let notifData: Record<string, unknown> = {}

    if (action === 'VALIDER') {
      update = { statut: 'VALIDEE', valide_at: FieldValue.serverTimestamp() }
      notifType = 'FAST_START'; notifData = { palier: d.palier ?? 0, montant: d.montant_prime ?? d.montant ?? 0 }
    } else if (action === 'PAYER') {
      if (!reference_om?.trim()) return NextResponse.json({ error: 'Référence OM requise' }, { status: 400 })
      update = { statut: 'PAYEE', paye_at: FieldValue.serverTimestamp(), reference_om }
      notifType = 'FAST_START'; notifData = { palier: d.palier ?? 0, montant: d.montant_prime ?? d.montant ?? 0, reference_om }
      // Fast Start : mettre à jour les champs palier_X_paye
      if (type_demande === 'fast_start' && d.uid && d.palier) {
        await db.collection('portail_users').doc(d.uid).update({
          [`fast_start.palier_${d.palier}_paye`]: true,
          [`fast_start.reference_om_${d.palier}`]: reference_om,
          [`fast_start.paye_${d.palier}_at`]: FieldValue.serverTimestamp(),
        })
      }
    } else if (action === 'REJETER') {
      if (!motif?.trim()) return NextResponse.json({ error: 'Motif requis' }, { status: 400 })
      update = { statut: 'REJETEE', motif_rejet: motif, rejete_at: FieldValue.serverTimestamp() }
    }

    await ref.update(update)

    // Notif user (non-bloquant)
    const uid = d.uid
    if (uid && notifType) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/portail/notif-whatsapp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, type: notifType, data: notifData }),
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
