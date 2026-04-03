// app/portail/page.tsx — Dashboard mariés

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import HeroCTA from '@/components/portail/dashboard/HeroCTA'
import StatsDashboard from '@/components/portail/dashboard/StatsDashboard'
import ActionsDashboard from '@/components/portail/dashboard/ActionsDashboard'
import CardCodePromo from '@/components/portail/dashboard/CardCodePromo'
import PrevisionBudget from '@/components/budget/PrevisionBudget'
import JournalActivite from '@/components/portail/dashboard/JournalActivite'
import BienEtreCountdown from '@/components/portail/bienetre/BienEtreCountdown'
import CarteKribi from '@/components/CarteKribi'
import ModeJourJ from '@/components/portail/jour-j/ModeJourJ'

// Note : le bandeau admin est géré par portail/layout.tsx (AdminBandeau + cookie admin_view)

export const dynamic = 'force-dynamic'

interface Todo { id: string; libelle: string; done: boolean; date_limite?: string | null; rev?: number; priorite?: string }
interface Prestataire { nom: string; statut: string; type: string }
interface TacheDoc { titre: string; statut: 'todo' | 'done'; priorite: 'haute' | 'moyenne' | 'basse' }
interface BudgetCategories {
  traiteur: number; decoration: number; hebergement: number
  beaute: number; photographie: number; autres: number
}
interface VersementLibre { id?: string; montant: number; date?: string; mode?: string; statut: string; note?: string }

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

    let todos: Todo[] = todosSnap.docs.map(doc => {
      const td = doc.data()
      const dlTs = td.date_limite
      const dlISO = dlTs?.toDate ? dlTs.toDate().toISOString() : (typeof dlTs === 'string' ? dlTs : null)
      return { id: doc.id, libelle: td.libelle ?? '', done: td.done ?? false, date_limite: dlISO, rev: td.rev ?? 0, priorite: td.priorite ?? 'basse' }
    })

    // Prestataires (template admin ou vide)
    const prestataires: Prestataire[] = (d.prestataires as Prestataire[] | undefined) ?? []

    // Tâches template depuis mariés/[uid].taches[]
    const tachesDoc: TacheDoc[] = (d.taches as TacheDoc[] | undefined) ?? []

    // Si todos subcollection vide, seeder depuis taches[] du doc principal (migration auto)
    if (todos.length === 0 && tachesDoc.length > 0) {
      try {
        const revMap: Record<string, number> = { haute: 50, moyenne: 30, basse: 20 }
        const batch = db.batch()
        for (const t of tachesDoc) {
          const ref = db.collection('portail_users').doc(uid).collection('todos').doc()
          batch.set(ref, {
            libelle: t.titre,
            done: t.statut === 'done',
            priorite: t.priorite,
            rev: revMap[t.priorite] ?? 20,
            created_at: FieldValue.serverTimestamp(),
          })
        }
        await batch.commit()
        const newSnap = await db.collection('portail_users').doc(uid)
          .collection('todos').orderBy('created_at', 'asc').limit(20).get()
        todos = newSnap.docs.map(doc => {
          const td = doc.data()
          return { id: doc.id, libelle: td.libelle ?? '', done: false, date_limite: null, rev: td.rev ?? 0, priorite: td.priorite ?? 'basse' }
        })
      } catch { /* best-effort migration */ }
    }

    // Budget catégories
    const budgetCategories: BudgetCategories = (d.budget_categories as BudgetCategories | undefined) ?? {
      traiteur: 0, decoration: 0, hebergement: 0, beaute: 0, photographie: 0, autres: 0,
    }
    const budgetTotal: number = (d.budget_total as number | undefined) ?? (d.budget_previsionnel as number | undefined) ?? (d.projet?.budget_previsionnel as number | undefined) ?? 0

    // Date mariage (Timestamp ou string ISO)
    const dateMariageRaw = d.date_mariage ?? d.projet?.date_evenement
    const dateMariage: string = dateMariageRaw?.toDate
      ? dateMariageRaw.toDate().toISOString().slice(0, 10)
      : typeof dateMariageRaw === 'string' ? dateMariageRaw : ''

    // Versements libres
    const versementsRaw = d.versements
    let versements: VersementLibre[] = []
    if (Array.isArray(versementsRaw)) {
      versements = versementsRaw as VersementLibre[]
    }

    // Invités
    const invitesList: Array<{ statut?: string }> = (d.invites as Array<{ statut?: string }> | undefined) ?? []
    const invitesConfirmesFirestore = invitesList.filter(i => i.statut === 'confirme').length
    const nbInvitesPrevus: number = (d.nb_invites_prevus as number | undefined) ?? (d.nombre_invites_prevu as number | undefined) ?? (d.nombre_invites_prevus as number | undefined) ?? (d.projet?.nombre_invites_prevu as number | undefined) ?? 0

    const todosDone = todos.filter(t => t.done).length
    const todosTotal = todos.length
    const tachesDoneTpl = tachesDoc.filter(t => t.statut === 'done').length
    const tachesTotalTpl = tachesDoc.length

    return {
      uid,
      walletCash: (d.wallets?.cash as number) ?? 0,
      walletCredits: (d.wallets?.credits_services as number) ?? 0,
      lieu: (d.lieu as string) || (d.projet?.lieu as string) || 'Kribi',
      codePromo: (d.code_promo as string) ?? '',
      todos,
      todosDone,
      todosTotal,
      prestataires,
      tachesDoc,
      tachesDoneTpl,
      tachesTotalTpl,
      budgetCategories,
      budgetTotal,
      dateMariage,
      versements,
      invitesConfirmesFirestore,
      nbInvitesPrevus,
      nomsMaries: (d.noms_maries as string) || '',
    }
  } catch { redirect('/portail/login') }
}

