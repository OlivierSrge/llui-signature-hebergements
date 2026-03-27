'use client'
// app/portail-prestataire/page.tsx — #129 Portail prestataires dédié
import { useEffect, useState } from 'react'
import { Camera, Music, ChefHat, Flower2, Star, Calendar, MapPin, Users, CheckCircle, Clock, LogIn, LogOut, RefreshCw } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  photographe: <Camera size={20} />,
  dj: <Music size={20} />,
  traiteur: <ChefHat size={20} />,
  decoration: <Flower2 size={20} />,
  autre: <Star size={20} />,
}

const TYPE_LABELS: Record<string, string> = {
  photographe: 'Photographe',
  dj: 'DJ / Animation',
  traiteur: 'Traiteur',
  decoration: 'Décoration',
  autre: 'Autre prestataire',
}

interface Dossier {
  marie_uid: string
  noms_maries: string
  date_mariage: string
  lieu: string
  nb_invites: number
  statut: string
  brief: string | null
  confirmation: { statut: string; notes: string } | null
}

interface Prestataire {
  id: string
  nom: string
  type: string
  email: string
  telephone: string
  certifie: boolean
}

export default function PortailPrestatairePage() {
  const [prestataire, setPrestataire] = useState<Prestataire | null>(null)
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [loading, setLoading] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/prestataire/dossiers')
      if (res.ok) {
        const d = await res.json()
        setPrestataire(d.prestataire)
        setDossiers(d.dossiers || [])
      } else {
        setPrestataire(null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    try {
      const res = await fetch('/api/prestataire/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur connexion')
      toast.success(`Bienvenue ${data.nom} !`)
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/prestataire/auth', { method: 'DELETE' })
    setPrestataire(null)
    setDossiers([])
  }

  async function handleConfirm(marie_uid: string, confirmation: string) {
    setConfirmLoading(marie_uid)
    try {
      const res = await fetch('/api/prestataire/dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marie_uid, confirmation }),
      })
      if (!res.ok) throw new Error('Erreur confirmation')
      toast.success('Confirmation enregistrée')
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setConfirmLoading(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-beige-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-500" />
    </div>
  )

  // Login form
  if (!prestataire) return (
    <div className="min-h-screen bg-beige-50 flex items-center justify-center p-4">
      <Toaster position="top-right" />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-serif text-2xl font-semibold text-dark">
            L<span className="text-gold-500">&</span>Lui Signature
          </p>
          <p className="text-dark/50 text-sm mt-1">Portail Prestataires Certifiés</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-6 shadow-sm border border-beige-200">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gold-50 flex items-center justify-center">
              <Star size={32} className="text-gold-500" />
            </div>
          </div>
          <h2 className="font-semibold text-dark text-center mb-6">Connexion Prestataire</h2>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs text-dark/50 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-beige-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
                placeholder="votre@email.com"
              />
            </div>
            <div>
              <label className="text-xs text-dark/50 mb-1 block">Code PIN (4-6 chiffres)</label>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                maxLength={6}
                className="w-full border border-beige-200 rounded-xl px-4 py-3 text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-gold-300"
                placeholder="••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loginLoading ? <RefreshCw size={16} className="animate-spin" /> : <LogIn size={16} />}
            {loginLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-xs text-dark/30 mt-4">
          Compte créé par L&Lui Signature. Contact : +237 XXX XXX XXX
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-beige-50">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-dark text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center">
            {TYPE_ICONS[prestataire.type] ?? <Star size={16} />}
          </div>
          <div>
            <p className="font-semibold text-sm">{prestataire.nom}</p>
            <p className="text-white/50 text-xs">{TYPE_LABELS[prestataire.type] ?? prestataire.type}</p>
          </div>
          {prestataire.certifie && (
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gold-500 text-white font-medium">
              <CheckCircle size={10} /> Certifié L&Lui
            </span>
          )}
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors">
          <LogOut size={16} /> Déconnexion
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            ['Dossiers assignés', dossiers.length.toString()],
            ['Confirmés', dossiers.filter((d) => d.confirmation?.statut === 'confirme').length.toString()],
            ['À confirmer', dossiers.filter((d) => !d.confirmation).length.toString()],
          ].map(([label, val]) => (
            <div key={label} className="bg-white rounded-2xl p-4 text-center border border-beige-200 shadow-sm">
              <p className="text-2xl font-bold text-dark">{val}</p>
              <p className="text-xs text-dark/50 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Dossiers */}
        <h2 className="font-semibold text-dark mb-4">Mes dossiers mariages</h2>

        {dossiers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-beige-200 text-dark/40">
            <Calendar size={40} className="mx-auto mb-3 opacity-20" />
            <p>Aucun dossier assigné pour le moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dossiers.map((d) => (
              <div key={d.marie_uid} className="bg-white rounded-2xl p-5 border border-beige-200 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-dark">{d.noms_maries}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-dark/50">
                      <span className="flex items-center gap-1"><Calendar size={11} /> {d.date_mariage ? new Date(d.date_mariage).toLocaleDateString('fr-FR') : '—'}</span>
                      <span className="flex items-center gap-1"><MapPin size={11} /> {d.lieu}</span>
                      <span className="flex items-center gap-1"><Users size={11} /> {d.nb_invites} invités</span>
                    </div>
                  </div>
                  {d.confirmation ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      d.confirmation.statut === 'confirme' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {d.confirmation.statut === 'confirme' ? <CheckCircle size={11} /> : <Clock size={11} />}
                      {d.confirmation.statut === 'confirme' ? 'Confirmé' : 'Indisponible'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700">
                      <Clock size={11} /> En attente
                    </span>
                  )}
                </div>

                {d.brief && (
                  <div className="bg-beige-50 rounded-xl p-3 mb-3 text-sm text-dark/70">
                    <p className="text-xs font-medium text-dark mb-1">Brief L&Lui :</p>
                    {d.brief}
                  </div>
                )}

                {!d.confirmation && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirm(d.marie_uid, 'confirme')}
                      disabled={confirmLoading === d.marie_uid}
                      className="flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle size={14} /> Je confirme ma disponibilité
                    </button>
                    <button
                      onClick={() => handleConfirm(d.marie_uid, 'indisponible')}
                      disabled={confirmLoading === d.marie_uid}
                      className="px-4 py-2 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      Indisponible
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Badge certifié */}
        {prestataire.certifie && (
          <div className="mt-8 bg-gradient-to-r from-gold-500 to-amber-400 rounded-2xl p-5 text-white text-center">
            <CheckCircle size={32} className="mx-auto mb-2" />
            <p className="font-serif text-lg font-semibold">Prestataire Certifié L&Lui</p>
            <p className="text-white/80 text-sm mt-1">Vous faites partie du réseau de partenaires de confiance L&Lui Signature</p>
          </div>
        )}
      </div>
    </div>
  )
}
