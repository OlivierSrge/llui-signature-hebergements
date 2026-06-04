'use client'

import { useState, useEffect } from 'react'
import { getLoyaltyProgramStats } from '@/actions/loyalty'

export default function LoyaltyStatsTab({ programId }: { programId: string }) {
  const [stats, setStats] = useState<{
    total_cartes: number
    cartes_actives: number
    ca_total: number
    commission_partenaire: number
    points_distribues: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!programId) return
    setLoading(true)
    getLoyaltyProgramStats(programId).then(({ stats: s }) => {
      if (s) setStats(s)
      setLoading(false)
    })
  }, [programId])

  if (loading) return <div className="text-[#F5F0E8]/50 text-center py-8">Chargement...</div>
  if (!stats) return <div className="text-[#F5F0E8]/40 text-center py-8">Aucune donnée</div>

  const kpis = [
    { label: 'Cartes vendues', value: stats.total_cartes, suffix: '', color: 'text-[#C9A84C]' },
    { label: 'Cartes actives', value: stats.cartes_actives, suffix: '', color: 'text-green-400' },
    { label: 'CA généré', value: stats.ca_total.toLocaleString('fr-FR'), suffix: ' FCFA', color: 'text-[#C9A84C]' },
    { label: 'Votre commission', value: stats.commission_partenaire.toLocaleString('fr-FR'), suffix: ' FCFA', color: 'text-emerald-400' },
    { label: 'Points distribués', value: stats.points_distribues.toLocaleString('fr-FR'), suffix: ' pts', color: 'text-purple-400' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="bg-[#0A0A0A] border border-[#C9A84C]/10 rounded-xl p-4"
        >
          <p className="text-[#F5F0E8]/50 text-xs mb-2">{k.label}</p>
          <p className={`text-2xl font-bold ${k.color}`}>
            {k.value}
            <span className="text-sm font-normal">{k.suffix}</span>
          </p>
        </div>
      ))}
    </div>
  )
}
