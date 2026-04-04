'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Wallet, CheckCircle2, Loader2 } from 'lucide-react'
import { demanderRetrait } from '@/actions/prescripteurs'

type Operateur = 'mtn' | 'orange'

export default function RetraitClient() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [nom, setNom] = useState('')
  const [solde, setSolde] = useState(0)
  const [soldeReserve, setSoldeReserve] = useState(0)
  const [montant, setMontant] = useState('')
  const [operateur, setOperateur] = useState<Operateur>('mtn')
  const [numero, setNumero] = useState('')
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const id = sessionStorage.getItem('prescripteur_uid')
    const n = sessionStorage.getItem('prescripteur_nom')
    if (!id || !n) { router.replace('/prescripteur'); return }
    setUid(id)
    setNom(n)
    const s = parseInt(sessionStorage.getItem('prescripteur_solde') ?? '0', 10)
    const r = parseInt(sessionStorage.getItem('prescripteur_solde_reserve') ?? '0', 10)
    setSolde(s)
    setSoldeReserve(r)
  }, [router])

  const soldeDisponible = solde - soldeReserve

  const handleSubmit = async () => {
    setError('')
    const m = parseInt(montant, 10)
    if (!m || m < 1500) { setError('Montant minimum : 1 500 FCFA'); return }
    if (m > soldeDisponible) { setError(`Solde disponible insuffisant (${soldeDisponible.toLocaleString('fr-FR')} FCFA)`); return }
    const numClean = numero.replace(/\s/g, '')
    if (!numClean || !/^\+?[0-9]{8,15}$/.test(numClean)) { setError('Numéro de téléphone invalide'); return }

    setIsPending(true)
    try {
      const res = await demanderRetrait({
        prescripteur_id: uid,
        montant_fcfa: m,
        operateur,
        numero_mobile_money: numClean,
      })
      if (!res.success) {
        setError(res.error ?? 'Erreur lors de la demande')
      } else {
        // Mettre à jour le solde réservé en session
        sessionStorage.setItem('prescripteur_solde_reserve', String(soldeReserve + m))
        setSoldeReserve((r) => r + m)
        setSuccess(true)
      }
    } finally {
      setIsPending(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 size={42} className="text-green-400" />
        </div>
        <div>
          <p className="text-xl font-semibold text-white">Demande envoyée !</p>
          <p className="text-white/50 text-sm mt-2">
            Votre retrait de{' '}
            <span className="text-gold-300 font-semibold">{parseInt(montant).toLocaleString('fr-FR')} FCFA</span>{' '}
            est en cours de traitement.<br />Délai estimé : 24-48h.
          </p>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-white/60 max-w-xs">
          <p>Un SMS de confirmation vous a été envoyé.</p>
          <p className="mt-1">L'équipe L&Lui vous recontactera.</p>
        </div>
        <button
          onClick={() => router.push('/prescripteur/accueil')}
          className="mt-2 py-3 px-8 rounded-2xl bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-sm active:scale-95 transition-all"
        >
          Retour à l'accueil
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <button onClick={() => router.back()} className="text-white/50 hover:text-white p-1">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-semibold">Retrait Mobile Money</h1>
          <p className="text-white/40 text-xs">{nom}</p>
        </div>
      </div>

      <div className="flex-1 px-5 py-6 space-y-6">
        {/* Solde card */}
        <div className="rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-600/10 border border-gold-400/30 p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Solde total</p>
              <p className="font-serif text-3xl font-semibold text-gold-300">
                {solde.toLocaleString('fr-FR')} <span className="text-xl text-gold-400/70">F</span>
              </p>
            </div>
            {soldeReserve > 0 && (
              <div className="text-right">
                <p className="text-white/30 text-xs mb-0.5">Réservé</p>
                <p className="text-amber-400 text-sm font-semibold">−{soldeReserve.toLocaleString('fr-FR')} F</p>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-white/50 text-xs">Disponible au retrait</p>
            <p className="text-white font-semibold text-lg mt-0.5">
              {soldeDisponible.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Montant */}
          <div>
            <label className="text-white/60 text-sm block mb-2">Montant à retirer (FCFA)</label>
            <input
              type="number"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              min={1500}
              max={soldeDisponible}
              step={500}
              placeholder="ex : 5 000"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white text-lg font-semibold placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
            <p className="text-white/30 text-xs mt-1.5">Minimum : 1 500 FCFA</p>
          </div>

          {/* Opérateur */}
          <div>
            <label className="text-white/60 text-sm block mb-2">Opérateur Mobile Money</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: 'mtn' as Operateur, label: 'MTN MoMo', color: 'border-yellow-400/50 bg-yellow-400/10', activeColor: 'border-yellow-400 bg-yellow-400/20' },
                { id: 'orange' as Operateur, label: 'Orange Money', color: 'border-orange-400/50 bg-orange-400/10', activeColor: 'border-orange-400 bg-orange-400/20' },
              ] as const).map((op) => (
                <button
                  key={op.id}
                  onClick={() => setOperateur(op.id)}
                  className={`py-4 rounded-2xl border-2 font-semibold text-sm transition-all ${operateur === op.id ? op.activeColor + ' text-white' : 'border-white/10 bg-white/5 text-white/50'}`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>

          {/* Numéro */}
          <div>
            <label className="text-white/60 text-sm block mb-2">
              Numéro {operateur === 'mtn' ? 'MTN' : 'Orange'} Mobile Money
            </label>
            <input
              type="tel"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="+237 6XX XXX XXX"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>

          {/* Récapitulatif */}
          {montant && parseInt(montant) >= 1500 && numero && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm space-y-1.5">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Récapitulatif</p>
              <div className="flex justify-between text-white/70">
                <span>Montant</span>
                <span className="font-semibold text-white">{parseInt(montant).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Opérateur</span>
                <span className="font-semibold text-white">{operateur === 'mtn' ? 'MTN MoMo' : 'Orange Money'}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Numéro</span>
                <span className="font-semibold text-white">{numero}</span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3">{error}</p>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pb-8 pt-4 border-t border-white/10">
        <button
          onClick={handleSubmit}
          disabled={isPending || !montant || !numero}
          className="w-full py-4 rounded-2xl bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-base flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-40"
        >
          {isPending
            ? <Loader2 size={20} className="animate-spin" />
            : <Wallet size={20} />
          }
          Demander le retrait
        </button>
      </div>
    </div>
  )
}
