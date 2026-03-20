// app/admin/paiements/page.tsx
// Paiements centralisés : Fast Start + Retraits wallets

import { getDb } from '@/lib/firebase'
import PaiementsClient from '@/components/admin/portail/PaiementsClient'

export interface PaiementItem {
  id: string; type: 'fast_start' | 'retrait_cash' | 'retrait_credits'
  nom: string; telephone_om: string; montant: number
  date: string; statut: string; palier?: number
}

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA' }

async function getPaiementsData() {
  const db = getDb()

  // Fast Start demandes
  const fsSnap = await db.collection('fast_start_demandes').orderBy('atteint_at', 'asc').limit(100).get()
  const fsList: PaiementItem[] = fsSnap.docs.map(doc => {
    const d = doc.data()
    return {
      id: doc.id, type: 'fast_start',
      nom: d.nom_complet ?? '—', telephone_om: d.telephone_om ?? '',
      montant: d.montant_prime ?? 0,
      date: d.atteint_at?.toDate?.().toISOString() ?? '',
      statut: d.statut ?? 'EN_ATTENTE', palier: d.palier,
    }
  })

  // Retraits
  const retrSnap = await db.collection('retraits_demandes').orderBy('created_at', 'asc').limit(100).get()
  const retrList: PaiementItem[] = retrSnap.docs.map(doc => {
    const d = doc.data()
    return {
      id: doc.id,
      type: d.wallet_type === 'credits_services' ? 'retrait_credits' : 'retrait_cash',
      nom: d.uid ?? '—', telephone_om: d.telephone_om ?? '',
      montant: d.montant ?? 0,
      date: d.created_at?.toDate?.().toISOString() ?? '',
      statut: d.statut ?? 'EN_ATTENTE',
    }
  })

  const all = [...fsList, ...retrList].sort((a, b) => a.date.localeCompare(b.date))
  const enAttente = all.filter(p => p.statut === 'EN_ATTENTE')
  const historique = all.filter(p => p.statut !== 'EN_ATTENTE').slice(-30).reverse()
  const totalDecaisser = enAttente.reduce((s, p) => s + p.montant, 0)

  return { enAttente, historique, totalDecaisser: fmt(totalDecaisser) }
}

export const dynamic = 'force-dynamic'

export default async function AdminPaiementsPage() {
  const data = await getPaiementsData()
  return <PaiementsClient data={data} />
}
