// app/api/portail/invites-stats/route.ts
// GET — Retourne invites_guests enrichis avec les achats boutique croisés par téléphone
// Étape 3 P7-A : croisement transactions ↔ invités via client_tel ≈ invite.telephone

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

/** Normalise un numéro de téléphone pour comparaison (retire espaces, tirets, +, indicatif 237) */
function normalizeTel(tel: string): string {
  if (!tel) return ''
  let t = tel.replace(/[\s\-().]/g, '')
  if (t.startsWith('00237')) t = t.slice(5)
  else if (t.startsWith('+237')) t = t.slice(4)
  else if (t.startsWith('237') && t.length > 9) t = t.slice(3)
  return t
}

export async function GET() {
  try {
    const jar = await cookies()
    const uid = jar.get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const db = getDb()

    // Charger le document principal (code_promo + invites[] pour dots)
    const userSnap = await db.collection('portail_users').doc(uid).get()
    if (!userSnap.exists) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const userData = userSnap.data()!
    const codePromo: string = userData.code_promo ?? ''

    // Invites[] du document principal (pour les dots / statuts de présence)
    const invitesDots: Array<{
      id?: string; prenom?: string; nom?: string
      statut?: string; hebergement?: boolean; table?: string
    }> = userData.invites ?? []

    // Subcollection invites_guests
    const guestsSnap = await db
      .collection(`portail_users/${uid}/invites_guests`)
      .orderBy('created_at', 'desc')
      .get()

    const guests = guestsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Array<{
      id: string; nom: string; telephone: string; magic_link_slug: string
      lien_envoye?: boolean; invitation_envoyee?: boolean
      relance_envoyee?: boolean; relance_date?: unknown
      converted?: boolean; total_achats?: number; commissions_generees?: number
    }>

    // Transactions boutique liées à ce code promo (si code existe)
    let transactions: Array<{
      id: string; client_tel?: string; client_nom?: string
      produit?: string; montant_final?: number; date?: string; statut?: string
    }> = []

    if (codePromo) {
      try {
        const txSnap = await db.collection('transactions')
          .where('marie_code', '==', codePromo)
          .where('type', '==', 'BOUTIQUE')
          .orderBy('synced_at', 'desc')
          .limit(200)
          .get()
        transactions = txSnap.docs.map(d => {
          const td = d.data()
          const dateTs = td.synced_at ?? td.date
          const dateISO = dateTs?.toDate ? dateTs.toDate().toISOString() : (typeof dateTs === 'string' ? dateTs : '')
          return {
            id: d.id,
            client_tel: td.client_tel ?? '',
            client_nom: td.client_nom ?? '',
            produit: td.produit ?? td.article ?? '',
            montant_final: td.montant_final ?? td.montant ?? 0,
            date: dateISO,
            statut: td.statut ?? '',
          }
        })
      } catch {
        // Index manquant ou collection vide — silencieux
      }
    }

    // Construire un index téléphone → transactions pour le croisement
    const txByTel = new Map<string, typeof transactions>()
    for (const tx of transactions) {
      const key = normalizeTel(tx.client_tel ?? '')
      if (!key) continue
      const arr = txByTel.get(key) ?? []
      arr.push(tx)
      txByTel.set(key, arr)
    }

    // Enrichir chaque invité avec ses achats
    const guestsEnrichis = guests.map(g => {
      const key = normalizeTel(g.telephone)
      const achats = (txByTel.get(key) ?? []).map(tx => ({
        produit: tx.produit ?? '',
        montant: tx.montant_final ?? 0,
        date: tx.date ?? '',
      }))
      const montantTotal = achats.reduce((s, a) => s + a.montant, 0)
      const aCommande = achats.length > 0 || (g.converted ?? false)

      return {
        ...g,
        a_commande: aCommande,
        achats,
        montant_total_achats: montantTotal,
      }
    })

    // Stats globales
    const stats = {
      total: guestsEnrichis.length,
      contactes: guestsEnrichis.filter(g => g.lien_envoye || g.invitation_envoyee).length,
      ayant_commande: guestsEnrichis.filter(g => g.a_commande).length,
      silencieux: guestsEnrichis.filter(g => !g.a_commande).length,
      taux_participation: guestsEnrichis.length > 0
        ? Math.round((guestsEnrichis.filter(g => g.a_commande).length / guestsEnrichis.length) * 100)
        : 0,
      montant_total: guestsEnrichis.reduce((s, g) => s + g.montant_total_achats, 0),
    }

    return NextResponse.json({ guests: guestsEnrichis, invites: invitesDots, stats })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
