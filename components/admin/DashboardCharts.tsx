'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

export interface RevenueDayData {
  label: string
  revenue: number
  commission: number
}

export interface SourceData {
  source: string
  label: string
  count: number
}

const GOLD = '#C9A84C'
const GOLD_DARK = '#8B6914'
const BEIGE_DARK = '#B8A88A'
const COLORS = [GOLD, '#1A1A1A', BEIGE_DARK, '#6B7280']

function formatFCFA(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}

// ── Widget 5 — Revenus 30 jours ───────────────────────────────
export function RevenueChart({ data, totalRevenue, totalCommission }: {
  data: RevenueDayData[]
  totalRevenue: number
  totalCommission: number
}) {
  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-5 h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-semibold text-dark flex items-center gap-2 text-sm">
            📈 Revenus — 30 derniers jours
          </h2>
          <p className="text-xs text-dark/40 mt-0.5">Basé sur les dates de paiement</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-dark">
            {totalRevenue.toLocaleString('fr-FR')} <span className="text-xs font-normal text-dark/40">FCFA</span>
          </p>
          <p className="text-xs text-gold-600 font-medium">
            {totalCommission.toLocaleString('fr-FR')} FCFA commissions
          </p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            tickFormatter={formatFCFA}
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
            width={38}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any, name: any) => [`${Number(v).toLocaleString('fr-FR')} FCFA`, name === 'revenue' ? 'Revenus bruts' : 'Commissions']}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E0D0' }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke={GOLD}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: GOLD }}
          />
          <Line
            type="monotone"
            dataKey="commission"
            stroke={GOLD_DARK}
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 2"
            activeDot={{ r: 3, fill: GOLD_DARK }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 bg-gold-500" />
          <span className="text-xs text-dark/50">Revenus</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 border-t border-dashed border-gold-800" />
          <span className="text-xs text-dark/50">Commissions</span>
        </div>
      </div>
    </div>
  )
}

// ── Widget 8 — Répartition par source ────────────────────────
const RADIAN = Math.PI / 180
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: any) {
  const count = value as number
  if ((percent as number) < 0.08) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {count}
    </text>
  )
}

export function SourcePieChart({ data }: { data: SourceData[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-5 h-full">
      <h2 className="font-semibold text-dark text-sm mb-1">🥧 Réservations par source</h2>
      <p className="text-xs text-dark/40 mb-3">{total} réservations au total</p>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={70}
            labelLine={false}
            label={(props) => <CustomLabel {...props} />}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any, name: any) => [`${Number(v)} (${total > 0 ? Math.round((Number(v) / total) * 100) : 0}%)`, String(name)]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E0D0' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1.5 mt-2">
        {data.map((d, i) => (
          <div key={d.source} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-xs text-dark/70">{d.label}</span>
            </div>
            <span className="text-xs font-bold text-dark">
              {d.count} <span className="text-dark/40 font-normal">({total > 0 ? Math.round((d.count / total) * 100) : 0}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
