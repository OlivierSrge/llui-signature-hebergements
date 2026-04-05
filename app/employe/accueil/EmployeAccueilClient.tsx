'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Plus, CheckCircle2, Clock, Loader2, RefreshCw } from 'lucide-react'
import { getReservationsDuJour, confirmerPaiementEmploye } from '@/actions/employes'
import type { ReservationResumee } from '@/actions/employes'

export default function EmployeAccueilClient() {
  const router = useRouter()
  const [nom, setNom] = useState('')
  const [partenaireId, setPartenaireId] = useState('')
  const [employe_id, setEmployeId] = useState('')
  const [reservations, setReservations] = useState<ReservationResumee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [confirmee, setConfirmee] = useState<string | null>(null)

  useEffect(() => {
    const n = sessionStorage.getItem('employe_nom')
    const pid = sessionStorage.getItem('employe_partenaire_id')
    const eid = sessionStorage.getItem('employe_id')
    if (!n || !pid || !eid) { router.replace('/employe'); return }
    setNom(n)
    setPartenaireId(pid)
    setEmployeId(eid)
    getReservationsDuJour(pid).then((r) => { setReservations(r); setIsLoading(false) }).catch(() => setIsLoading(false))
  }, [router])

  const handleLogout = () => {
    sessionStorage.removeItem('employe_nom')
    sessionStorage.removeItem('employe_partenaire_id')
    sessionStorage.removeItem('employe_id')
    router.replace('/employe')
  }

  const handleRefresh = () => {
    if (!partenaireId) return
    setIsLoading(true)
    getReservationsDuJour(partenaireId).then((r) => { setReservations(r); setIsLoading(false) }).catch(() => setIsLoading(false))
  }

  const handleConfirmerPaiement = (resa: ReservationResumee) => {
    startTransition(async () => {
      const res = await confirmerPaiementEmploye(resa.id, employe_id, nom)
      if (res.success) {
        setConfirmee(resa.id)
        setReservations((prev) => prev.map((r) => r.id === resa.id ? { ...r, statut_prescription: 'paiement_confirme' } : r))
      }
    })
  }

  const statutLabel = (r: ReservationResumee) => {
    if (r.statut_prescription === 'paiement_confirme' || r.statut_prescription === 'commission_versee') {
      return { text: 'Paiement confirme', color: 'text-green-600 bg-green-50 border-green-200' }
    }
    if (r.statut_prescription === 'disponibilite_confirmee') {
      return { text: 'En attente paiement', color: 'text-amber-600 bg-amber-50 border-amber-200' }
    }
    return { text: 'En cours', color: 'text-blue-600 bg-blue-50 border-blue-200' }
  }

  const peutConfirmerPaiement = (r: ReservationResumee) =>
    r.statut_prescription === 'disponibilite_confirmee' || r.statut_prescription === 'prescripteur_present'

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-dark flex flex-col">
      {/* Header */}
      <div className="bg-dark text-white flex items-center justify-between px-5 py-4">
        <div>
          <h1 className="font-serif text-base font-semibold">
            L<span className="text-gold-400">&</span>Lui Signature
          </h1>
          <p className="text-white/50 text-xs mt-0.5">Mode Employe — {nom}</p>
        </div>
        <button onClick={handleLogout} className="text-white/40 hover:text-white/70 p-2">
          <LogOut size={18} />
        </button>
      </div>

      {/* Badge acces limite */}
      <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-center justify-between">
        <p className="text-amber-700 text-xs font-medium">Acces employe — enregistrement uniquement</p>
        <span className="text-amber-500 text-xs">Acces limite</span>
      </div>

      <div className="flex-1 flex flex-col gap-5 p-5">
        {/* Bouton nouvel enregistrement */}
        <button
          onClick={() => router.push('/partenaire/reservations/nouveau?mode=employe&pid=' + partenaireId)}
          className="w-full py-5 rounded-2xl bg-[#C9A84C] hover:bg-[#b8973f] text-white font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm"
        >
          <Plus size={22} /> Nouvel enregistrement
        </button>

        {/* Réservations du jour */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-base font-semibold text-dark">Reservations du jour</h2>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="text-dark/40 hover:text-dark p-1 transition-all"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="text-[#C9A84C] animate-spin" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="rounded-2xl bg-white border border-beige-200 p-6 text-center">
              <p className="text-dark/40 text-sm">Aucune reservation aujourd'hui</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reservations.map((r) => {
                const statut = statutLabel(r)
                const peutPayer = peutConfirmerPaiement(r)
                return (
                  <div key={r.id} className="rounded-2xl bg-white border border-beige-200 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold text-dark text-sm">
                          {r.guest_first_name} {r.guest_last_name}
                        </p>
                        {r.accommodation_name && (
                          <p className="text-dark/40 text-xs mt-0.5">{r.accommodation_name}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${statut.color}`}>
                        {statut.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-dark/50 mb-3">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>Arrive : {r.check_in}</span>
                      </div>
                      <span>Depart : {r.check_out}</span>
                    </div>

                    {confirmee === r.id ? (
                      <div className="flex items-center gap-2 text-green-600 text-xs font-medium">
                        <CheckCircle2 size={14} />
                        Paiement confirme !
                      </div>
                    ) : peutPayer ? (
                      <button
                        onClick={() => handleConfirmerPaiement(r)}
                        disabled={isPending}
                        className="w-full py-2.5 rounded-xl bg-[#C9A84C] text-white text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Confirmer le paiement
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
