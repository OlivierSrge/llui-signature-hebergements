'use client'

import { useState, useTransition } from 'react'
import { UserPlus, QrCode, RefreshCw, Power, Loader2, X, CheckCircle2 } from 'lucide-react'
import { creerEmploye, toggleStatutEmploye, reinitialiserPinEmploye } from '@/actions/employes'
import type { Employe } from '@/actions/employes'

interface Props {
  partenaireId: string
  employes: Employe[]
}

export default function EmployesSection({ partenaireId, employes: initial }: Props) {
  const [employes, setEmployes] = useState<Employe[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [isPending, startTransition] = useTransition()
  const [nouvelEmploye, setNouvelEmploye] = useState<{ nom: string; pin: string; qr_url: string } | null>(null)
  const [pinReset, setPinReset] = useState<{ id: string; pin: string } | null>(null)
  const [error, setError] = useState('')

  const handleAjouter = () => {
    if (!nom.trim() || !telephone.trim()) { setError('Nom et telephone requis'); return }
    setError('')
    startTransition(async () => {
      const res = await creerEmploye(partenaireId, { nom: nom.trim(), telephone: telephone.trim() })
      if (res.success && res.employe_id) {
        // Recharger la liste via refresh léger
        const doc = await fetch('/api/placeholder', { method: 'HEAD' }).catch(() => null)
        void doc
        const newEmp: Employe = {
          id: res.employe_id,
          partenaire_id: partenaireId,
          nom: nom.trim(),
          telephone: telephone.trim(),
          pin_hash: '',
          qr_code_url: `https://storage.googleapis.com/llui-firebase.appspot.com/employes/qr/${res.employe_id}.png`,
          acces: ['enregistrement'],
          statut: 'actif',
          created_at: new Date().toISOString(),
        }
        setEmployes((prev) => [newEmp, ...prev])
        setNouvelEmploye({ nom: nom.trim(), pin: res.pin!, qr_url: newEmp.qr_code_url })
        setNom(''); setTelephone(''); setShowForm(false)
      } else {
        setError(res.error ?? 'Erreur creation')
      }
    })
  }

  const handleToggle = (emp: Employe) => {
    const nouveau = emp.statut === 'actif' ? 'suspendu' : 'actif'
    startTransition(async () => {
      const res = await toggleStatutEmploye(emp.id, nouveau)
      if (res.success) {
        setEmployes((prev) => prev.map((e) => e.id === emp.id ? { ...e, statut: nouveau } : e))
      }
    })
  }

  const handleResetPin = (emp: Employe) => {
    startTransition(async () => {
      const res = await reinitialiserPinEmploye(emp.id)
      if (res.success && res.nouveau_pin) {
        setPinReset({ id: emp.id, pin: res.nouveau_pin })
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-serif text-lg font-semibold text-dark">Mes Employes</h2>
          <p className="text-dark/40 text-xs mt-0.5">{employes.length} employe{employes.length !== 1 ? 's' : ''} enregistre{employes.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError('') }}
          className="flex items-center gap-2 bg-dark text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-dark/80 transition-all"
        >
          <UserPlus size={15} />
          Ajouter
        </button>
      </div>

      {/* Formulaire ajout */}
      {showForm && (
        <div className="rounded-xl bg-beige-50 border border-beige-200 p-4 mb-5">
          <p className="text-sm font-semibold text-dark mb-3">Nouvel employe</p>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Nom complet"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full border border-beige-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gold-400"
            />
            <input
              type="tel"
              placeholder="Telephone (ex: +23769...)"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full border border-beige-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gold-400"
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleAjouter}
                disabled={isPending}
                className="flex-1 bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-sm py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Ajouter l'employe
              </button>
              <button
                onClick={() => { setShowForm(false); setError('') }}
                className="px-3 rounded-xl bg-white border border-beige-200 text-dark/50 hover:text-dark transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bandeau nouvel employe créé */}
      {nouvelEmploye && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 mb-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-green-600" />
              <p className="text-sm font-semibold text-green-800">Employe cree — SMS envoye !</p>
            </div>
            <button onClick={() => setNouvelEmploye(null)} className="text-green-600/50 hover:text-green-600">
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-green-700 mb-1">Nom : <span className="font-bold">{nouvelEmploye.nom}</span></p>
          <p className="text-xs text-green-700 mb-3">PIN genere : <span className="font-mono font-bold text-sm">{nouvelEmploye.pin}</span></p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={nouvelEmploye.qr_url} alt="QR employe" width={120} height={120} className="rounded-lg border border-green-200" />
        </div>
      )}

      {/* Bandeau PIN reset */}
      {pinReset && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-5 flex items-center justify-between">
          <p className="text-sm text-amber-800">
            Nouveau PIN : <span className="font-mono font-bold text-lg">{pinReset.pin}</span>
            <span className="text-xs text-amber-600 ml-2">(SMS envoye)</span>
          </p>
          <button onClick={() => setPinReset(null)} className="text-amber-500 hover:text-amber-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Liste des employés */}
      {employes.length === 0 ? (
        <div className="text-center py-8 text-dark/30">
          <p className="text-sm">Aucun employe. Ajoutez-en un pour deleguer l'enregistrement des clients.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {employes.map((emp) => (
            <div key={emp.id} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${emp.statut === 'suspendu' ? 'border-beige-200 bg-beige-50 opacity-70' : 'border-beige-200 bg-white'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-dark text-sm truncate">{emp.nom}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emp.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {emp.statut === 'actif' ? 'Actif' : 'Suspendu'}
                  </span>
                </div>
                <p className="text-dark/40 text-xs">{emp.telephone}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {/* Voir QR */}
                <a
                  href={emp.qr_code_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Voir QR"
                  className="p-2 rounded-lg text-dark/40 hover:text-dark hover:bg-beige-100 transition-all"
                >
                  <QrCode size={16} />
                </a>
                {/* Reset PIN */}
                <button
                  onClick={() => handleResetPin(emp)}
                  disabled={isPending}
                  title="Reinitialiser PIN"
                  className="p-2 rounded-lg text-dark/40 hover:text-dark hover:bg-beige-100 transition-all disabled:opacity-40"
                >
                  <RefreshCw size={16} />
                </button>
                {/* Toggle statut */}
                <button
                  onClick={() => handleToggle(emp)}
                  disabled={isPending}
                  title={emp.statut === 'actif' ? 'Suspendre' : 'Reactiver'}
                  className={`p-2 rounded-lg transition-all disabled:opacity-40 ${emp.statut === 'actif' ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-green-500 hover:text-green-700 hover:bg-green-50'}`}
                >
                  <Power size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
