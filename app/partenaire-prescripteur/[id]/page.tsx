import { notFound } from 'next/navigation'
import { getPrescripteurPartenaire } from '@/actions/codes-sessions'
import { db } from '@/lib/firebase'
import DashboardPartenaireClient from './DashboardPartenaireClient'

export const dynamic = 'force-dynamic'

interface Props { params: { id: string } }

interface CommissionDoc {
  id: string
  statut: string
  commission_fcfa: number
  [key: string]: unknown
}

async function getCodesActifs(prescripteurId: string): Promise<Record<string, unknown>[]> {
  try {
    // Sans orderBy pour éviter le composite index Firestore manquant
    const snap = await db.collection('codes_sessions')
      .where('prescripteur_partenaire_id', '==', prescripteurId)
      .where('statut', '==', 'actif')
      .limit(10)
      .get()
    return snap.docs.map((d) => ({ code: d.id, ...(d.data() as Record<string, unknown>) }))
  } catch (e) {
    console.error('[DashboardPartenaire] getCodesActifs error:', e)
    return []
  }
}

async function getTransactions(prescripteurId: string): Promise<CommissionDoc[]> {
  try {
    // Sans orderBy pour éviter le composite index Firestore manquant
    const snap = await db.collection('commissions_canal2')
      .where('prescripteur_partenaire_id', '==', prescripteurId)
      .limit(20)
      .get()
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommissionDoc, 'id'>) } as CommissionDoc))
  } catch (e) {
    console.error('[DashboardPartenaire] getTransactions error:', e)
    return []
  }
}

export default async function DashboardPartenairePage({ params }: Props) {
  // Valider que l'ID n'est pas vide
  if (!params.id || params.id.trim() === '') {
    notFound()
  }

  let partenaire
  try {
    partenaire = await getPrescripteurPartenaire(params.id)
  } catch (e) {
    console.error('[DashboardPartenaire] getPrescripteurPartenaire error:', e)
    notFound()
  }

  if (!partenaire) notFound()

  const [codesActifs, transactions] = await Promise.all([
    getCodesActifs(params.id),
    getTransactions(params.id),
  ])

  const commissionsDues = transactions
    .filter((t) => t.statut === 'en_attente')
    .reduce((s, t) => s + (typeof t.commission_fcfa === 'number' ? t.commission_fcfa : 0), 0)
  const commissionsVersees = transactions
    .filter((t) => t.statut === 'versee')
    .reduce((s, t) => s + (typeof t.commission_fcfa === 'number' ? t.commission_fcfa : 0), 0)

  return (
    <DashboardPartenaireClient
      partenaire={partenaire}
      codesActifs={codesActifs}
      transactions={transactions}
      commissionsDues={commissionsDues}
      commissionsVersees={commissionsVersees}
    />
  )
}
