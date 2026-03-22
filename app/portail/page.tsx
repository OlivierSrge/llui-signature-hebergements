// app/portail/page.tsx — Dashboard mariés — 12 blocs câblés Firestore

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
interface Prestataire { nom: string; statut: string; type: string }
interface TacheDoc { titre: string; statut: 'todo' | 'done'; priorite: 'haute' | 'moyenne' | 'basse' }
interface BudgetCategories {
  traiteur: number; decoration: number; hebergement: number
  beaute: number; photographie: number; autres: number
}
interface VersementItem { label: string; montant: number; statut: string }
interface Versements {
  v1?: VersementItem; v2?: VersementItem; v3?: VersementItem
}

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

    // Réservations hébergements (isolé pour ne pas bloquer si index manquant)
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
    } catch { /* index en cours */ }

    // Achats boutique invités (isolé)
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
    } catch { /* index en cours */ }

    const derniere = boutiqueTransactions[0]
      ? { date: boutiqueTransactions[0].date, produit: boutiqueTransactions[0].produit, montant: boutiqueTransactions[0].montant_final }
      : null

    // --- Nouveaux champs depuis le document principal ---

    // BLOC 7 — Prestataires (template admin ou vide)
    const prestataires: Prestataire[] = (d.prestataires as Prestataire[] | undefined) ?? []

    // BLOC 9 — Tâches template (pour affichage dashboard si todos subcollection vide)
    const tachesDoc: TacheDoc[] = (d.taches as TacheDoc[] | undefined) ?? []

    // BLOC 10 — Budget catégories
    const budgetCategories: BudgetCategories = (d.budget_categories as BudgetCategories | undefined) ?? {
      traiteur: 0, decoration: 0, hebergement: 0, beaute: 0, photographie: 0, autres: 0,
    }
    const budgetTotal: number = (d.budget_total as number | undefined) ?? (d.projet?.budget_previsionnel as number | undefined) ?? 0

    // BLOC 12 — Versements 30/40/30
    const versements: Versements = (d.versements as Versements | undefined) ?? {}

    // Invités depuis le tableau (pour comptages enrichis)
    const invitesList: Array<{ statut?: string }> = (d.invites as Array<{ statut?: string }> | undefined) ?? []
    const invitesConfirmesFirestore = invitesList.filter(i => i.statut === 'confirme').length
    const nbInvitesPrevus: number = (d.nb_invites_prevus as number | undefined) ?? (d.projet?.nombre_invites_prevu as number | undefined) ?? 0

    // Calcul todos
    const todosDone = todos.filter(t => t.done).length
    const todosTotal = todos.length

    // Progression globale = tâches done + invités confirmés vs prévus
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
      reservations,
      boutiqueTransactions,
      nbCommandesInvites: boutiqueTransactions.length,
      derniereCommande: derniere,
      // Nouveaux
      prestataires,
      tachesDoc,
      tachesDoneTpl,
      tachesTotalTpl,
      budgetCategories,
      budgetTotal,
      versements,
      invitesConfirmesFirestore,
      nbInvitesPrevus,
    }
  } catch { redirect('/portail/login') }
}

export default async function PortailPage() {
  const data = await getData()

  // Versements sous forme de tableau pour ActionsDashboard
  const versementsArray = [
    data.versements.v1 ? { label: data.versements.v1.label, montant: data.versements.v1.montant, statut: data.versements.v1.statut as 'payé' | 'en_attente' | 'en_retard' | 'à_venir' } : null,
    data.versements.v2 ? { label: data.versements.v2.label, montant: data.versements.v2.montant, statut: data.versements.v2.statut as 'payé' | 'en_attente' | 'en_retard' | 'à_venir' } : null,
    data.versements.v3 ? { label: data.versements.v3.label, montant: data.versements.v3.montant, statut: data.versements.v3.statut as 'payé' | 'en_attente' | 'en_retard' | 'à_venir' } : null,
  ].filter((v): v is NonNullable<typeof v> => v !== null)

  const hasVersements = versementsArray.length > 0 && data.budgetTotal > 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* BLOC 1 — Hero countdown (lit date_mariage + noms via useClientIdentity) */}
      {/* BLOC 2 — CTA Boutique/Hébergements */}
      <HeroCTA
        uid={data.uid}
        todosDone={data.todosDone > 0 ? data.todosDone : data.tachesDoneTpl}
        todosTotal={data.todosTotal > 0 ? data.todosTotal : data.tachesTotalTpl}
      />

      {/* BLOC 2 — Code privilège */}
      <CardCodePromo code={data.codePromo} uid={data.uid} />

      {/* BLOCS 3, 4, 5, 9 — Stats + Budget + Cagnotte + Invités */}
      <StatsDashboard
        uid={data.uid}
        todosDone={data.todosDone > 0 ? data.todosDone : data.tachesDoneTpl}
        todosTotal={data.todosTotal > 0 ? data.todosTotal : data.tachesTotalTpl}
        walletCash={data.walletCash}
        walletCredits={data.walletCredits}
        nbCommandesInvites={data.nbCommandesInvites}
        derniereCommande={data.derniereCommande}
        budgetTotal={data.budgetTotal}
        budgetCategories={data.budgetCategories}
        invitesConfirmesFirestore={data.invitesConfirmesFirestore}
        nbInvitesPrevus={data.nbInvitesPrevus}
      />

      {/* BLOC 5 — Achats Boutique */}
      <SaisieBoutique uid={data.uid} />
      <AchatsBoutiqueInvites transactions={data.boutiqueTransactions} />

      {/* BLOC 6 — Mon Hébergement */}
      <SaisieHebergement uid={data.uid} />
      <ReservationsHebergement reservations={data.reservations} />

      {/* BLOCS 7, 8, 10, 11, 12 — Prestataires + Timeline + Tâches + Météo + Versements + Citation */}
      <ActionsDashboard
        uid={data.uid}
        todos={data.todos}
        lieu={data.lieu}
        versements={versementsArray}
        hasCommande={hasVersements}
        prestataires={data.prestataires}
      />
    </div>
  )
}
