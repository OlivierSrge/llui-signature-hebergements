'use client'
// app/admin/prestataires-portail/page.tsx — #129 Gestion annuaire prestataires certifiés
import { useEffect, useState } from 'react'
import { Users, Plus, Star, CheckCircle, Camera, Music, ChefHat, Flower2, Trash2, Edit2, RefreshCw, Send, Shield } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const TYPES = [
  { value: 'photographe', label: 'Photographe', icon: Camera },
  { value: 'dj', label: 'DJ / Animation', icon: Music },
  { value: 'traiteur', label: 'Traiteur', icon: ChefHat },
  { value: 'decoration', label: 'Décoration', icon: Flower2 },
  { value: 'autre', label: 'Autre', icon: Star },
]

interface Prestataire {
  id: string
  nom: string
  type: string
  email: string
  telephone: string
  certifie: boolean
  statut: 'actif' | 'suspendu'
  created_at: string
  derniere_connexion: string | null
  specialites: string[]
  tarif_journalier: number
}

const EMPTY_FORM = { nom: '', type: 'photographe', email: '', telephone: '', pin: '', tarif_journalier: '', certifie: false }

export default function PrestatairesPortailPage() {
  const [prestataires, setPrestataires] = useState<Prestataire[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/prestataires')
      if (res.ok) {
        const d = await res.json()
        setPrestataires(d.prestataires || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom || !form.email || !form.pin) {
      toast.error('Nom, email et PIN requis')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/prestataires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tarif_journalier: parseInt(form.tarif_journalier || '0'),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur création')
      toast.success(`Prestataire ${data.id} créé, notification WhatsApp envoyée`)
      setShowForm(false)
      setForm(EMPTY_FORM)
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleCertifie(id: string, certifie: boolean) {
    setSaving(true)
    try {
      await fetch('/api/admin/prestataires', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, certifie: !certifie }),
      })
      toast.success(certifie ? 'Certification retirée' : 'Prestataire certifié !')
      await loadData()
    } catch {
      toast.error('Erreur mise à jour')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatut(id: string, statut: string) {
    const newStatut = statut === 'actif' ? 'suspendu' : 'actif'
    setSaving(true)
    try {
      await fetch('/api/admin/prestataires', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, statut: newStatut }),
      })
      toast.success(`Compte ${newStatut}`)
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, nom: string) {
    if (!confirm(`Supprimer ${nom} ?`)) return
    await fetch('/api/admin/prestataires', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    toast.success('Prestataire supprimé')
    await loadData()
  }

  const typeIcon = (type: string) => {
    const t = TYPES.find((t) => t.value === type)
    return t ? <t.icon size={16} /> : <Star size={16} />
  }

  if (loading) return (
    <div className="p-8 mt-14 lg:mt-0 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" /></div>
  )

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <Toaster position="top-right" />

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-gold-500" />
          <div>
            <h1 className="font-serif text-3xl font-semibold text-dark">Annuaire Prestataires</h1>
            <p className="text-dark/50 text-sm">Photographes, DJ, Traiteurs, Décoration · Badge certifié L&Lui</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Nouveau prestataire
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          ['Total', prestataires.length],
          ['Certifiés', prestataires.filter((p) => p.certifie).length],
          ['Actifs', prestataires.filter((p) => p.statut === 'actif').length],
          ['Connectés', prestataires.filter((p) => p.derniere_connexion).length],
        ].map(([label, val]) => (
          <div key={label as string} className="bg-white rounded-2xl p-4 text-center border border-beige-200 shadow-sm">
            <p className="text-2xl font-bold text-dark">{val}</p>
            <p className="text-xs text-dark/50 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Formulaire création */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-beige-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-dark mb-4">Créer un prestataire</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[
              { key: 'nom', label: 'Nom complet', placeholder: 'ex: Jean Photo Kribi', type: 'text' },
              { key: 'email', label: 'Email', placeholder: 'contact@example.com', type: 'email' },
              { key: 'telephone', label: 'WhatsApp', placeholder: '+237 6XX XXX XXX', type: 'text' },
              { key: 'pin', label: 'PIN connexion (4-6 chiffres)', placeholder: '1234', type: 'text' },
              { key: 'tarif_journalier', label: 'Tarif journalier (FCFA)', placeholder: '150000', type: 'number' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="text-xs text-dark/50 mb-1 block">{label}</label>
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full border border-beige-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-dark/50 mb-1 block">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-beige-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
              >
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="certifie"
              checked={form.certifie}
              onChange={(e) => setForm({ ...form, certifie: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="certifie" className="text-sm text-dark">Certifié L&Lui dès la création</label>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-beige-200 text-sm text-dark/60 hover:bg-beige-50 transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl bg-gold-500 text-white text-sm font-medium hover:bg-gold-600 transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              {saving ? 'Création...' : 'Créer & notifier'}
            </button>
          </div>
        </form>
      )}

      {/* Liste */}
      <div className="bg-white border border-beige-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-beige-100">
          <h2 className="font-semibold text-dark">Prestataires ({prestataires.length})</h2>
        </div>
        {prestataires.length === 0 ? (
          <div className="p-8 text-center text-dark/40 text-sm">Aucun prestataire enregistré</div>
        ) : (
          <div className="divide-y divide-beige-100">
            {prestataires.map((p) => (
              <div key={p.id} className="px-6 py-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  p.statut === 'actif' ? 'bg-gold-50 text-gold-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {typeIcon(p.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-dark">{p.nom}</p>
                    {p.certifie && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-gold-100 text-gold-700 font-medium">
                        <CheckCircle size={9} /> Certifié
                      </span>
                    )}
                    {p.statut === 'suspendu' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-600 font-medium">Suspendu</span>
                    )}
                  </div>
                  <p className="text-xs text-dark/50">{TYPES.find((t) => t.value === p.type)?.label} · {p.email}</p>
                  {p.derniere_connexion && (
                    <p className="text-xs text-green-600">Dernière connexion : {new Date(p.derniere_connexion).toLocaleDateString('fr-FR')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleCertifie(p.id, p.certifie)}
                    disabled={saving}
                    title={p.certifie ? 'Retirer certification' : 'Certifier'}
                    className={`p-2 rounded-lg border transition-colors ${p.certifie ? 'border-gold-300 bg-gold-50 text-gold-600' : 'border-beige-200 text-dark/30 hover:border-gold-200 hover:text-gold-500'}`}
                  >
                    <Shield size={14} />
                  </button>
                  <button
                    onClick={() => handleToggleStatut(p.id, p.statut)}
                    disabled={saving}
                    className={`p-2 rounded-lg border text-xs transition-colors ${p.statut === 'actif' ? 'border-amber-200 text-amber-500 hover:bg-amber-50' : 'border-green-200 text-green-500 hover:bg-green-50'}`}
                    title={p.statut === 'actif' ? 'Suspendre' : 'Réactiver'}
                  >
                    {p.statut === 'actif' ? 'Suspendre' : 'Réactiver'}
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.nom)}
                    className="p-2 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
