'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Clock, ArrowRight } from 'lucide-react'

export interface AlertReservation {
  id: string
  guest_first_name: string
  guest_last_name: string
  accommodation_name: string
  total_price: number
  whatsapp_payment_request_sent_at: string
  wa_relance_url: string
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}j ${h % 24}h`
  return `${h}h`
}

export default function PaymentRelanceWidget({ alerts }: { alerts: AlertReservation[] }) {
  const [opened, setOpened] = useState<Record<string, boolean>>({})

  if (alerts.length === 0) {
    return (
      <div className="py-8 text-center text-dark/40 text-sm">
        ✅ Aucune relance en attente
      </div>
    )
  }

  return (
    <div className="divide-y divide-beige-100">
      {alerts.map((r) => {
        const elapsed = timeAgo(r.whatsapp_payment_request_sent_at)
        const wasOpened = opened[r.id]
        return (
          <div key={r.id} className="px-5 py-3 flex items-center gap-3 hover:bg-orange-50/30 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-dark text-sm">
                {r.guest_first_name} {r.guest_last_name}
              </p>
              <p className="text-xs text-dark/50 truncate">{r.accommodation_name}</p>
              <p className="text-xs font-semibold text-gold-600 mt-0.5">
                {r.total_price.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-orange-600 flex-shrink-0">
              <Clock size={12} />
              <span className="text-xs font-medium">{elapsed}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!wasOpened ? (
                <a
                  href={r.wa_relance_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpened((p) => ({ ...p, [r.id]: true }))}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                >
                  <MessageCircle size={12} /> Relancer WA
                </a>
              ) : (
                <span className="text-xs text-green-600 font-medium">Envoyé ✓</span>
              )}
              <Link
                href={`/admin/reservations/${r.id}`}
                className="p-1.5 text-dark/30 hover:text-dark/60 transition-colors"
              >
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
