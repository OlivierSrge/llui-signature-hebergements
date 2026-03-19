'use client'

import { useState } from 'react'
import { Send, X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { updateNotificationStatus } from '@/actions/fidelite'

interface Notification {
  id: string
  clientId: string
  clientName: string
  clientPhone: string | null
  type: string
  status: string
  message: string
  waUrl: string
  triggeredAt: string
  meta?: Record<string, any>
}

interface Props {
  notifications: Notification[]
}

const TYPE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  level_up: { label: 'Montée de niveau', emoji: '🎉', color: '#C9A84C' },
  expiring_promo: { label: 'Code expirant', emoji: '⏰', color: '#E67E22' },
  birthday: { label: 'Anniversaire', emoji: '🎂', color: '#E91E63' },
  stay_anniversary: { label: 'Anniversaire séjour', emoji: '🌊', color: '#1565C0' },
}

export default function FideliteNotificationsTable({ notifications: initialNotifs }: Props) {
  const [notifs, setNotifs] = useState(initialNotifs)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  async function handleAction(clientId: string, notifId: string, status: 'sent' | 'dismissed') {
    setLoading(notifId)
    const res = await updateNotificationStatus(clientId, notifId, status)
    setLoading(null)
    if (res.success) {
      setNotifs((prev) => prev.filter((n) => n.id !== notifId))
    }
  }

  if (notifs.length === 0) {
    return (
      <p className="text-sm text-dark/40 text-center py-4">
        ✅ Aucune notification en attente d'envoi.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {notifs.map((notif) => {
        const typeInfo = TYPE_LABELS[notif.type] || { label: notif.type, emoji: '📩', color: '#888' }
        const isExpanded = expanded === notif.id

        return (
          <div key={notif.id} className="border border-beige-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-white">
              <span className="text-lg flex-shrink-0">{typeInfo.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-dark truncate">{notif.clientName}</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${typeInfo.color}20`, color: typeInfo.color }}
                  >
                    {typeInfo.label}
                  </span>
                </div>
                <p className="text-xs text-dark/40 mt-0.5">
                  {new Date(notif.triggeredAt).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                  {notif.clientPhone && <span className="ml-2">{notif.clientPhone}</span>}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setExpanded(isExpanded ? null : notif.id)}
                  className="p-1.5 text-dark/30 hover:text-dark rounded-lg hover:bg-beige-50"
                  title="Voir le message"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <a
                  href={notif.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white"
                  style={{ background: '#25D366' }}
                  onClick={() => handleAction(notif.clientId, notif.id, 'sent')}
                >
                  <Send size={11} /> <ExternalLink size={10} />
                </a>
                <button
                  onClick={() => handleAction(notif.clientId, notif.id, 'sent')}
                  disabled={loading === notif.id}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50"
                  title="Marquer comme envoyée"
                >
                  ✅
                </button>
                <button
                  onClick={() => handleAction(notif.clientId, notif.id, 'dismissed')}
                  disabled={loading === notif.id}
                  className="p-1.5 rounded-lg text-dark/30 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                  title="Ignorer"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
            {isExpanded && (
              <div className="px-4 py-3 bg-beige-50 border-t border-beige-100">
                <p className="text-xs text-dark/60 whitespace-pre-line font-mono leading-relaxed">
                  {notif.message}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
