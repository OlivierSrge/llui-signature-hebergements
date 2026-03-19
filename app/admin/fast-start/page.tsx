// app/admin/fast-start/page.tsx
// Administration Fast Start Cameroun — KPIs + demandes + suivi + alertes

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import FastStartTable from '@/components/admin/FastStartTable'
import type { Demande } from '@/components/admin/FastStartTable'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n)) + ' FCFA'
}

async function getAdminData() {
  const cookieStore = cookies()
  if (!cookieStore.get('admin_session')?.value) redirect('/admin/login')

  const db = getDb()
  const now = Date.now()
  const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  // Toutes les demandes
  const demandesSnap = await db.collection('fast_start_demandes')
    .orderBy('atteint_at', 'asc').limit(200).get()

  const demandes: Demande[] = demandesSnap.docs.map(doc => {
    const d = doc.data()
    return {
      id: doc.id,
      nom_complet: d.nom_complet ?? '',
      palier: d.palier ?? 30,
      rev_au_moment: d.rev_au_moment ?? 0,
      montant_prime: d.montant_prime ?? 0,
      telephone_om: d.telephone_om ?? '',
      atteint_at: d.atteint_at?.toDate ? d.atteint_at.toDate().toISOString() : new Date().toISOString(),
      statut: d.statut ?? 'EN_ATTENTE',
    }
  })

  const enAttente = demandes.filter(d => d.statut === 'EN_ATTENTE')
  const montantAVerser = demandes
    .filter(d => d.statut === 'EN_ATTENTE' || d.statut === 'VALIDEE')
    .reduce((s, d) => s + d.montant_prime, 0)
  const verseCeMois = demandesSnap.docs
    .filter(doc => {
      const d = doc.data()
      if (d.statut !== 'PAYEE') return false
      const payeAt = d.paye_at?.toDate ? d.paye_at.toDate() : null
      return payeAt && payeAt >= debutMois
    })
    .reduce((s, doc) => s + (doc.data().montant_prime ?? 0), 0)

  // Users avec fast_start actif pour suivi global
  const usersSnap = await db.collection('portail_users')
    .where('fast_start.enrolled_at', '!=', null)
    .limit(100).get()

  interface UserRow {
    uid: string; displayName: string; grade: string; rev: number
    joursRestants: number; phone: string
    p30: string; p60: string; p90: string
    alertes: number[]
  }
  const usersRows: UserRow[] = []
  let totalEnrolled = 0; let totalUnlocked = 0

  for (const doc of usersSnap.docs) {
    const d = doc.data()
    totalEnrolled++
    const fs = d.fast_start ?? {}
    const enrolled = fs.enrolled_at?.toDate ? fs.enrolled_at.toDate().getTime() : null
    const joursEcoules = enrolled ? Math.floor((now - enrolled) / 86_400_000) : 0
    const joursRestants = Math.max(0, 90 - joursEcoules)

    const palierIcon = (u: boolean, e: boolean, p: boolean) =>
      p ? '💰' : u ? '🟡' : e ? '❌' : '⬜'

    if (fs.palier_30_unlocked) totalUnlocked++
    if (fs.palier_60_unlocked) totalUnlocked++
    if (fs.palier_90_unlocked) totalUnlocked++

    // Alertes 7 jours
    const alertes: number[] = []
    for (const j of [30, 60, 90] as const) {
      const dl = fs[`deadline_${j}j`]?.toDate ? fs[`deadline_${j}j`].toDate().getTime() : null
      if (dl && dl - now > 0 && dl - now < 7 * 86_400_000 && !fs[`palier_${j}_unlocked`] && !fs[`palier_${j}_expire`]) {
        alertes.push(j)
      }
    }

    usersRows.push({
      uid: doc.id,
      displayName: d.displayName ?? '—',
      grade: d.grade ?? 'START',
      rev: d.rev_lifetime ?? 0,
      joursRestants,
      phone: d.phone ?? '',
      p30: palierIcon(fs.palier_30_unlocked, fs.palier_30_expire, fs.palier_30_paye),
      p60: palierIcon(fs.palier_60_unlocked, fs.palier_60_expire, fs.palier_60_paye),
      p90: palierIcon(fs.palier_90_unlocked, fs.palier_90_expire, fs.palier_90_paye),
      alertes,
    })
  }

  const tauxDeclenchement = totalEnrolled > 0 ? Math.round((totalUnlocked / (totalEnrolled * 3)) * 100) : 0
  const usersAlerte = usersRows.filter(r => r.alertes.length > 0)

  return { demandes, enAttente, montantAVerser, verseCeMois, tauxDeclenchement, usersRows, usersAlerte }
}

