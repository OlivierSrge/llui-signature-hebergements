// app/admin/reporting/page.tsx
// Reporting écosystème portail — graphiques CSS + top performers + métriques

import { getDb } from '@/lib/firebase'
import ReportingClient from '@/components/admin/portail/ReportingClient'

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0,0,0,0); return d }
function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) }

async function getReportingData() {
  const db = getDb()
  const [txSnap, usersSnap, invSnap] = await Promise.all([
    db.collectionGroup('transactions').get(),
    db.collection('portail_users').get(),
    db.collectionGroup('invites_guests').get(),
  ])
  const txAll = txSnap.docs.map(d => d.data())
  const users = usersSnap.docs.map(d => ({ ...d.data(), uid: d.id }))
  const invites = invSnap.docs.map(d => d.data())

  // Barres 30j par semaine (4 semaines)
  const semaines = Array.from({ length: 4 }, (_, i) => {
    const start = daysAgo(28 - i * 7)
    const end = daysAgo(21 - i * 7)
    const tx = txAll.filter(t => { const d = t.created_at?.toDate?.(); return d && d >= start && d < end })
    const ca = tx.reduce((s, t) => s + (t.amount_ht ?? 0), 0)
    const boutique = tx.filter(t => t.type === 'BOUTIQUE').reduce((s, t) => s + (t.amount_ht ?? 0), 0)
    const mariage = tx.filter(t => t.type === 'PACK_MARIAGE').reduce((s, t) => s + (t.amount_ht ?? 0), 0)
    return { label: `S${i + 1}`, ca, boutique, mariage }
  })
  const maxCA = Math.max(...semaines.map(s => s.ca), 1)

  // Grades répartition
  const gradeCount: Record<string, number> = {}
  const total = users.length
  users.forEach(u => { const g = (u as Record<string,unknown>).grade as string ?? 'START'; gradeCount[g] = (gradeCount[g] ?? 0) + 1 })

  // Top 5 users par REV
  const top5 = users
    .sort((a, b) => ((b as Record<string,unknown>).rev_lifetime as number ?? 0) - ((a as Record<string,unknown>).rev_lifetime as number ?? 0))
    .slice(0, 5)
    .map(u => ({
      nom: (u as Record<string,unknown>).displayName as string ?? '—',
      grade: (u as Record<string,unknown>).grade as string ?? 'START',
      rev: (u as Record<string,unknown>).rev_lifetime as number ?? 0,
      cash: (u as Record<string,unknown> & { wallets?: { cash?: number } }).wallets?.cash ?? 0,
    }))
  const maxRev = Math.max(...top5.map(u => u.rev), 1)

  // Top 5 mariés par invités convertis
  const top5Maries = users
    .filter(u => (u as Record<string,unknown>).role === 'MARIÉ')
    .map(u => {
      const uid = (u as Record<string,unknown>).uid as string
      const conv = invites.filter(i => i.mariage_uid === uid && i.converted).length
      const total_achats = invites.filter(i => i.mariage_uid === uid).reduce((s, i) => s + (i.total_achats ?? 0), 0)
      return { nom: (u as Record<string,unknown>).displayName as string ?? '—', convertis: conv, ca: total_achats }
    })
    .sort((a, b) => b.convertis - a.convertis).slice(0, 5)

  // Métriques clés
  const completed = txAll.filter(t => t.status === 'COMPLETED')
  const ticketMoyen = completed.length ? Math.round(completed.reduce((s, t) => s + (t.amount_ht ?? 0), 0) / completed.length) : 0
  const invitesTotal = invites.length
  const invitesConvertis = invites.filter(i => i.converted).length
  const tauxConversion = invitesTotal ? Math.round((invitesConvertis / invitesTotal) * 100) : 0

  return { semaines, maxCA, gradeCount, total, top5, maxRev, top5Maries, metriques: { ticketMoyen: fmt(ticketMoyen), tauxConversion, invitesConvertis, total } }
}

export const dynamic = 'force-dynamic'

export default async function AdminReportingPage() {
  const data = await getReportingData()
  return <ReportingClient data={data} />
}
