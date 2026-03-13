'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: { month: string; label: string; amount: number }[]
}

function formatFCFA(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
  return String(Math.round(n))
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-beige-200 rounded-xl px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold text-dark mb-0.5">{label}</p>
        <p className="text-gold-700 font-bold">
          {new Intl.NumberFormat('fr-FR').format(Math.round(payload[0].value))} FCFA
        </p>
      </div>
    )
  }
  return null
}

export default function PartnerCommissionsChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.amount, 0)
  const hasData = data.some((d) => d.amount > 0)

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-dark text-sm">Commissions — 12 derniers mois</h3>
          <p className="text-xs text-dark/40 mt-0.5">Réservations payées uniquement</p>
        </div>
        {total > 0 && (
          <div className="text-right">
            <p className="text-lg font-bold text-gold-700">
              {new Intl.NumberFormat('fr-FR').format(Math.round(total))}
            </p>
            <p className="text-xs text-dark/40">FCFA total</p>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="py-8 text-center text-dark/30 text-xs">Aucune commission sur les 12 derniers mois</div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F5F0E8" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#1A1A1A80' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#1A1A1A80' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatFCFA}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5F0E820' }} />
            <Bar dataKey="amount" fill="#C9A84C" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
