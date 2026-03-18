'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Zap, Home, Smartphone, Loader2 } from 'lucide-react'
import { adminTakeOver, adminDelegateToPartner } from '@/actions/reservation-source'

interface QrReservation {
  id: string
  accommodation?: { name?: string }
  pack_name?: string
  guest_first_name: string
  guest_last_name: string
  sourcePartnerName?: string | null
  check_in?: string
  check_out?: string
  total_price?: number
  acompteAmount?: number | null
  adminWindowEnd?: string | null
}

interface Props {
  reservations: QrReservation[]
}

function Countdown({ endIso }: { endIso: string }) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, Math.floor((new Date(endIso).getTime() - Date.now()) / 1000))
      setRemaining(diff)
    }
    calc()
    const iv = setInterval(calc, 1000)
    return () => clearInterval(iv)
  }, [endIso])

  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  const isUrgent = remaining < 30 * 60

  return (
    <span className={`font-mono font-bold text-lg ${isUrgent ? 'text-red-600' : 'text-amber-700'}`}>
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}

function AlertCard({ res }: { res: QrReservation }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'take' | 'delegate' | null>(null)

  const logement = res.accommodation?.name || res.pack_name || res.id.slice(-8).toUpperCase()

  const handleTakeOver = async () => {
    setLoading('take')
    const result = await adminTakeOver(res.id, 'admin')
    setLoading(null)
    if (result.success) {
      toast.success('Réservation reprise — Flux L&Lui activé')
      router.refresh()
    } else {
      toast.error(result.error || 'Erreur')
    }
  }

  const handleDelegate = async () => {
    setLoading('delegate')
    const result = await adminDelegateToPartner(res.id)
    setLoading(null)
    if (result.success) {
      toast.success('Réservation déléguée au partenaire')
      router.refresh()
    } else {
      toast.error(result.error || 'Erreur')
    }
  }

  return (
    <div className="border border-red-200 bg-red-50 rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Zap size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-800">NOUVELLE RÉSERVATION QR CODE — ACTION REQUISE</p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-red-700">
            <div><span className="font-medium">Logement :</span> {logement}</div>
            <div><span className="font-medium">Partenaire :</span> {res.sourcePartnerName || '—'}</div>
            <div><span className="font-medium">Client :</span> {res.guest_first_name} {res.guest_last_name}</div>
            <div>
              <span className="font-medium">Montant :</span>{' '}
              {res.total_price ? res.total_price.toLocaleString('fr-FR') + ' FCFA' : '—'}
            </div>
            {res.check_in && res.check_out && (
              <div className="col-span-2"><span className="font-medium">Dates :</span> {res.check_in} → {res.check_out}</div>
            )}
          </div>
        </div>
        {res.adminWindowEnd && (
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-red-500 mb-0.5">Temps restant</p>
            <Countdown endIso={res.adminWindowEnd} />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleTakeOver}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-dark text-white rounded-xl text-xs font-medium hover:bg-dark/80 disabled:opacity-50 transition-colors"
        >
          {loading === 'take' ? <Loader2 size={12} className="animate-spin" /> : <Home size={12} />}
          🏠 Traiter moi-même
        </button>
        <button
          onClick={handleDelegate}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-red-200 text-red-700 rounded-xl text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {loading === 'delegate' ? <Loader2 size={12} className="animate-spin" /> : <Smartphone size={12} />}
          📱 Laisser au partenaire
        </button>
      </div>
    </div>
  )
}

export default function AdminWindowAlert({ reservations }: Props) {
  if (!reservations || reservations.length === 0) return null

  return (
    <div className="space-y-3 mb-6">
      {reservations.map((res) => (
        <AlertCard key={res.id} res={res} />
      ))}
    </div>
  )
}
