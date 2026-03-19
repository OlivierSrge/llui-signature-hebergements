'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { useState } from 'react'

interface ChartData {
  month: string
  points: number
  levelUps: number
}

interface LevelStat {
  niveau: string
  label: string
  emoji: string
  color: string
  count: number
  percent: number
  discountAccommodation: number
  discountBoutique: number
  avgPoints: number
}

interface Props {
  chartData: ChartData[]
  levelStats: LevelStat[]
  levelDistribution: { novice: number; explorateur: number; ambassadeur: number; excellence: number }
  currentYear: number
}

export default function FideliteDashboardCharts({ chartData, levelStats, levelDistribution, currentYear }: Props) {
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const pieData = [
    { name: 'Novice', value: levelDistribution.novice, color: '#A0A0A0' },
    { name: 'Explorateur', value: levelDistribution.explorateur, color: '#4A90D9' },
    { name: 'Ambassadeur', value: levelDistribution.ambassadeur, color: '#C9A84C' },
    { name: 'Excellence', value: levelDistribution.excellence, color: '#1A1A1A' },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Graphique barres doubles */}
      <div className="bg-white rounded-2xl border border-beige-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-dark text-sm">Évolution du programme — {selectedYear}</h3>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs border border-beige-200 rounded-lg px-2 py-1 text-dark/70"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B5E4C' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6B5E4C' }} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #E8E0D4', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="points" name="Points distribués" fill="#C9A84C" radius={[3, 3, 0, 0]} />
            <Bar dataKey="levelUps" name="Passages de niveau" fill="#D4C4A8" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tableau répartition niveaux + mini camembert */}
      <div className="bg-white rounded-2xl border border-beige-200 p-5">
        <h3 className="font-semibold text-dark text-sm mb-4">Répartition par niveau</h3>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mini camembert */}
          {pieData.length > 0 && (
            <div className="flex-shrink-0 flex items-center justify-center">
              <PieChart width={140} height={140}>
                <Pie data={pieData} cx={65} cy={65} innerRadius={40} outerRadius={65} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              </PieChart>
            </div>
          )}
          {/* Tableau */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-beige-100">
                  <th className="text-left text-xs text-dark/40 font-medium pb-2">Niveau</th>
                  <th className="text-right text-xs text-dark/40 font-medium pb-2">Clients</th>
                  <th className="text-right text-xs text-dark/40 font-medium pb-2">%</th>
                  <th className="text-right text-xs text-dark/40 font-medium pb-2 hidden sm:table-cell">Réduc. hébgt</th>
                  <th className="text-right text-xs text-dark/40 font-medium pb-2 hidden sm:table-cell">Réduc. bout.</th>
                  <th className="text-right text-xs text-dark/40 font-medium pb-2">Pts moy.</th>
                </tr>
              </thead>
              <tbody>
                {levelStats.map((l) => (
                  <tr key={l.niveau} className="border-b border-beige-50 last:border-0">
                    <td className="py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: l.color }} />
                        <span className="font-medium text-dark">{l.emoji} {l.label}</span>
                      </span>
                    </td>
                    <td className="text-right font-semibold text-dark">{l.count}</td>
                    <td className="text-right text-dark/60">{l.percent}%</td>
                    <td className="text-right text-dark/60 hidden sm:table-cell">{l.discountAccommodation > 0 ? `${l.discountAccommodation}%` : '—'}</td>
                    <td className="text-right text-dark/60 hidden sm:table-cell">{l.discountBoutique}%</td>
                    <td className="text-right text-dark/60">{l.avgPoints.toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