export default async function PortailPage() {
  const data = await getData()

  const displayDone = data.todosDone > 0 ? data.todosDone : data.tachesDoneTpl
  const displayTotal = data.todosTotal > 0 ? data.todosTotal : data.tachesTotalTpl

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Hero countdown + CTA */}
      <HeroCTA uid={data.uid} todosDone={displayDone} todosTotal={displayTotal} />

      {/* Code privilège */}
      <CardCodePromo code={data.codePromo} uid={data.uid} />

      {/* Stats + Budget + Cagnotte + Invités */}
      <StatsDashboard
        uid={data.uid}
        todosDone={displayDone}
        todosTotal={displayTotal}
        walletCash={data.walletCash}
        walletCredits={data.walletCredits}
        budgetTotal={data.budgetTotal}
        budgetCategories={data.budgetCategories}
        invitesConfirmesFirestore={data.invitesConfirmesFirestore}
        nbInvitesPrevus={data.nbInvitesPrevus}
      />

      {/* Prévision budget finale */}
      <PrevisionBudget
        budget_total={data.budgetTotal}
        versements={data.versements}
        date_mariage={data.dateMariage}
        readOnly
      />

      {/* Countdown bien-être mariée */}
      <BienEtreCountdown marie_uid={data.uid} date_mariage={data.dateMariage} noms_maries={data.nomsMaries} />

      {/* Mode Jour J */}
      <ModeJourJ marie_uid={data.uid} date_mariage={data.dateMariage} noms_maries={data.nomsMaries} />

      {/* Carte interactive Kribi */}
      <CarteKribi lieu={data.lieu} />

      {/* Journal d'activité */}
      <JournalActivite />

      {/* Prestataires + Timeline + Tâches + Météo + Versements + Citation */}
      <ActionsDashboard
        uid={data.uid}
        todos={data.todos}
        lieu={data.lieu}
        versements={data.versements}
        budgetTotal={data.budgetTotal}
        prestataires={data.prestataires}
      />
    </div>
  )
}
