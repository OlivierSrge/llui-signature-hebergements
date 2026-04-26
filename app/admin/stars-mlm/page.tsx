// app/admin/stars-mlm/page.tsx — Dashboard admin global Stars & MLM
// Espace Olivier uniquement — accès via AdminSidebar

import { db } from '@/lib/firebase'
import { serializeFirestoreDoc } from '@/lib/serialization'
import AdminStarsMLMClient from './AdminStarsMLMClient'

export const metadata = { title: 'Stars & MLM — Admin L&Lui' }
export const dynamic = 'force-dynamic'

async function loadData() {
  const [walletsSnap, retraitsSnap, txSnap, partenairesSnap] = await Promise.all([
    db.collection('wallets_partenaires').get(),
    db.collection('retraits_partenaires').orderBy('created_at', 'desc').limit(50).get(),
    db.collection('commissions_partenaires').orderBy('created_at', 'desc').limit(100).get(),
    db.collection('prescripteurs_partenaires').where('statut', '==', 'actif').get(),
  ])

  const partenairesMap: Record<string, string> = {}
  for (const doc of partenairesSnap.docs) {
    partenairesMap[doc.id] = (doc.data().nom_etablissement as string) ?? doc.id
  }

  const wallets = walletsSnap.docs.map((doc) => {
    const d = serializeFirestoreDoc(doc.data())
    return {
      partenaire_id: doc.id,
      partenaire_nom: partenairesMap[doc.id] ?? doc.id,
      cash: (d.cash as number) ?? 0,
      credits: (d.credits as number) ?? 0,
      cash_en_attente: (d.cash_en_attente as number) ?? 0,
      credits_en_attente: (d.credits_en_attente as number) ?? 0,
      rev_total: (d.rev_total as number) ?? 0,
      grade_actuel: (d.grade_actuel as string) ?? 'START',
      updated_at: (d.updated_at as string) ?? '',
    }
  }).sort((a, b) => (b.cash + b.credits) - (a.cash + a.credits))

  const retraits = retraitsSnap.docs.map((doc) => {
    const d = serializeFirestoreDoc(doc.data())
    return {
      id: doc.id,
      partenaire_id: (d.partenaire_id as string) ?? '',
      partenaire_nom: partenairesMap[d.partenaire_id as string] ?? (d.partenaire_id as string),
      montant: (d.montant as number) ?? 0,
      operateur: (d.operateur as string) ?? 'MTN',
      numero_mobile_money: (d.numero_mobile_money as string) ?? '',
      statut: (d.statut as string) ?? 'demande',
      note_admin: (d.note_admin as string) ?? undefined,
      created_at: (d.created_at as string) ?? '',
      traitee_at: (d.traitee_at as string) ?? undefined,
    }
  })

  const commissions = txSnap.docs.map((doc) => {
    const d = serializeFirestoreDoc(doc.data())
    return {
      id: doc.id,
      partenaire_id: (d.partenaire_id as string) ?? '',
      partenaire_nom: partenairesMap[d.partenaire_id as string] ?? (d.partenaire_id as string),
      partenaire_source_id: (d.partenaire_source_id as string) ?? '',
      type_vente: (d.type_vente as string) ?? '',
      niveau: (d.niveau as number) ?? 1,
      montant_vente: (d.montant_vente as number) ?? 0,
      montant_commission: (d.montant_commission as number) ?? 0,
      montant_cash: (d.montant_cash as number) ?? 0,
      montant_credits: (d.montant_credits as number) ?? 0,
      rev_generes: (d.rev_generes as number) ?? 0,
      statut: (d.statut as string) ?? 'pending',
      created_at: (d.created_at as string) ?? '',
    }
  })

  // KPIs globaux
  const totalCashDisponible = wallets.reduce((s, w) => s + w.cash, 0)
  const totalCredits = wallets.reduce((s, w) => s + w.credits, 0)
  const totalRevGlobal = wallets.reduce((s, w) => s + w.rev_total, 0)
  const retraitsPendingCount = retraits.filter((r) => r.statut === 'demande').length
  const retraitsPendingMontant = retraits
    .filter((r) => r.statut === 'demande')
    .reduce((s, r) => s + r.montant, 0)
  const commissionsTotal = commissions.reduce((s, c) => s + c.montant_commission, 0)

  return {
    wallets, retraits, commissions,
    kpis: {
      totalCashDisponible, totalCredits, totalRevGlobal,
      retraitsPendingCount, retraitsPendingMontant, commissionsTotal,
      nbPartenaires: wallets.length,
    },
  }
}

export default async function StarsMLMAdminPage() {
  const data = await loadData()
  return <AdminStarsMLMClient {...data} />
}
