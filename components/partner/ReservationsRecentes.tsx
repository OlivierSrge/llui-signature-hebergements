'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, TrendingUp } from 'lucide-react'

interface Reservation {
  id: string
  guest_first_name: string
  guest_last_name: string
  check_in: string
  check_out: string
  reservation_status: string
  payment_status: string
  check_in_confirmed: boolean
  confirmation_code?: string
  prescripteur_nom?: string
  badge_confiance_prescripteur?: boolean
  // Champs commerciaux
  apporte_par_type?: 'commercial' | 'prescripteur' | 'direct'
  commercial_nom?: string
  accommodation?: { name?: string }
  accommodation_id?: string
  whatsapp_proposal_sent_at?: string
  whatsapp_payment_request_sent_at?: string
  whatsapp_confirmation_sent_at?: string
  source?: string
  created_at?: string
}

interface Props {
  reservations: Reservation[]
}

type Filtre = 'tous' | 'commercial' | 'prescripteur' | 'direct'

const STATUS_LABEL: Record<string, string> = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  annulee: 'Annulée',
}
const STATUS_COLOR: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-800',
  confirmee: 'bg-green-100 text-green-800',
  annulee: 'bg-red-100 text-red-800',
}

function BadgeSource({ r }: { r: Reservation }) {
  const type = r.apporte_par_type

  if (type === 'commercial' && r.commercial_nom) {
    return (
      <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
        👤 <span className="font-medium">{r.commercial_nom}</span>
        <span className="text-blue-400 text-[10px] border border-blue-200 rounded-full px-1.5 py-px bg-blue-50">Commercial</span>
      </p>
    )
  }
  if (type === 'prescripteur' && r.prescripteur_nom) {
    return (
      <p className="text-xs text-gold-600 mt-0.5 flex items-center gap-1">
        🏍 {r.prescripteur_nom}
        {r.badge_confiance_prescripteur && <span className="text-amber-500">🏆</span>}
      </p>
    )
  }
  if (r.prescripteur_nom) {
    return (
      <p className="text-xs text-gold-600 mt-0.5 flex items-center gap-1">
        🏍 {r.prescripteur_nom}
        {r.badge_confiance_prescripteur && <span className="text-amber-500">🏆</span>}
      </p>
    )
  }
  return null
}

export default function ReservationsRecentes({ reservations }: Props) {
  const [filtre, setFiltre] = useState<Filtre>('tous')

  // Stats commerciaux ce mois
  const currentMonth = new Date().toISOString().substring(0, 7)
  const commerciauxCeMois = reservations.filter(
    (r) => r.apporte_par_type === 'commercial' && (r.created_at ?? '').startsWith(currentMonth)
  )
  const prescripteursCeMois = reservations.filter(
    (r) => (r.apporte_par_type === 'prescripteur' || r.prescripteur_nom) && (r.created_at ?? '').startsWith(currentMonth)
  )

  const filtered = reservations.filter((r) => {
    if (filtre === 'tous') return true
    if (filtre === 'commercial') return r.apporte_par_type === 'commercial'
    if (filtre === 'prescripteur') return r.apporte_par_type === 'prescripteur' || (!r.apporte_par_type && r.prescripteur_nom)
    if (filtre === 'direct') return !r.apporte_par_type || r.apporte_par_type === 'direct'
    return true
  })

  const filtres: { key: Filtre; label: string; count: number }[] = [
    { key: 'tous', label: 'Tous', count: reservations.length },
    { key: 'commercial', label: '👤 Commerciaux', count: reservations.filter((r) => r.apporte_par_type === 'commercial').length },
    { key: 'prescripteur', label: '🏍 Moto-taxis', count: reservations.filter((r) => r.apporte_par_type === 'prescripteur' || (!r.apporte_par_type && r.prescripteur_nom)).length },
    { key: 'direct', label: '📱 Directs', count: reservations.filter((r) => !r.apporte_par_type || r.apporte_par_type === 'direct').length },
  ]

  if (reservations.length === 0) return null

  return (
    <div>
      {/* Performance commerciaux ce mois */}
      {(commerciauxCeMois.length > 0 || prescripteursCeMois.length > 0) && (
        <div className="flex gap-3 mb-4">
          {commerciauxCeMois.length > 0 && (
            <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={13} className="text-blue-500" />
                <p className="text-xs font-semibold text-blue-700">Commerciaux ce mois</p>
              </div>
              <p className="text-2xl font-bold text-blue-700">{commerciauxCeMois.length}</p>
              <p className="text-xs text-blue-500">reservation{commerciauxCeMois.length > 1 ? 's' : ''} apportee{commerciauxCeMois.length > 1 ? 's' : ''}</p>
            </div>
          )}
          {prescripteursCeMois.length > 0 && (
            <div className="flex-1 bg-gold-50 border border-gold-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={13} className="text-gold-500" />
                <p className="text-xs font-semibold text-gold-700">Moto-taxis ce mois</p>
              </div>
              <p className="text-2xl font-bold text-gold-700">{prescripteursCeMois.length}</p>
              <p className="text-xs text-gold-500">reservation{prescripteursCeMois.length > 1 ? 's' : ''} apportee{prescripteursCeMois.length > 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-dark text-lg">Mes réservations récentes</h2>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filtres.filter((f) => f.count > 0 || f.key === 'tous').map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltre(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filtre === f.key
                ? 'bg-dark text-white'
                : 'bg-white border border-beige-200 text-dark/60 hover:border-dark/30'
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className={`text-[10px] px-1.5 py-px rounded-full font-bold ${
                filtre === f.key ? 'bg-white/20 text-white' : 'bg-beige-200 text-dark/60'
              }`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-8 text-center text-dark/30 text-sm">
            Aucune reservation dans cette categorie
          </div>
        ) : (
          <div className="divide-y divide-beige-100">
            {filtered.map((r) => {
              const isPaid = r.payment_status === 'paye'
              const isConfirmed = r.reservation_status === 'confirmee'
              const step1 = !!r.whatsapp_proposal_sent_at || r.source === 'partenaire' || r.source === 'commercial' || isPaid || isConfirmed
              const step2 = !!r.whatsapp_payment_request_sent_at || isPaid || isConfirmed
              const step3 = isPaid
              const step4 = !!r.whatsapp_confirmation_sent_at || isConfirmed

              return (
                <Link
                  key={r.id}
                  href={`/partenaire/reservations/${r.id}`}
                  className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-beige-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-dark text-sm truncate">
                      {r.guest_first_name} {r.guest_last_name}
                    </p>
                    <p className="text-xs text-dark/40 mt-0.5">
                      {r.accommodation?.name ?? r.accommodation_id} · {r.check_in} → {r.check_out}
                    </p>
                    <BadgeSource r={r} />
                    {r.confirmation_code && (
                      <p className="text-xs font-mono text-dark/40 mt-0.5">{r.confirmation_code}</p>
                    )}
                  </div>
                  {/* Pipeline steps */}
                  <div className="flex items-center gap-1 flex-shrink-0 self-center">
                    {[step1, step2, step3, step4].map((done, i) => (
                      <div
                        key={i}
                        title={['Proposition envoyée', 'Paiement demandé', 'Paiement confirmé', 'Fiche envoyée'][i]}
                        className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center ${
                          done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {done ? '✓' : i + 1}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.reservation_status] ?? 'bg-beige-100 text-dark/60'}`}>
                      {STATUS_LABEL[r.reservation_status] ?? r.reservation_status}
                    </span>
                    {r.check_in_confirmed && (
                      <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        Arrivée ✓
                      </span>
                    )}
                    <ArrowRight size={13} className="text-dark/20 mt-1" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
