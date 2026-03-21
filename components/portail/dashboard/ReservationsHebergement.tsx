'use client'
// BLOC Réservations Hébergements confirmées — dashboard marié

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Reservation {
  id: string
  logement: string
  montant_total: number
  commission_cash: number
  date: string
}

interface Props {
  reservations: Reservation[]
}

export default function ReservationsHebergement({ reservations }: Props) {
  if (reservations.length === 0) return null

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
      <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">🏡 Mes Réservations Hébergements</p>
      <div className="space-y-2">
        {reservations.map(r => (
          <div key={r.id} className="rounded-xl p-3" style={{ background: '#F9F7F2' }}>
            <div className="flex justify-between items-start">
              <p className="text-sm font-semibold text-[#1A1A1A]">{r.logement}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0" style={{ background: '#7C9A7E22', color: '#7C9A7E' }}>Confirmé</span>
            </div>
            <div className="flex justify-between items-center mt-1.5">
              <p className="text-xs text-[#888]">{formatDate(r.date)}</p>
              <div className="text-right">
                <p className="text-xs text-[#888]">{formatFCFA(r.montant_total)}</p>
                <p className="text-xs font-bold" style={{ color: '#C9A84C' }}>+{formatFCFA(r.commission_cash)} cagnotte</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
