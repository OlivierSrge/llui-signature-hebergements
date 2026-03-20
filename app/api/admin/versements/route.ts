// app/api/admin/versements/route.ts
// Admin — lister tous les versements + valider / refuser

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

// GET — Lister les versements (filtrés par statut optionnel)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const statut = searchParams.get('statut') // EN_ATTENTE | VALIDE | REFUSE | all

    const db = getDb()
    let query = db.collection('versements').orderBy('declared_at', 'desc').limit(100) as FirebaseFirestore.Query

    if (statut && statut !== 'all') {
      query = db.collection('versements').where('statut', '==', statut).orderBy('declared_at', 'desc').limit(100)
    }

    const snap = await query.get()

    const versements = snap.docs.map(doc => {
      const d = doc.data()
      return {
        id: doc.id,
        commande_id: d.commande_id,
        uid: d.uid,
        montant: d.montant,
        mode: d.mode,
        reference: d.reference ?? '',
        statut: d.statut,
        declared_at: d.declared_at?.toDate?.()?.toISOString() ?? null,
      }
    })

    // KPIs
    const allSnap = await db.collection('versements').get()
    const allV = allSnap.docs.map(d => d.data())
    const totalDeclare = allV.filter(v => v.statut !== 'REFUSE').reduce((s, v) => s + (v.montant ?? 0), 0)
    const totalValide = allV.filter(v => v.statut === 'VALIDE').reduce((s, v) => s + (v.montant ?? 0), 0)
    const enAttente = allV.filter(v => v.statut === 'EN_ATTENTE').length

    // Commandes KPIs
    const commandesSnap = await db.collection('commandes').get()
    const nbCommandes = commandesSnap.size
    const totalCommandes = commandesSnap.docs.reduce((s, d) => s + (d.data().total_ht ?? 0), 0)

    return NextResponse.json({
      versements,
      kpis: { nbCommandes, totalCommandes, totalDeclare, totalValide, enAttente },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

// PATCH — Valider ou refuser un versement
export async function PATCH(req: Request) {
  try {
    const body = await req.json() as { id: string; statut: 'VALIDE' | 'REFUSE' }
    const { id, statut } = body

    if (!id || !['VALIDE', 'REFUSE'].includes(statut)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }

    const db = getDb()
    const ref = db.collection('versements').doc(id)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Versement introuvable' }, { status: 404 })

    await ref.update({ statut })

    // Mettre à jour le versement correspondant dans la commande si validé
    const d = snap.data()!
    if (d.commande_id && statut === 'VALIDE') {
      const commandeRef = db.collection('commandes').doc(d.commande_id)
      const commandeSnap = await commandeRef.get()
      if (commandeSnap.exists) {
        const commande = commandeSnap.data()!
        const versements = (commande.versements ?? []) as Array<{ statut: string; montant: number }>
        let reste = d.montant as number
        const updated = versements.map(v => {
          if (v.statut === 'EN_ATTENTE' && reste > 0) {
            reste -= v.montant
            return { ...v, statut: 'VALIDE' }
          }
          return v
        })
        await commandeRef.update({ versements: updated })
      }
    }

    // Notifier le client WhatsApp si validé
    if (statut === 'VALIDE') {
      const phone = process.env.ADMIN_PHONE_NUMBER
      const apiKey = process.env.ADMIN_CALLMEBOT_APIKEY
      if (phone && apiKey) {
        const msg = `✅ Paiement validé\nMontant: ${(d.montant as number).toLocaleString('fr-FR')} FCFA\nMode: ${d.mode}\nUID: ${d.uid}`
        const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(msg)}&apikey=${apiKey}`
        await fetch(url).catch(() => {})
      }
    }

    return NextResponse.json({ success: true, statut })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
