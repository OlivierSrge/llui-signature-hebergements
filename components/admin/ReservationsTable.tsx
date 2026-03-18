'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowRight, Trash2, Loader2, AlertTriangle, Handshake } from 'lucide-react'
import { deleteSelectedReservations } from '@/actions/reservations'
import {
  formatDate, formatPrice, getReservationStatusColor, getReservationStatusLabel,
  getPaymentStatusColor, getPaymentStatusLabel,
} from '@/lib/utils'

interface Props {
  reservations: any[]
}

const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

export default function ReservationsTable({ reservations }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmInput, setConfirmInput] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const allIds = reservations.map((r) => r.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allIds))
    }
  }

  const toggleOne = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const handleDelete = () => {
    if (confirmInput !== 'SUPPRIMER') return
    startTransition(async () => {
      const result = await deleteSelectedReservations(Array.from(selected))
      if (result.success) {
        toast.success(`${result.deleted} réservation${result.deleted > 1 ? 's' : ''} supprimée${result.deleted > 1 ? 's' : ''}`)
        setSelected(new Set())
        setShowConfirm(false)
        setConfirmInput('')
        router.refresh()
      } else {
        toast.error(result.error || 'Erreur lors de la suppression')
      }
    })
  }

  return (
    <div>
      {/* Barre d'actions bulk */}
      {someSelected && !showConfirm && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-sm font-medium text-red-800">
            {selected.size} réservation{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Trash2 size={13} /> Supprimer la sélection
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-red-600 hover:underline"
          >
            Annuler
          </button>
        </div>
      )}

      {/* Confirmation */}
      {showConfirm && (
        <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-xl space-y-3">
          <p className="text-sm font-semibold text-red-800">
            ⚠️ Supprimer définitivement {selected.size} réservation{selected.size > 1 ? 's' : ''} ?
          </p>
          <p className="text-xs text-red-600">
            Cette action est irréversible. Tapez <span className="font-mono font-bold">SUPPRIMER</span> pour confirmer.
          </p>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder="SUPPRIMER"
            className="input-field text-sm font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={confirmInput !== 'SUPPRIMER' || isPending}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-40"
            >
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Confirmer la suppression
            </button>
            <button
              onClick={() => { setShowConfirm(false); setConfirmInput('') }}
              className="px-4 py-2 border border-beige-200 rounded-xl text-sm text-dark/50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        {reservations.length === 0 ? (
          <div className="text-center py-16 text-dark/40"><p>Aucune réservation trouvée</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-beige-200 bg-beige-50">
                  <th className="pl-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-beige-300 text-red-500 focus:ring-red-400"
                    />
                  </th>
                  {['Réf.', 'Client', 'Hébergement', 'Dates', 'Total', 'Pipeline', 'Paiement', 'Statut', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-dark/50 font-semibold uppercase tracking-widest last:pr-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservations.map((res) => {
                  const isPaid = res.payment_status === 'paye'
                  const isConfirmed = res.reservation_status === 'confirmee'
                  const step1 = !!res.whatsapp_proposal_sent_at || isPaid || isConfirmed
                  const step2 = !!res.whatsapp_payment_request_sent_at || isPaid || isConfirmed
                  const step3 = isPaid
                  const step4 = !!res.whatsapp_confirmation_sent_at || isConfirmed
                  const isAlert = !!res.whatsapp_payment_request_sent_at && !isPaid && res.whatsapp_payment_request_sent_at < cutoff24h && res.reservation_status !== 'annulee'
                  const isSelected = selected.has(res.id)

                  return (
                    <tr key={res.id} className={`border-b border-beige-100 hover:bg-beige-50 transition-colors ${isAlert ? 'bg-orange-50/50' : ''} ${isSelected ? 'bg-red-50/50' : ''}`}>
                      <td className="pl-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(res.id)}
                          className="rounded border-beige-300 text-red-500 focus:ring-red-400"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-mono text-xs font-bold text-gold-600">#{res.id.slice(-8).toUpperCase()}</p>
                        <p className="text-xs text-dark/40">{formatDate(res.created_at, 'dd/MM/yy')}</p>
                        {(res.source === 'partenaire' || res.source === 'partner_qr') && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">
                            <Handshake size={10} /> {res.source === 'partner_qr' ? 'QR Code' : 'Partenaire'}
                          </span>
                        )}
                        {res.source === 'llui_site' && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-gold-700 bg-gold-50 border border-gold-200 px-1.5 py-0.5 rounded-full">
                            🏠 L&Lui
                          </span>
                        )}
                        {res.source === 'partner_qr' && res.acompteStatus === 'pending' && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
                            ⏳ Acompte en attente
                          </span>
                        )}
                        {isAlert && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
                            <AlertTriangle size={9} /> +24h
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-dark">{res.guest_first_name} {res.guest_last_name}</p>
                        <p className="text-xs text-dark/40">{res.guest_phone}</p>
                      </td>
                      <td className="px-4 py-4 max-w-[130px]">
                        <p className="text-dark/70 truncate">{res.accommodation?.name || res.pack_name || '—'}</p>
                        <p className="text-xs text-dark/40 truncate">{res.accommodation?.partner?.name}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-dark/60">
                        <p>{res.check_in ? formatDate(res.check_in, 'dd/MM/yy') : '—'}</p>
                        <p>{res.check_out ? formatDate(res.check_out, 'dd/MM/yy') : '—'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-dark">{formatPrice(res.total_price)}</p>
                        <p className="text-xs text-gold-600 font-medium">{formatPrice(res.commission_amount)} comm.</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-1">
                          {[step1, step2, step3, step4].map((done, i) => (
                            <div key={i} title={['Proposition', 'Paiement demandé', 'Paiement confirmé', 'Fiche envoyée'][i]}
                              className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center
                              ${done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                              {done ? '✓' : i + 1}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge text-xs ${getPaymentStatusColor(res.payment_status)}`}>{getPaymentStatusLabel(res.payment_status)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge ${getReservationStatusColor(res.reservation_status)}`}>{getReservationStatusLabel(res.reservation_status)}</span>
                      </td>
                      <td className="px-4 pr-6 py-4">
                        <Link href={`/admin/reservations/${res.id}`} className="text-gold-600 hover:text-gold-700 p-1.5 rounded-lg hover:bg-gold-50 transition-colors inline-flex">
                          <ArrowRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
