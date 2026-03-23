// app/admin/budget-analyse/page.tsx — #122 Analyse prédictive budget (Server Component)
import { getDb } from '@/lib/firebase'
import BudgetAnalyseClient from '@/components/admin/BudgetAnalyseClient'

export const dynamic = 'force-dynamic'

interface VersementLibre { montant: number; statut: string; date?: string }

interface MarieBudget {
  marie_uid: string
  noms_maries: string
  budget_total: number
  versements: VersementLibre[]
  date_mariage: string
}

async function getAllBudgets(): Promise<MarieBudget[]> {
  try {
    const db = getDb()
    const snap = await db.collection('portail_users')
      .where('role', '==', 'MARIÉ')
      .orderBy('date_mariage', 'asc')
      .limit(50)
      .get()

    return snap.docs.map(doc => {
      const d = doc.data()
      const dateRaw = d.date_mariage ?? d.projet?.date_evenement
      const dateISO: string = dateRaw?.toDate
        ? dateRaw.toDate().toISOString().slice(0, 10)
        : typeof dateRaw === 'string' ? dateRaw : ''
      const versementsRaw = d.versements
      const versements: VersementLibre[] = Array.isArray(versementsRaw)
        ? versementsRaw.map((v: Record<string, unknown>) => ({
            montant: (v.montant as number) ?? 0,
            statut: (v.statut as string) ?? '',
            date: (v.date as string) ?? undefined,
          }))
        : []
      return {
        marie_uid: doc.id,
        noms_maries: (d.noms_maries as string) || 'Mariés',
        budget_total: (d.budget_total as number) ?? (d.budget_previsionnel as number) ?? (d.projet?.budget_previsionnel as number) ?? 0,
        versements,
        date_mariage: dateISO,
      }
    })
  } catch { return [] }
}

export default async function BudgetAnalysePage() {
  const budgets = await getAllBudgets()
  return <BudgetAnalyseClient budgets={budgets} />
}
