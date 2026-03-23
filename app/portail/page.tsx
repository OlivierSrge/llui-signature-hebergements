// app/portail/page.tsx — Dashboard mariés — 12 blocs câblés Firestore

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import HeroCTA from '@/components/portail/dashboard/HeroCTA'
import StatsDashboard from '@/components/portail/dashboard/StatsDashboard'
import ActionsDashboard from '@/components/portail/dashboard/ActionsDashboard'
import SaisieBoutique from '@/components/portail/dashboard/SaisieBoutique'
import SaisieHebergement from '@/components/portail/dashboard/SaisieHebergement'
import CardCodePromo from '@/components/portail/dashboard/CardCodePromo'
import ReservationsHebergement from '@/components/portail/dashboard/ReservationsHebergement'
import AchatsBoutiqueInvites from '@/components/portail/dashboard/AchatsBoutiqueInvites'
import type { BoutiqueTransaction } from '@/components/portail/dashboard/AchatsBoutiqueInvites'
import PrevisionBudget from '@/components/budget/PrevisionBudget'
import JournalActivite from '@/components/portail/dashboard/JournalActivite'
import BienEtreCountdown from '@/components/portail/bienetre/BienEtreCountdown'
import TraiteurKribi from '@/components/portail/traiteur/TraiteurKribi'
import CarteKribi from '@/components/CarteKribi'
import ModeJourJ from '@/components/portail/jour-j/ModeJourJ'
import ProgrammeCeremonie from '@/components/portail/programme/ProgrammeCeremonie'
import CartographieHebergements from '@/components/portail/cartographie/CartographieHebergements'

// Note : le bandeau admin est géré par portail/layout.tsx (AdminBandeau + cookie admin_view)

export const dynamic = 'force-dynamic'

interface Todo { id: string; libelle: string; done: boolean; date_limite?: string | null; rev?: number; priorite?: string }
interface Reservation { id: string; logement: string; montant_total: number; commission_cash: number; date: string }
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

    // --- Champs enrichis depuis le document principal ---

    // BLOC 7 — Prestataires (template admin ou vide)
    const prestataires: Prestataire[] = (d.prestataires as Prestataire[] | undefined) ?? []

    // BLOC 9 / CORRECTION 2 — Tâches template depuis mariés/[uid].taches[]
    const tachesDoc: TacheDoc[] = (d.taches as TacheDoc[] | undefined) ?? []

    // CORRECTION 2 — Si todos subcollection vide, seeder depuis taches[] du doc principal (migration auto)
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
        // Relire les todos fraîchement seedés
        const newSnap = await db.collection('portail_users').doc(uid)
          .collection('todos').orderBy('created_at', 'asc').limit(20).get()
        todos = newSnap.docs.map(doc => {
          const td = doc.data()
          return { id: doc.id, libelle: td.libelle ?? '', done: false, date_limite: null, rev: td.rev ?? 0, priorite: td.priorite ?? 'basse' }
        })
      } catch { /* best-effort migration */ }
    }

    // BLOC 10 — Budget catégories
    const budgetCategories: BudgetCategories = (d.budget_categories as BudgetCategories | undefined) ?? {
      traiteur: 0, decoration: 0, hebergement: 0, beaute: 0, photographie: 0, autres: 0,
    }
    const budgetTotal: number = (d.budget_total as number | undefined) ?? (d.budget_previsionnel as number | undefined) ?? (d.projet?.budget_previsionnel as number | undefined) ?? 0

    // Date mariage (Timestamp ou string ISO)
    const dateMariageRaw = d.date_mariage ?? d.projet?.date_evenement
    const dateMariage: string = dateMariageRaw?.toDate
      ? dateMariageRaw.toDate().toISOString().slice(0, 10)
      : typeof dateMariageRaw === 'string' ? dateMariageRaw : ''

    // BLOC 12 — Versements libres (historique des paiements)
    // Compatible ancienne structure objet v1/v2/v3 ET nouveau tableau
    const versementsRaw = d.versements
    let versements: VersementLibre[] = []
    if (Array.isArray(versementsRaw)) {
      versements = versementsRaw as VersementLibre[]
    } else if (versementsRaw && typeof versementsRaw === 'object') {
      // Migration depuis l'ancienne structure v1/v2/v3 — ignorer (format obsolète)
      versements = []
    }

    // Invités depuis le tableau (pour comptages enrichis)
    const invitesList: Array<{ statut?: string }> = (d.invites as Array<{ statut?: string }> | undefined) ?? []
    const invitesConfirmesFirestore = invitesList.filter(i => i.statut === 'confirme').length
    const nbInvitesPrevus: number = (d.nb_invites_prevus as number | undefined) ?? (d.nombre_invites_prevu as number | undefined) ?? (d.nombre_invites_prevus as number | undefined) ?? (d.projet?.nombre_invites_prevu as number | undefined) ?? 0

    // Calcul todos
    const todosDone = todos.filter(t => t.done).length
    const todosTotal = todos.length

    // Progression depuis taches[] du doc pour les stats (si todos vide, utiliser tachesDoc)
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
      programmeCeremonie: (d.programme_ceremonie as Record<string, unknown>) ?? null,
    }
  } catch { redirect('/portail/login') }
}

export default async function PortailPage() {
  const data = await getData()

  // Compteur pour les stats — préfère les todos seedés, sinon tachesDoc
  const displayDone = data.todosDone > 0 ? data.todosDone : data.tachesDoneTpl
  const displayTotal = data.todosTotal > 0 ? data.todosTotal : data.tachesTotalTpl

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* BLOC 1 — Hero countdown (noms + jours via useClientIdentity → /api/portail/user) */}
      {/* BLOC 2 — CTA Boutique/Hébergements */}
      <HeroCTA uid={data.uid} todosDone={displayDone} todosTotal={displayTotal} />

      {/* BLOC 2 — Code privilège */}
      <CardCodePromo code={data.codePromo} uid={data.uid} />

      {/* BLOCS 3, 4, 5, 9 — Stats + Budget + Cagnotte + Invités */}
      <StatsDashboard
        uid={data.uid}
        todosDone={displayDone}
        todosTotal={displayTotal}
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

      {/* P8-D — Prévision budget finale */}
      <PrevisionBudget
        budget_total={data.budgetTotal}
        versements={data.versements}
        date_mariage={data.dateMariage}
        readOnly
      />

      {/* #184 — Countdown bien-être mariée */}
      <BienEtreCountdown marie_uid={data.uid} date_mariage={data.dateMariage} noms_maries={data.nomsMaries} />

      {/* #172 — Mode Jour J */}
      <ModeJourJ marie_uid={data.uid} date_mariage={data.dateMariage} noms_maries={data.nomsMaries} />

      {/* #120 — Programme cérémonie auto-généré */}
      <ProgrammeCeremonie
        marie_uid={data.uid}
        noms_maries={data.nomsMaries}
        date_mariage={data.dateMariage}
        programme_initial={data.programmeCeremonie as unknown as Parameters<typeof ProgrammeCeremonie>[0]['programme_initial']}
      />

      {/* #99 — Traiteur spécialités Kribi */}
      <TraiteurKribi />

      {/* #7 — Carte interactive Kribi */}
      <CarteKribi lieu={data.lieu} />

      {/* #102 — Cartographie hébergements Kribi */}
      <CartographieHebergements />

      {/* #51 — Journal d'activité */}
      <JournalActivite />

      {/* BLOCS 7, 8, 10, 11, 12 — Prestataires + Timeline + Tâches + Météo + Versements + Citation */}
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
