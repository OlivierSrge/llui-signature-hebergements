// app/admin/dashboard/page.tsx
// Dashboard Portail P4 — KPIs écosystème L&Lui Signature

import { getDb } from '@/lib/firebase'
import PortailDashboardClient from '@/components/admin/portail/PortailDashboardClient'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

function startOfMonth() {
  const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d
}
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0,0,0,0); return d
}

async function getDashboardData() {
  const db = getDb()
  const now = new Date()
  const monthStart = startOfMonth()

  // Portail users
  const usersSnap = await db.collection('portail_users').get()
  const users = usersSnap.docs.map(d => d.data())
  const totalMaries = users.filter(u => u.role === 'MARIÉ').length
  const totalPartenaires = users.filter(u => u.role === 'PARTENAIRE').length
  const actifsMonth = users.filter(u => u.last_seen?.toDate?.() >= monthStart || u.created_at?.toDate?.() >= monthStart).length

  // Fast Start demandes
  const fsSnap = await db.collection('fast_start_demandes').get()
  const fsDemandes = fsSnap.docs.map(d => d.data())
  const primesEnAttente = fsDemandes.filter(d => d.statut === 'EN_ATTENTE').reduce((s, d) => s + (d.montant_prime ?? 0), 0)

  // Retraits en attente
  const retraitsSnap = await db.collection('retraits_demandes').where('statut', '==', 'EN_ATTENTE').get()
  const retraitsEnAttente = retraitsSnap.docs.reduce((s, d) => s + (d.data().montant ?? 0), 0)
  const retraitsCount = retraitsSnap.size

  // Commissions
  const comSnap = await db.collection('commissions').get()
  const coms = comSnap.docs.map(d => d.data())
  const comsMois = coms.filter(c => c.created_at?.toDate?.() >= monthStart)
  const commissionsVerseesMois = comsMois.reduce((s, c) => s + (c.cash ?? 0), 0)
  const creditsVerseesMois = comsMois.reduce((s, c) => s + (c.credits ?? 0), 0)

  // CA Total (depuis toutes les sous-collections portail_users/*/transactions)
  const txSnap = await db.collectionGroup('transactions').where('status', '==', 'COMPLETED').get()
  const txAll = txSnap.docs.map(d => d.data())
  const caTotal = txAll.reduce((s, t) => s + (t.amount_ht ?? 0), 0)
  const caMois = txAll.filter(t => t.created_at?.toDate?.() >= monthStart).reduce((s, t) => s + (t.amount_ht ?? 0), 0)

  // Invités convertis
  const invitesSnap = await db.collectionGroup('invites_guests').where('converted', '==', true).get()
  const invitesConvertis = invitesSnap.size

  // Barres 7 jours
  const jours7: { label: string; ca: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const start = daysAgo(i)
    const end = daysAgo(i - 1)
    const ca = txAll.filter(t => {
      const d = t.created_at?.toDate?.()
      return d && d >= start && d < end
    }).reduce((s, t) => s + (t.amount_ht ?? 0), 0)
    jours7.push({ label: start.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }), ca })
  }
  const maxCA = Math.max(...jours7.map(j => j.ca), 1)

  // Dernières transactions (flux)
  const fluxTx = txAll
    .filter(t => t.created_at?.toDate)
    .sort((a, b) => b.created_at.toDate().getTime() - a.created_at.toDate().getTime())
    .slice(0, 10)
    .map(t => ({
      label: `💰 ${t.source ?? 'Boutique'} — ${fmt(t.amount_ht ?? 0)}`,
      date: t.created_at.toDate().toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    }))

  // Alertes
  const primesFsNonValidees = fsDemandes.filter(d => d.statut === 'EN_ATTENTE').length

  return {
    kpis: {
      caTotal: fmt(caTotal), caMois: fmt(caMois),
      commissionsVerseesMois: fmt(commissionsVerseesMois), creditsVerseesMois: fmt(creditsVerseesMois),
      primesEnAttente: fmt(primesEnAttente), primesCount: fsDemandes.filter(d => d.statut === 'EN_ATTENTE').length,
      retraitsEnAttente: fmt(retraitsEnAttente), retraitsCount,
      actifsMonth, totalMaries, totalPartenaires, invitesConvertis,
    },
    jours7, maxCA, fluxTx,
    alertes: { primesFsNonValidees, retraitsCount, generatedAt: now.toISOString() },
  }
}

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const data = await getDashboardData()
  return <PortailDashboardClient data={data} />
}
