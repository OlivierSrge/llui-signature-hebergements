'use client'
// components/portail/dashboard/JournalActivite.tsx — #51 Journal d'activité

import { useState, useEffect } from 'react'

interface LogEntry {
  id: string
  action: string
  description: string
  type: string
  montant: number | null
  date: string
}

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (d > 0) return `il y a ${d} jour${d > 1 ? 's' : ''}`
  if (h > 0) return `il y a ${h}h`
  if (m > 0) return `il y a ${m} min`
  return 'à l\'instant'
}

const TYPE_ICONS: Record<string, string> = {
  versement: '💳',
  commission: '💰',
  invite: '👥',
  boutique: '🛍️',
  hebergement: '🏠',
  whatsapp: '📱',
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
}

export default function JournalActivite() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch('/api/portail/journal')
      .then(r => r.json())
      .then(d => setLogs(Array.isArray(d.logs) ? d.logs : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const displayed = expanded ? logs : logs.slice(0, 5)

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">Journal d'activité</p>
        {logs.length > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ background: '#C9A84C' }}>
            {logs.length}
          </span>
        )}
      </div>

      {loading && <p className="text-xs text-[#AAA] text-center py-3">Chargement…</p>}

      {!loading && logs.length === 0 && (
        <p className="text-xs text-[#AAA] text-center py-3">Aucune activité récente</p>
      )}

      {!loading && logs.length > 0 && (
        <div className="space-y-2">
          {displayed.map(log => (
            <div key={log.id} className="flex items-start gap-3 py-2 border-b border-[#F5F0E8] last:border-0">
              <span className="text-base shrink-0 mt-0.5">{TYPE_ICONS[log.type] ?? TYPE_ICONS.info}</span>
              <div className="flex-1 min-w-0">
                {log.action && (
                  <p className="text-xs font-semibold text-[#1A1A1A] truncate">{log.action}</p>
                )}
                {log.description && (
                  <p className="text-[10px] text-[#888] truncate">{log.description}</p>
                )}
                {log.montant !== null && (
                  <p className="text-[10px] font-semibold" style={{ color: '#C9A84C' }}>{formatFCFA(log.montant)}</p>
                )}
              </div>
              <span className="text-[9px] text-[#AAA] shrink-0 mt-0.5">{timeAgo(log.date)}</span>
            </div>
          ))}

          {logs.length > 5 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="w-full text-center text-xs text-[#C9A84C] pt-1"
            >
              {expanded ? '↑ Réduire' : `+ ${logs.length - 5} autres activités`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
