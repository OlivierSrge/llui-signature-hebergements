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
import ReservationsHebergement from '@/components/portail/dashboard/ReservationsHebergement'
import AchatsBoutiqueInvites from '@/components/portail/dashboard/AchatsBoutiqueInvites'
import type { BoutiqueTransaction } from '@/components/portail/dashboard/AchatsBoutiqueInvites'

export const dynamic = 'force-dynamic'
interface Todo { id: string; libelle: string; done: boolean; date_limite?: string | null; rev?: number }
interface Reservation { id: string; logement: string; montant_total: number; commission_cash: number; date: string }

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

    // Réservations hébergements (index composite requis — isolé pour ne pas bloquer)
    let reservations: Reservation[] = []
    try {
      const txSnap = await db.collection('transactions')
        .where('marie_uid', '==', uid)
        .where('type', '==', 'HEBERGEMENT')
        .orderBy('date', 'desc')
        .limit(20)
        .get()
      reservations = txSnap.docs.map(doc => {
        const td = doc.data()
        const dateTs = td.date
        const dateISO = dateTs?.toDate ? dateTs.toDate().toISOString() : new Date().toISOString()
        return { id: doc.id, logement: td.logement ?? '', montant_total: td.montant_total ?? 0, commission_cash: td.commission_cash ?? 0, date: dateISO }
      })
    } catch { /* index en cours de création */ }

    // Achats boutique invités (index composite requis — isolé)
    let boutiqueTransactions: BoutiqueTransaction[] = []
    try {
      const bSnap = await db.collection('transactions')
        .where('marie_uid', '==', uid)
        .where('type', '==', 'BOUTIQUE')
        .orderBy('synced_at', 'desc')
        .limit(30)
        .get()
      boutiqueTransactions = bSnap.docs.map(doc => {
        const td = doc.data()
        return {
          id: doc.id,
          date: td.date ?? '',
          client_nom: td.client_nom ?? '',
          produit: td.produit ?? '',
          montant_final: td.montant_final ?? 0,
          statut: td.statut ?? '',
          rev_generes: td.rev_generes ?? 0,
          cagnotte_cash: td.cagnotte_cash ?? 0,
          cagnotte_credits: td.cagnotte_credits ?? 0,
        }
      })
    } catch { /* index en cours de création */ }

    const derniere = boutiqueTransactions[0]
      ? { date: boutiqueTransactions[0].date, produit: boutiqueTransactions[0].produit, montant: boutiqueTransactions[0].montant_final }
      : null

    return {
      uid,
      walletCash: d.wallets?.cash ?? 0,
      walletCredits: d.wallets?.credits_services ?? 0,
      lieu: d.projet?.lieu ?? 'Kribi',
      codePromo: (d.code_promo as string) ?? '',
      todos,
      todosDone: todos.filter(t => t.done).length,
      todosTotal: todos.length,
      reservations,
      boutiqueTransactions,
      nbCommandesInvites: boutiqueTransactions.length,
      derniereCommande: derniere,
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
        walletCash={data.walletCash} walletCredits={data.walletCredits}
        nbCommandesInvites={data.nbCommandesInvites} derniereCommande={data.derniereCommande} />
      <SaisieBoutique uid={data.uid} />
      <AchatsBoutiqueInvites transactions={data.boutiqueTransactions} />
      <SaisieHebergement uid={data.uid} />
      <ReservationsHebergement reservations={data.reservations} />
      <ActionsDashboard uid={data.uid} todos={data.todos} lieu={data.lieu} hasCommande={false} />
    </div>
  )
}
