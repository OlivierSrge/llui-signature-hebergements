'use client'

import { useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import { CheckCircle, XCircle, Inbox, Phone, Mail, CalendarDays, Users } from 'lucide-react'
import { updatePackRequestStatus } from '@/actions/packs'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatEventDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

const STATUS_STYLES: Record<string, string> = {
  nouveau: 'bg-purple-100 text-purple-700',
  traite: 'bg-green-100 text-green-700',
  annule: 'bg-gray-100 text-gray-500',
}
const STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  traite: 'Traité',
  annule: 'Annulé',
}

export default function PackRequestsClient({ requests }: { requests: any[] }) {
  const [items, setItems] = useState(requests)
  const [isPending, startTransition] = useTransition()

  const handleStatus = (id: string, status: 'traite' | 'annule') => {
    startTransition(async () => {
      await updatePackRequestStatus(id, status)
      setItems((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))
      toast.success(status === 'traite' ? 'Marqué comme traité' : 'Demande annulée')
    })
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-beige-200 p-12 text-center">
        <Inbox size={32} className="text-dark/20 mx-auto mb-3" />
        <p className="text-dark/50">Aucune demande pour l&apos;instant.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((req) => (
        <div key={req.id} className="bg-white rounded-2xl border border-beige-200 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-semibold text-dark text-base">
                  {req.first_name} {req.last_name}
                </h3>
                <span className={`badge text-xs px-2.5 py-1 ${STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_LABELS[req.status] || req.status}
                </span>
                {req.promo_code && (
                  <span className="font-mono text-xs font-bold text-gold-600 bg-gold-50 border border-gold-200 px-2.5 py-1 rounded-lg">
                    {req.promo_code}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-gold-600 mt-1">{req.pack_name}</p>
              <p className="text-xs text-dark/40 mt-0.5">{formatDate(req.created_at)}</p>
            </div>

            {req.status === 'nouveau' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatus(req.id, 'traite')}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-green-100 text-green-700 text-xs font-medium rounded-xl hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={14} /> Traité
                </button>
                <button
                  onClick={() => handleStatus(req.id, 'annule')}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 text-red-600 text-xs font-medium rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <XCircle size={14} /> Annuler
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2 text-dark/60">
              <Mail size={13} className="text-gold-500 flex-shrink-0" />
              <a href={`mailto:${req.email}`} className="truncate hover:text-gold-600 transition-colors">{req.email}</a>
            </div>
            <div className="flex items-center gap-2 text-dark/60">
              <Phone size={13} className="text-gold-500 flex-shrink-0" />
              <span>{req.phone}</span>
            </div>
            {req.event_date && (
              <div className="flex items-center gap-2 text-dark/60">
                <CalendarDays size={13} className="text-gold-500 flex-shrink-0" />
                <span>{formatEventDate(req.event_date)}</span>
              </div>
            )}
            {req.guests && (
              <div className="flex items-center gap-2 text-dark/60">
                <Users size={13} className="text-gold-500 flex-shrink-0" />
                <span>{req.guests} personne{req.guests > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {req.message && (
            <div className="mt-4 p-3 bg-beige-50 rounded-xl border border-beige-200">
              <p className="text-xs text-dark/50 font-medium mb-1">Message</p>
              <p className="text-sm text-dark/70">{req.message}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
