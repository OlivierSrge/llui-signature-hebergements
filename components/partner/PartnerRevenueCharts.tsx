'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts'

const GOLD = '#C9A84C'
const DARK = '#1A1A1A'

function formatFCFA(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}

export interface MonthlyData {
  month: string   // "Jan", "Fév", etc.
  revenue: number
  confirmed: number
}

export function RevenueBarChart({ data }: { data: MonthlyData[] }) {
  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-5">
      <h3 className="font-semibold text-dark text-sm mb-4">Revenus mensuels (FCFA)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0E9D8" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#1A1A1A80' }} />
          <YAxis tickFormatter={formatFCFA} tick={{ fontSize: 11, fill: '#1A1A1A80' }} />
          <Tooltip
            formatter={(v: number) => [`${v.toLocaleString('fr-FR')} FCFA`, 'Revenus']}
            contentStyle={{ borderRadius: 12, border: '1px solid #F0E9D8', fontSize: 12 }}
          />
          <Bar dataKey="revenue" fill={GOLD} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ReservationsLineChart({ data }: { data: MonthlyData[] }) {
  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-5">
      <h3 className="font-semibold text-dark text-sm mb-4">Réservations confirmées / mois</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0E9D8" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#1A1A1A80' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#1A1A1A80' }} />
          <Tooltip
            formatter={(v: number) => [v, 'Confirmées']}
            contentStyle={{ borderRadius: 12, border: '1px solid #F0E9D8', fontSize: 12 }}
          />
          <Line dataKey="confirmed" stroke={DARK} strokeWidth={2} dot={{ r: 3, fill: DARK }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
