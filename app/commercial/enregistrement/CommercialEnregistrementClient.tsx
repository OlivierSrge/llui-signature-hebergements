'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, User, Phone, Home, Calendar, Users, ChevronRight, AlertCircle } from 'lucide-react'
import { getAccommodationsByPartner, createCommercialReservation } from '@/actions/commerciaux'

interface Logement {
  id: string
  name: string
  price_per_night: number
  commission_rate: number
}

function countNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function tomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export default function CommercialEnregistrementClient() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Session data
  const [commercialId, setCommercialId] = useState('')
  const [commercialNom, setCommercialNom] = useState('')
  const [partenaireId, setPartenaireId] = useState('')

  // Form data
  const [logements, setLogements] = useState<Logement[]>([])
  const [loadingLogements, setLoadingLogements] = useState(true)
  const [selectedLogement, setSelectedLogement] = useState('')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [checkIn, setCheckIn] = useState(today())
  const [checkOut, setCheckOut] = useState(tomorrow())
  const [guests, setGuests] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    const cid = sessionStorage.getItem('commercial_id')
    const cnom = sessionStorage.getItem('commercial_nom')
    const pid = sessionStorage.getItem('commercial_partenaire_id')
    if (!cid || !cnom || !pid) {
      router.replace('/commercial')
      return
    }
    setCommercialId(cid)
    setCommercialNom(cnom)
    setPartenaireId(pid)

    getAccommodationsByPartner(pid)
      .then((l) => {
        setLogements(l)
        if (l.length === 1) setSelectedLogement(l[0].id)
      })
      .catch(() => {})
      .finally(() => setLoadingLogements(false))
  }, [router])

  const nuits = countNights(checkIn, checkOut)
  const logementSelectionne = logements.find((l) => l.id === selectedLogement)
  const montantTotal = logementSelectionne ? logementSelectionne.price_per_night * nuits : 0
  const commissionCommercial = logementSelectionne
    ? Math.round((montantTotal * logementSelectionne.commission_rate) / 100 / 2)
    : 0

  const handleSubmit = () => {
    if (!prenom.trim() || !nom.trim()) { setError('Nom et prénom du client requis'); return }
    if (!selectedLogement) { setError('Selectionnez un logement'); return }
    if (nuits <= 0) { setError('Dates invalides — check-out doit etre apres check-in'); return }
    setError('')

    startTransition(async () => {
      const fd = new FormData()
      fd.append('commercial_id', commercialId)
      fd.append('commercial_nom', commercialNom)
      fd.append('partenaire_id', partenaireId)
      fd.append('accommodation_id', selectedLogement)
      fd.append('check_in', checkIn)
      fd.append('check_out', checkOut)
      fd.append('guests', String(guests))
      fd.append('guest_first_name', prenom.trim())
      fd.append('guest_last_name', nom.trim())
      fd.append('guest_phone', telephone.trim())

      const res = await createCommercialReservation(fd)
      if (res.success) {
        const params = new URLSearchParams({
          code: res.confirmationCode,
          nom: `${prenom} ${nom}`,
          nuits: String(res.nuits),
          montant: String(res.montant),
          logement: logementSelectionne?.name ?? '',
        })
        router.push(`/commercial/succes?${params.toString()}`)
      } else {
        setError(res.error)
      }
    })
  }

  if (loadingLogements) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <Loader2 size={32} className="text-gold-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col">
      {/* Header */}
      <div className="bg-dark text-white px-5 py-4">
        <h1 className="font-serif text-base font-semibold">
          L<span className="text-gold-400">&</span>Lui Signature
        </h1>
        <p className="text-white/50 text-xs mt-0.5">Commercial — {commercialNom}</p>
      </div>

      <div className="flex-1 flex flex-col gap-5 p-5 pb-8">
        <div>
          <h2 className="font-serif text-xl font-semibold text-dark">Nouvel enregistrement</h2>
          <p className="text-dark/50 text-sm mt-0.5">Remplissez les informations du client</p>
        </div>

        {/* Logement */}
        <div className="bg-white rounded-2xl border border-beige-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Home size={16} className="text-gold-500" />
            <p className="font-semibold text-dark text-sm">Logement</p>
          </div>
          {logements.length === 0 ? (
            <p className="text-sm text-dark/40">Aucun logement disponible pour ce partenaire.</p>
          ) : (
            <select
              value={selectedLogement}
              onChange={(e) => setSelectedLogement(e.target.value)}
              className="w-full border border-beige-300 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-gold-400"
            >
              <option value="">-- Selectionnez un logement --</option>
              {logements.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.price_per_night.toLocaleString('fr-FR')} FCFA/nuit
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Dates */}
        <div className="bg-white rounded-2xl border border-beige-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-gold-500" />
            <p className="font-semibold text-dark text-sm">Dates du sejour</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-dark/40 mb-1 block">Arrivee</label>
              <input
                type="date"
                value={checkIn}
                min={today()}
                onChange={(e) => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut('') }}
                className="w-full border border-beige-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-400"
              />
            </div>
            <div>
              <label className="text-xs text-dark/40 mb-1 block">Depart</label>
              <input
                type="date"
                value={checkOut}
                min={checkIn || today()}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full border border-beige-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-400"
              />
            </div>
          </div>
          {nuits > 0 && (
            <p className="text-xs text-dark/50 mt-2">{nuits} nuit{nuits > 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Voyageurs */}
        <div className="bg-white rounded-2xl border border-beige-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-gold-500" />
            <p className="font-semibold text-dark text-sm">Nombre de voyageurs</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setGuests((g) => Math.max(1, g - 1))}
              className="w-10 h-10 rounded-xl bg-beige-100 text-dark font-bold text-lg hover:bg-beige-200 transition-colors"
            >
              –
            </button>
            <span className="text-xl font-bold text-dark w-8 text-center">{guests}</span>
            <button
              onClick={() => setGuests((g) => Math.min(20, g + 1))}
              className="w-10 h-10 rounded-xl bg-beige-100 text-dark font-bold text-lg hover:bg-beige-200 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Client */}
        <div className="bg-white rounded-2xl border border-beige-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <User size={16} className="text-gold-500" />
            <p className="font-semibold text-dark text-sm">Informations du client</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-dark/40 mb-1 block">Prenom *</label>
                <input
                  type="text"
                  placeholder="Jean"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  className="w-full border border-beige-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-400"
                />
              </div>
              <div>
                <label className="text-xs text-dark/40 mb-1 block">Nom *</label>
                <input
                  type="text"
                  placeholder="Dupont"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full border border-beige-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-400"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-dark/40 mb-1 block">
                <Phone size={11} className="inline mr-1" />
                Telephone WhatsApp (optionnel)
              </label>
              <input
                type="tel"
                placeholder="+237 6XX XXX XXX"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full border border-beige-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-400"
              />
            </div>
          </div>
        </div>

        {/* Recap montant */}
        {logementSelectionne && nuits > 0 && (
          <div className="bg-gold-50 border border-gold-200 rounded-2xl p-4">
            <p className="text-xs text-dark/50 mb-2 font-medium">Récapitulatif</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-dark">
                <span>{nuits} nuit{nuits > 1 ? 's' : ''} × {logementSelectionne.price_per_night.toLocaleString('fr-FR')} FCFA</span>
                <span className="font-semibold">{montantTotal.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-gold-700 font-medium">
                <span>Votre commission (50%)</span>
                <span>+{commissionCommercial.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Bouton valider */}
        <button
          onClick={handleSubmit}
          disabled={isPending || logements.length === 0}
          className="w-full py-4 rounded-2xl bg-[#C9A84C] hover:bg-[#b8973f] text-white font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 size={22} className="animate-spin" />
          ) : (
            <>
              Confirmer l&apos;enregistrement
              <ChevronRight size={20} />
            </>
          )}
        </button>

        <button
          onClick={() => router.replace('/commercial')}
          className="text-dark/30 text-sm text-center underline"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
