'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Download, Loader2, Users, TrendingUp, Wallet, Clock } from 'lucide-react'
import { getAnalyticsPrescripteurs } from '@/actions/prescripteurs'
import type { AnalyticsPrescripteurs } from '@/actions/prescripteurs'

type Periode = 'mois' | 'mois_dernier' | '3mois' | '6mois'

const PERIODES: { id: Periode; label: string }[] = [
  { id: 'mois',         label: 'Ce mois' },
  { id: 'mois_dernier', label: 'Mois dernier' },
  { id: '3mois',        label: '3 mois' },
  { id: '6mois',        label: '6 mois' },
]

function formatFCFA(n: number) {
  return n.toLocaleString('fr-FR') + ' F'
}

export default function AnalyticsDashboard() {
  const [periode, setPeriode] = useState<Periode>('mois')
  const [data, setData] = useState<AnalyticsPrescripteurs | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    getAnalyticsPrescripteurs(periode)
      .then(setData)
      .finally(() => setIsLoading(false))
  }, [periode])

  const exportCSV = useCallback(() => {
    if (!data) return
    const rows = [
      ['Date', 'Prescripteur', 'Type', 'Client', 'Hebergement', 'Montant FCFA', 'Statut'],
      ...data.transactions_csv.map((t) => [t.date, t.prescripteur, t.type, t.client, t.hebergement, t.montant, t.statut]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prescripteurs-${periode}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [data, periode])

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-6 mb-6 space-y-6">
      {/* Titre + filtre période */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-semibold text-dark text-lg">Analytics prescripteurs</h2>
        <div className="flex gap-2 flex-wrap">
          {PERIODES.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriode(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                periode === p.id
                  ? 'bg-gold-500 text-dark'
                  : 'bg-beige-100 text-dark/60 hover:bg-beige-200'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={exportCSV}
            disabled={!data || isLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-dark text-white hover:bg-dark/80 disabled:opacity-40 flex items-center gap-1.5 transition-colors"
          >
            <Download size={12} /> Exporter CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="text-gold-500 animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* KPIs dynamiques */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: <Users size={16} />, label: 'Prescripteurs actifs', value: data.total_actifs, cls: 'text-blue-600 bg-blue-50' },
              { icon: <TrendingUp size={16} />, label: 'Clients période', value: data.clients_ce_mois, cls: 'text-green-600 bg-green-50' },
              { icon: <Wallet size={16} />, label: 'Commissions dues', value: formatFCFA(data.commissions_dues), cls: 'text-amber-600 bg-amber-50' },
              { icon: <Clock size={16} />, label: 'Retraits en attente', value: formatFCFA(data.retraits_en_attente), cls: 'text-red-600 bg-red-50' },
            ].map((k) => (
              <div key={k.label} className={`rounded-xl p-4 flex items-center gap-3 ${k.cls}`}>
                <div className="opacity-70">{k.icon}</div>
                <div>
                  <p className="text-xs opacity-70 font-medium leading-none mb-1">{k.label}</p>
                  <p className="text-lg font-bold leading-none">{k.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top 5 prescripteurs */}
          {data.top5.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-dark/70 mb-3">Top 5 prescripteurs (clients amenés)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.top5} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede4" />
                  <XAxis dataKey="nom" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => v.split(' ')[0]} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} width={30} />
                  <Tooltip
                    formatter={(val: number | undefined, name: string | undefined) => [
                      name === 'clients' ? `${val ?? 0} clients` : formatFCFA(val ?? 0),
                      name === 'clients' ? 'Clients' : 'Commissions',
                    ] as [string, string]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #f0ede4', fontSize: 12 }}
                  />
                  <Bar dataKey="clients" fill="#C9A84C" radius={[4, 4, 0, 0]} name="clients" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Évolution 6 mois */}
          <div>
            <h3 className="text-sm font-semibold text-dark/70 mb-3">Évolution commissions (6 mois)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.evolution6mois} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede4" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} width={40} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  formatter={(val: number | undefined) => [formatFCFA(val ?? 0), 'Commissions']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f0ede4', fontSize: 12 }}
                />
                <Line type="monotone" dataKey="commissions" stroke="#C9A84C" strokeWidth={2.5} dot={{ r: 4, fill: '#C9A84C' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {data.top5.length === 0 && data.clients_ce_mois === 0 && (
            <p className="text-center text-dark/40 text-sm py-4">Aucune transaction pour cette période</p>
          )}
        </>
      ) : (
        <p className="text-center text-dark/40 text-sm py-8">Impossible de charger les analytics</p>
      )}
    </div>
  )
}
