'use client'

import { useState, useEffect } from 'react'
import { getLoyaltyTransactions } from '@/actions/loyalty'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  ACHAT_CARTE: { label: 'Vente carte', color: 'text-green-400' },
  POINTS_AJOUTES: { label: 'Points', color: 'text-purple-400' },
  RENOUVELLEMENT: { label: 'Renouvellement', color: 'text-blue-400' },
  PAIEMENT: { label: 'Paiement', color: 'text-[#C9A84C]' },
}

function formatDate(ts: any): string {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

export default function LoyaltyHistoryTab({ partenaireId }: { partenaireId: string }) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLoyaltyTransactions(partenaireId).then(({ transactions: t = [] }) => {
      setTransactions(t)
      setLoading(false)
    })
  }, [partenaireId])

  if (loading) return <div className="text-[#F5F0E8]/50 text-center py-8">Chargement...</div>

  if (transactions.length === 0) {
    return (
      <div className="text-[#F5F0E8]/40 text-center py-10">
        Aucune transaction pour le moment.
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-2">
        {transactions.map((t) => {
          const meta = TYPE_LABELS[t.type] ?? { label: t.type, color: 'text-[#F5F0E8]' }
          return (
            <div
              key={t.transaction_id}
              className="bg-[#0A0A0A] border border-[#C9A84C]/10 rounded-lg px-4 py-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[#F5F0E8] text-sm truncate">{t.description}</p>
                <p className="text-[#F5F0E8]/40 text-xs mt-0.5">{formatDate(t.created_at)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                {t.points_ajoutes > 0 && (
                  <p className="text-purple-400 text-xs">+{t.points_ajoutes} pts</p>
                )}
                {t.commission_partner > 0 && (
                  <p className="text-green-400 text-xs">
                    +{t.commission_partner.toLocaleString('fr-FR')} FCFA
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[#F5F0E8]/30 text-xs mt-4 text-right">
        {transactions.length} transaction{transactions.length > 1 ? 's' : ''}
      </p>
    </div>
  )
}
