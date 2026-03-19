'use client'

import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface PointsEntry {
  id: string
  action: string
  description: string
  points: number
  created_at: string
}

interface Props {
  history: PointsEntry[]
  totalPoints: number
  niveau: string
  niveauEmoji: string
  niveauColor: string
  clientName: string
}

const ACTION_LABELS: Record<string, string> = {
  sejour: 'Séjour',
  parrainage: 'Parrainage',
  boutique: 'Boutique',
  bonus: 'Bonus',
  anniversaire: 'Anniversaire',
  anniversaire_sejour: 'Anniversaire séjour',
  premiere_reservation: 'Première réservation',
  paiement_anticipe: 'Paiement anticipé',
  avis: 'Avis',
  manuel: 'Manuel',
  admin: 'Admin',
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'sejour', label: 'Séjour' },
  { value: 'parrainage', label: 'Parrainage' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'anniversaire', label: 'Anniversaire' },
]

function getLast6MonthsChartData(history: PointsEntry[]) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const month = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const pts = history
      .filter((e) => {
        const t = new Date(e.created_at)
        return t >= monthStart && t <= monthEnd && e.points > 0
      })
      .reduce((sum, e) => sum + e.points, 0)
    return { month, points: pts }
  })
}

export default function MonComptePointsFullHistory({
  history,
  totalPoints,
  niveau,
  niveauEmoji,
  niveauColor,
  clientName,
}: Props) {
  const [filter, setFilter] = useState('all')

  const chartData = useMemo(() => getLast6MonthsChartData(history), [history])

  const filtered = useMemo(() => {
    if (filter === 'all') return history
    return history.filter((e) => e.action === filter)
  }, [history, filter])

  // Calculer solde cumulé (du plus récent au plus ancien — reconstruction)
  const withBalance = useMemo(() => {
    // history est déjà en ordre chronologique inversé (plus récent en premier)
    let running = totalPoints
    return filtered.map((entry) => {
      const balance = running
      running -= entry.points
      return { ...entry, balanceAfter: balance }
    })
  }, [filtered, totalPoints])

  return (
    <div className="space-y-6">
      {/* En-tête stats */}
      <div className="bg-white rounded-2xl border border-beige-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-dark/40 font-medium uppercase tracking-wider">{clientName}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-bold text-dark">{totalPoints.toLocaleString('fr-FR')}</span>
              <span className="text-sm text-dark/50">points</span>
            </div>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm"
            style={{ background: `${niveauColor}20`, color: niveauColor }}
          >
            {niveauEmoji} Niveau {niveau}
          </div>
        </div>
      </div>

      {/* Graphique 6 mois */}
      <div className="bg-white rounded-2xl border border-beige-200 p-5">
        <h3 className="text-sm font-semibold text-dark mb-4">Points gagnés — 6 derniers mois</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F0E8" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9E9587' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9E9587' }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #E8DCC8', borderRadius: 12, fontSize: 12 }}
                formatter={(v: number | undefined) => [`${v ?? 0} pts`, 'Points'] as [string, string]}
              />
              <Bar dataKey="points" fill={niveauColor || '#C9A84C'} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filtres + tableau complet */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-beige-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-dark/40 mr-1">Filtrer :</span>
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === opt.value
                  ? 'text-white'
                  : 'bg-beige-50 text-dark/50 hover:bg-beige-100'
              }`}
              style={filter === opt.value ? { background: niveauColor } : undefined}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {withBalance.length === 0 ? (
          <p className="text-sm text-dark/40 text-center py-8">Aucune transaction pour ce filtre.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-beige-100 bg-beige-50/50">
                  <th className="text-left text-xs text-dark/40 font-medium py-2 px-4">Date</th>
                  <th className="text-left text-xs text-dark/40 font-medium py-2 px-4">Action</th>
                  <th className="text-left text-xs text-dark/40 font-medium py-2 px-4 hidden sm:table-cell">Description</th>
                  <th className="text-right text-xs text-dark/40 font-medium py-2 px-4">Points</th>
                  <th className="text-right text-xs text-dark/40 font-medium py-2 px-4 hidden sm:table-cell">Solde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-50">
                {withBalance.map((entry) => (
                  <tr key={entry.id} className="hover:bg-beige-50/30">
                    <td className="py-3 px-4 text-xs text-dark/50 whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 font-medium text-dark/80 whitespace-nowrap">
                      {ACTION_LABELS[entry.action] || entry.action}
                    </td>
                    <td className="py-3 px-4 text-dark/50 hidden sm:table-cell text-xs">
                      {entry.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${entry.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {entry.points >= 0 ? '+' : ''}{entry.points} pts
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-dark/40 hidden sm:table-cell text-xs">
                      {entry.balanceAfter} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