export default async function AdminFastStartPage() {
  const { demandes, enAttente, montantAVerser, verseCeMois, tauxDeclenchement, usersRows, usersAlerte } = await getAdminData()

  const kpis = [
    { label: 'Demandes en attente', value: enAttente.length, format: 'n', alert: enAttente.length > 0 },
    { label: 'Montant à verser', value: montantAVerser, format: 'fcfa', alert: false },
    { label: 'Versé ce mois', value: verseCeMois, format: 'fcfa', alert: false },
    { label: 'Taux déclenchement', value: tauxDeclenchement, format: 'pct', alert: false },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-serif italic text-[#1A1A1A]">Fast Start Cameroun</h1>

      {/* Section 1 — KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className={`rounded-2xl p-4 border ${k.alert ? 'border-red-300 bg-red-50' : 'border-[#F5F0E8] bg-white'}`}>
            <p className="text-[10px] text-[#888] mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.alert ? 'text-red-600' : 'text-[#1A1A1A]'}`}>
              {k.format === 'fcfa' ? formatFCFA(k.value)
                : k.format === 'pct' ? `${k.value}%`
                : k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Section 2 — Demandes EN ATTENTE */}
      <div className="bg-white rounded-2xl p-5 border border-[#F5F0E8] shadow-sm">
        <h2 className="font-semibold text-[#1A1A1A] mb-4">Demandes en attente ({enAttente.length})</h2>
        <FastStartTable demandes={enAttente} />
      </div>

      {/* Section 3 — Suivi global */}
      <div className="bg-white rounded-2xl p-5 border border-[#F5F0E8] shadow-sm">
        <h2 className="font-semibold text-[#1A1A1A] mb-4">Suivi global — {usersRows.length} inscrit(s)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-[#888] border-b border-[#F5F0E8]">
                {['Nom', 'Grade', 'REV', 'Jours restants', 'J30', 'J60', 'J90'].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usersRows.map(r => (
                <tr key={r.uid} className="border-b border-[#F5F0E8] hover:bg-[#FAFAF7]">
                  <td className="py-2 px-3 font-medium text-[#1A1A1A]">{r.displayName}</td>
                  <td className="py-2 px-3 text-[11px] text-[#888]">{r.grade}</td>
                  <td className="py-2 px-3">{r.rev}</td>
                  <td className="py-2 px-3 text-[11px]">
                    <span className={r.joursRestants <= 7 ? 'text-red-500 font-semibold' : 'text-[#888]'}>
                      {r.joursRestants}j
                    </span>
                  </td>
                  <td className="py-2 px-3 text-lg">{r.p30}</td>
                  <td className="py-2 px-3 text-lg">{r.p60}</td>
                  <td className="py-2 px-3 text-lg">{r.p90}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4 — Alertes 7 jours */}
      {usersAlerte.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="font-semibold text-amber-800 mb-4">⚡ Alertes — {usersAlerte.length} partenaire(s) dans les 7 prochains jours</h2>
          <div className="space-y-2">
            {usersAlerte.map(r => (
              <div key={r.uid} className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100">
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">{r.displayName}</p>
                  <p className="text-[11px] text-[#888]">
                    Paliers urgents : {r.alertes.map(j => `J${j}`).join(', ')} — {r.joursRestants}j restants
                  </p>
                </div>
                {r.phone && (
                  <a
                    href={`https://wa.me/${r.phone.replace('+', '')}?text=${encodeURIComponent(
                      `⚡ ${r.displayName}, il vous reste ${r.joursRestants} jours pour le Fast Start ! Vos REV : ${r.rev}. Continuez sur : ${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/portail`
                    )}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[11px] bg-[#25D366] text-white px-3 py-1.5 rounded-lg font-medium whitespace-nowrap"
                  >
                    Rappel WA
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toutes les demandes */}
      <div className="bg-white rounded-2xl p-5 border border-[#F5F0E8] shadow-sm">
        <h2 className="font-semibold text-[#1A1A1A] mb-4">Toutes les demandes ({demandes.length})</h2>
        <FastStartTable demandes={demandes} />
      </div>
    </div>
  )
}
