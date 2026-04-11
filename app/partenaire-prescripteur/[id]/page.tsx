import { notFound } from 'next/navigation'
import { getPrescripteurPartenaire, getCodeSession } from '@/actions/codes-sessions'
import { db } from '@/lib/firebase'
import DashboardPartenaireClient from './DashboardPartenaireClient'

export const dynamic = 'force-dynamic'

interface Props { params: { id: string } }

async function getCodesActifs(prescripteurId: string) {
  const snap = await db.collection('codes_sessions')
    .where('prescripteur_partenaire_id', '==', prescripteurId)
    .where('statut', '==', 'actif')
    .orderBy('created_at', 'desc')
    .limit(10)
    .get()
  return snap.docs.map((d) => ({ code: d.id, ...(d.data() as Record<string, unknown>) }))
}

interface CommissionDoc {
  id: string
  statut: string
  commission_fcfa: number
  [key: string]: unknown
}

async function getTransactions(prescripteurId: string): Promise<CommissionDoc[]> {
  const snap = await db.collection('commissions_canal2')
    .where('prescripteur_partenaire_id', '==', prescripteurId)
    .orderBy('created_at', 'desc')
    .limit(20)
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommissionDoc, 'id'>) } as CommissionDoc))
}

export default async function DashboardPartenairePage({ params }: Props) {
  const partenaire = await getPrescripteurPartenaire(params.id)
  if (!partenaire) notFound()

  const [codesActifs, transactions] = await Promise.all([
    getCodesActifs(params.id),
    getTransactions(params.id),
  ])

  const commissionsDues = transactions
    .filter((t) => t.statut === 'en_attente')
    .reduce((s, t) => s + ((t.commission_fcfa as number) ?? 0), 0)
  const commissionsVersees = transactions
    .filter((t) => t.statut === 'versee')
    .reduce((s, t) => s + ((t.commission_fcfa as number) ?? 0), 0)

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
