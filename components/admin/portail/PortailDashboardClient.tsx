'use client'
// components/admin/portail/PortailDashboardClient.tsx
// KPIs + graphique CSS + flux + alertes — auto-refresh 30s

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Kpis {
  caTotal: string; caMois: string
  commissionsVerseesMois: string; creditsVerseesMois: string
  primesEnAttente: string; primesCount: number
  retraitsEnAttente: string; retraitsCount: number
  actifsMonth: number; totalMaries: number; totalPartenaires: number; invitesConvertis: number
}
interface Props {
  data: {
    kpis: Kpis
    jours7: { label: string; ca: number }[]
    maxCA: number
    fluxTx: { label: string; date: string }[]
    alertes: { primesFsNonValidees: number; retraitsCount: number; generatedAt: string }
  }
}

function KpiCard({ title, value, sub, warn }: { title: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${warn ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-100'} shadow-sm`}>
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <p className={`text-xl font-bold ${warn ? 'text-red-600' : 'text-[#1A1A1A]'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
function KpiCount({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl p-4 bg-white border border-gray-100 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

export default function PortailDashboardClient({ data }: Props) {
  const router = useRouter()
  const refresh = useCallback(() => router.refresh(), [router])

  useEffect(() => {
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, [refresh])

  const { kpis, jours7, maxCA, fluxTx, alertes } = data

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Dashboard Portail</h1>
        <p className="text-xs text-gray-400">Actualisé à {new Date(alertes.generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      {/* KPIs financiers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="CA Total" value={kpis.caTotal} sub={`Ce mois : ${kpis.caMois}`} />
        <KpiCard title="Commissions versées" value={kpis.commissionsVerseesMois} sub={`dont ${kpis.creditsVerseesMois} crédits`} />
        <KpiCard title="Primes Fast Start dues" value={kpis.primesEnAttente} sub={`${kpis.primesCount} demande(s)`} warn={kpis.primesCount > 0} />
        <KpiCard title="Retraits en attente" value={kpis.retraitsEnAttente} sub={`${kpis.retraitsCount} demande(s)`} warn={kpis.retraitsCount > 0} />
      </div>

      {/* KPIs activité */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCount title="Inscrits actifs (mois)" value={kpis.actifsMonth} color="text-[#1A1A1A]" />
        <KpiCount title="Mariés" value={kpis.totalMaries} color="text-[#C9A84C]" />
        <KpiCount title="Partenaires" value={kpis.totalPartenaires} color="text-blue-600" />
        <KpiCount title="Invités convertis" value={kpis.invitesConvertis} color="text-green-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Graphique CA 7 jours */}
        <div className="lg:col-span-2 bg-[#1A1A1A] rounded-2xl p-5">
          <p className="text-white/60 text-xs mb-4">CA — 7 derniers jours</p>
          <div className="flex items-end gap-2 h-28">
            {jours7.map((j, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-[#C9A84C] transition-all"
                  style={{ height: `${Math.round((j.ca / maxCA) * 100)}%`, minHeight: j.ca > 0 ? '4px' : '0' }}
                />
                <p className="text-[9px] text-white/40 text-center leading-tight">{j.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Alertes */}
        <div className={`rounded-2xl p-4 ${alertes.primesFsNonValidees > 0 || alertes.retraitsCount > 0 ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-100'}`}>
          <p className="font-semibold text-sm mb-3">Alertes</p>
          {alertes.primesFsNonValidees === 0 && alertes.retraitsCount === 0
            ? <p className="text-xs text-green-600">✅ Aucune alerte en attente</p>
            : <>
                {alertes.primesFsNonValidees > 0 && <p className="text-sm text-red-600 font-medium">⚠️ {alertes.primesFsNonValidees} prime(s) Fast Start non validée(s)</p>}
                {alertes.retraitsCount > 0 && <p className="text-sm text-amber-600 font-medium mt-1">📤 {alertes.retraitsCount} retrait(s) en attente</p>}
                <div className="mt-3 flex flex-col gap-2">
                  <a href="/admin/paiements" className="text-xs underline text-[#1A1A1A]">→ Aller aux paiements</a>
                  <a href="/admin/fast-start" className="text-xs underline text-[#1A1A1A]">→ Aller aux Fast Start</a>
                </div>
              </>
          }
        </div>
      </div>

      {/* Flux temps réel */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <p className="font-semibold text-sm mb-3">Flux récent (10 dernières transactions)</p>
        {fluxTx.length === 0
          ? <p className="text-xs text-gray-400">Aucune transaction.</p>
          : <div className="space-y-2">
              {fluxTx.map((t, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-gray-50 pb-1.5 last:border-0">
                  <span className="text-gray-700">{t.label}</span>
                  <span className="text-xs text-gray-400">{t.date}</span>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  )
}
