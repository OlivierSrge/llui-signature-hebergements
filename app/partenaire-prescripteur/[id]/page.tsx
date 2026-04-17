import { notFound } from 'next/navigation'
import { getPrescripteurPartenaire } from '@/actions/codes-sessions'
import { getParametresPlateforme } from '@/actions/parametres'
import { db } from '@/lib/firebase'
import DashboardPartenaireClient from './DashboardPartenaireClient'

export const dynamic = 'force-dynamic'

interface Props { params: { id: string } }

interface CommissionDoc {
  id: string
  statut: string
  commission_fcfa: number
  montant_transaction_fcfa?: number
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

// Inline pour éviter l'import de actions/stars.ts (qui importe twilio via whatsappNotif)
// twilio n'est pas dans serverComponentsExternalPackages → crash SSR si importé depuis un Server Component
async function getStarsTxsCount(prescripteurId: string): Promise<{ client_id: string }[]> {
  try {
    const snap = await db
      .collection('transactions_fidelite')
      .where('partenaire_id', '==', prescripteurId)
      .where('status', '==', 'confirmed')
      .limit(200)
      .get()
    return snap.docs.map((d) => ({ client_id: d.data().client_id as string }))
  } catch (e) {
    console.error('[DashboardPartenaire] getStarsTxsCount error:', e)
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

  const [codesActifs, transactions, plateformeParams, starsTxs] = await Promise.all([
    getCodesActifs(params.id),
    getTransactions(params.id),
    getParametresPlateforme(),
    getStarsTxsCount(params.id),
  ])

  // Stats Stars
  const clientsStarsSet = new Set(starsTxs.map((t) => t.client_id))
  const starsStats = {
    totalCaStars: (partenaire.total_ca_stars_fcfa as number | undefined) ?? 0,
    soldeProvision: (partenaire.solde_provision as number | undefined) ?? 0,
    clientsCount: clientsStarsSet.size,
  }

  // Commissions dues = ventes confirmées (client a payé), pas encore versées au partenaire
  const commissionsDues = transactions
    .filter((t) => t.statut === 'en_attente')
    .reduce((s, t) => s + (typeof t.commission_fcfa === 'number' ? t.commission_fcfa : 0), 0)
  // Ventes en cours = commandes enregistrées, paiement client encore en attente
  const ventesEnCours = transactions
    .filter((t) => t.statut === 'vente_en_cours')
    .reduce((s, t) => s + (typeof t.montant_transaction_fcfa === 'number' ? t.montant_transaction_fcfa : 0), 0)
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
      ventesEnCours={ventesEnCours}
      plateformeParams={plateformeParams}
      starsStats={starsStats}
    />
  )
}
