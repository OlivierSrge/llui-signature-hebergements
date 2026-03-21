// app/portail/page.tsx — Dashboard mariés P6 — 12 blocs

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import HeroCTA from '@/components/portail/dashboard/HeroCTA'
import StatsDashboard from '@/components/portail/dashboard/StatsDashboard'
import ActionsDashboard from '@/components/portail/dashboard/ActionsDashboard'
import SaisieBoutique from '@/components/portail/dashboard/SaisieBoutique'
import SaisieHebergement from '@/components/portail/dashboard/SaisieHebergement'
import CardCodePromo from '@/components/portail/dashboard/CardCodePromo'

export const dynamic = 'force-dynamic'
interface Todo { id: string; libelle: string; done: boolean; date_limite?: string | null; rev?: number }

async function getData() {
  try {
    const uid = cookies().get('portail_uid')?.value
    if (!uid) redirect('/portail/login')
    const db = getDb()
    const [snap, todosSnap] = await Promise.all([
      db.collection('portail_users').doc(uid).get(),
      db.collection('portail_users').doc(uid).collection('todos').orderBy('created_at', 'asc').limit(20).get(),
    ])
    if (!snap.exists) redirect('/portail/login')
    const d = snap.data()!
    const todos: Todo[] = todosSnap.docs.map(doc => {
      const td = doc.data()
      const dlTs = td.date_limite
      const dlISO = dlTs?.toDate ? dlTs.toDate().toISOString() : (typeof dlTs === 'string' ? dlTs : null)
      return { id: doc.id, libelle: td.libelle ?? '', done: td.done ?? false, date_limite: dlISO, rev: td.rev ?? 0 }
    })
    return {
      uid,
      walletCash: d.wallets?.cash ?? 0,
      walletCredits: d.wallets?.credits_services ?? 0,
      lieu: d.projet?.lieu ?? 'Kribi',
      codePromo: (d.code_promo as string) ?? '',
      todos,
      todosDone: todos.filter(t => t.done).length,
      todosTotal: todos.length,
    }
  } catch { redirect('/portail/login') }
}

export default async function PortailPage() {
  const data = await getData()
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <HeroCTA uid={data.uid} todosDone={data.todosDone} todosTotal={data.todosTotal} />
      <CardCodePromo code={data.codePromo} uid={data.uid} />
      <StatsDashboard uid={data.uid} todosDone={data.todosDone} todosTotal={data.todosTotal}
        walletCash={data.walletCash} walletCredits={data.walletCredits} />
      <SaisieBoutique uid={data.uid} />
      <SaisieHebergement uid={data.uid} />
      <ActionsDashboard uid={data.uid} todos={data.todos} lieu={data.lieu} hasCommande={false} />
    </div>
  )
}
