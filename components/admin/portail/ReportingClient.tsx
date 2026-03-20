'use client'
// components/admin/portail/ReportingClient.tsx

import Link from 'next/link'

const GRADE_COLORS: Record<string, string> = {
  START:'#888',BRONZE:'#CD7F32',ARGENT:'#9E9E9E',OR:'#C9A84C',SAPHIR:'#0F52BA',DIAMANT:'#B9F2FF',
}
function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA' }

interface Semaine { label: string; ca: number; boutique: number; mariage: number }
interface User { nom: string; grade: string; rev: number; cash: number }
interface Marie { nom: string; convertis: number; ca: number }
interface Metriques { ticketMoyen: string; tauxConversion: number; invitesConvertis: number; total: number }

interface Props {
  data: {
    semaines: Semaine[]; maxCA: number
    gradeCount: Record<string, number>; total: number
    top5: User[]; maxRev: number; top5Maries: Marie[]
    metriques: Metriques
  }
}

export default function ReportingClient({ data }: Props) {
  const { semaines, maxCA, gradeCount, total, top5, maxRev, top5Maries, metriques } = data
  const GRADES = ['START','BRONZE','ARGENT','OR','SAPHIR','DIAMANT']

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reporting</h1>
        <Link href="/api/admin/export/csv?type=transactions" className="px-4 py-2 bg-[#1A1A1A] text-white text-sm rounded-xl hover:bg-gray-800">
          Exporter CSV
        </Link>
      </div>

      {/* Métriques clés */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Ticket moyen', val: metriques.ticketMoyen },
          { label: 'Taux conversion invités', val: `${metriques.tauxConversion}%` },
          { label: 'Invités convertis', val: String(metriques.invitesConvertis) },
          { label: 'Inscrits total', val: String(metriques.total) },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{m.label}</p>
            <p className="text-xl font-bold text-[#1A1A1A]">{m.val}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Graphique revenus 4 semaines */}
        <div className="bg-[#1A1A1A] rounded-2xl p-5">
          <p className="text-white/60 text-xs mb-4">CA par semaine (4 dernières semaines)</p>
          <div className="flex items-end gap-3 h-28">
            {semaines.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                  <div className="w-full rounded-t bg-[#C9A84C]"
                    style={{ height: `${Math.round((s.boutique / maxCA) * 100)}%`, minHeight: s.boutique > 0 ? '3px' : '0' }} />
                  <div className="w-full rounded-t bg-teal-500 mt-0.5"
                    style={{ height: `${Math.round((s.mariage / maxCA) * 100)}%`, minHeight: s.mariage > 0 ? '3px' : '0' }} />
                </div>
                <p className="text-[10px] text-white/40">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#C9A84C] inline-block"/>Boutique</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500 inline-block"/>Pack Mariage</span>
          </div>
        </div>

        {/* Répartition grades */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="font-semibold text-sm mb-3">Répartition grades</p>
          <div className="space-y-2">
            {GRADES.map(g => {
              const count = gradeCount[g] ?? 0
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={g} className="flex items-center gap-2">
                  <span className="w-16 text-xs font-medium" style={{ color: GRADE_COLORS[g] }}>{g}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: GRADE_COLORS[g] }} />
                  </div>
                  <span className="text-xs text-gray-400 w-12 text-right">{count} ({pct}%)</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top performers */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-[#1A1A1A] rounded-2xl p-5">
          <p className="text-white/60 text-xs mb-3">Top 5 par REV</p>
          <div className="space-y-2">
            {top5.map((u, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-white/40 text-xs w-4">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-white font-medium">{u.nom}</span>
                    <span style={{ color: GRADE_COLORS[u.grade] }}>{u.rev.toLocaleString('fr-FR')} REV</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#C9A84C]" style={{ width: `${Math.round((u.rev / data.maxRev) * 100)}%` }} />
                  </div>
                </div>
                <span className="text-[10px] text-white/40 w-20 text-right">{fmt(u.cash)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="font-semibold text-sm mb-3">Top 5 mariés — invités convertis</p>
          <div className="space-y-2">
            {top5Maries.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-gray-50 pb-1.5 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 text-xs">{i + 1}</span>
                  <span className="font-medium">{m.nom}</span>
                </div>
                <div className="text-right text-xs">
                  <p className="text-green-600 font-semibold">{m.convertis} converti(s)</p>
                  <p className="text-gray-400">{fmt(m.ca)}</p>
                </div>
              </div>
            ))}
            {top5Maries.length === 0 && <p className="text-xs text-gray-400">Aucune conversion enregistrée.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
