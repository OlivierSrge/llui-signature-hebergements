'use client'
// app/admin/white-label/page.tsx — #148 White label autres villes
import { useEffect, useState } from 'react'
import { Globe, Plus, CheckCircle, XCircle, RefreshCw, Map, Users, TrendingUp, Edit2, Save } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface Agence {
  agence_id: string
  nom: string
  ville: string
  region: string
  sous_domaine: string
  couleur_primaire: string
  whatsapp_contact: string
  email_contact: string
  actif: boolean
  is_master: boolean
  nb_maries: number
  revenus_total: number
  created_at: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

const EMPTY_FORM = {
  agence_id: '',
  nom: '',
  ville: '',
  region: '',
  sous_domaine: '',
  couleur_primaire: '#C9A84C',
  whatsapp_contact: '',
  email_contact: '',
}

export default function WhiteLabelPage() {
  const [agences, setAgences] = useState<Agence[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/white-label')
      if (res.ok) {
        const d = await res.json()
        setAgences(d.agences || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.agence_id || !form.nom || !form.ville) {
      toast.error('ID, nom et ville requis')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/white-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur création')
      toast.success(`Agence ${form.ville} créée`)
      setShowForm(false)
      setForm(EMPTY_FORM)
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActif(agence_id: string, actif: boolean) {
    setSaving(true)
    try {
      await fetch('/api/admin/white-label', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agence_id, actif: !actif }),
      })
      toast.success(actif ? 'Agence désactivée' : 'Agence activée !')
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit(agence_id: string, updates: Partial<Agence>) {
    setSaving(true)
    try {
      await fetch('/api/admin/white-label', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agence_id, ...updates }),
      })
      toast.success('Agence mise à jour')
      setEditingId(null)
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const totalMaries = agences.reduce((s, a) => s + (a.nb_maries || 0), 0)
  const totalRevenus = agences.reduce((s, a) => s + (a.revenus_total || 0), 0)
  const agencesActives = agences.filter((a) => a.actif).length

  if (loading) return (
    <div className="p-8 mt-14 lg:mt-0 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" /></div>
  )

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <Toaster position="top-right" />

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe size={24} className="text-gold-500" />
          <div>
            <h1 className="font-serif text-3xl font-semibold text-dark">White Label — Expansion Villes</h1>
            <p className="text-dark/50 text-sm">Multi-tenant Firestore · Kribi → Limbe, Bafoussam, Ebolowa</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Nouvelle ville
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {([
          ['Villes', agences.length],
          ['Actives', agencesActives],
          ['Mariages total', totalMaries],
          ['Revenus total', fmt(totalRevenus)],
        ] as [string, string | number][]).map(([label, val]) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-beige-200 shadow-sm">
            <p className="text-xs text-dark/40 mb-1">{label}</p>
            <p className="text-xl font-bold text-dark">{val}</p>
          </div>
        ))}
      </div>

      {/* Architecture Firestore */}
      <div className="bg-beige-50 border border-beige-200 rounded-2xl p-5 mb-6">
        <h2 className="font-semibold text-dark mb-2 flex items-center gap-2">
          <Globe size={16} className="text-gold-500" /> Architecture Multi-tenant
        </h2>
        <div className="font-mono text-xs text-dark/60 space-y-1">
          <p>portail_users/{'{marie_uid}'} → agence_id: "limbe"</p>
          <p>agences_white_label/{'{agence_id}'} → config complète par ville</p>
          <p>Isolation des données par agence_id dans chaque requête Firestore</p>
          <p>Sous-domaine configurable : {'{ville}'}.llui-signature.com</p>
        </div>
      </div>

      {/* Formulaire nouvelle agence */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-beige-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-dark mb-4">Ajouter une ville</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[
              { key: 'agence_id', label: 'ID unique', placeholder: 'ex: douala' },
              { key: 'nom', label: 'Nom agence', placeholder: 'L&Lui Signature Douala' },
              { key: 'ville', label: 'Ville', placeholder: 'Douala' },
              { key: 'region', label: 'Région', placeholder: 'Littoral' },
              { key: 'sous_domaine', label: 'Sous-domaine', placeholder: 'douala' },
              { key: 'email_contact', label: 'Email contact', placeholder: 'douala@llui.com' },
              { key: 'whatsapp_contact', label: 'WhatsApp', placeholder: '+237 6XX XXX XXX' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-dark/50 mb-1 block">{label}</label>
                <input
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full border border-beige-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-dark/50 mb-1 block">Couleur primaire</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.couleur_primaire}
                  onChange={(e) => setForm({ ...form, couleur_primaire: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-beige-200 cursor-pointer"
                />
                <input
                  value={form.couleur_primaire}
                  onChange={(e) => setForm({ ...form, couleur_primaire: e.target.value })}
                  placeholder="#C9A84C"
                  className="flex-1 border border-beige-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-beige-200 text-sm text-dark/60 hover:bg-beige-50 transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl bg-gold-500 text-white text-sm font-medium hover:bg-gold-600 transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? 'Création...' : 'Créer agence'}
            </button>
          </div>
        </form>
      )}

      {/* Grille agences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agences.map((a) => (
          <div key={a.agence_id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${a.actif ? 'border-gold-200' : 'border-beige-200'}`}>
            {/* Bande couleur */}
            <div className="h-2" style={{ backgroundColor: a.couleur_primaire }} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-dark">{a.nom}</h3>
                    {a.is_master && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gold-100 text-gold-700 font-medium">Master</span>}
                  </div>
                  <p className="text-xs text-dark/50">{a.ville}, {a.region}</p>
                </div>
                <div className="flex items-center gap-2">
                  {a.actif
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"><CheckCircle size={10} /> Actif</span>
                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500"><XCircle size={10} /> Inactif</span>
                  }
                  {!a.is_master && (
                    <button
                      onClick={() => handleToggleActif(a.agence_id, a.actif)}
                      disabled={saving}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        a.actif ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {a.actif ? 'Désactiver' : 'Activer'}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                <div className="bg-beige-50 rounded-xl p-2.5">
                  <p className="text-dark/40 mb-0.5">Mariages</p>
                  <p className="font-bold text-dark">{a.nb_maries}</p>
                </div>
                <div className="bg-beige-50 rounded-xl p-2.5">
                  <p className="text-dark/40 mb-0.5">Revenus</p>
                  <p className="font-bold text-dark">{fmt(a.revenus_total)}</p>
                </div>
              </div>

              <div className="text-xs text-dark/40 space-y-0.5">
                <p>Sous-domaine : <code className="text-dark/60">{a.sous_domaine}.llui-signature.com</code></p>
                <p>Email : {a.email_contact}</p>
                {a.whatsapp_contact && <p>WhatsApp : {a.whatsapp_contact}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Guide formation partenaires */}
      <div className="mt-8 bg-dark text-white rounded-2xl p-6">
        <h2 className="font-serif text-xl font-semibold mb-4 flex items-center gap-2">
          <Globe size={20} className="text-gold-400" /> Guide déploiement White Label
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-white/70">
          <div>
            <h3 className="text-white font-medium mb-2">Étape 1 — Créer l'agence</h3>
            <ul className="space-y-1">
              <li>• Créer l'agence dans ce dashboard</li>
              <li>• Configurer sous-domaine DNS</li>
              <li>• Personnaliser couleur & contact</li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-medium mb-2">Étape 2 — Former le partenaire</h3>
            <ul className="space-y-1">
              <li>• Accès admin avec agence_id restreint</li>
              <li>• Formation plateforme (2h en ligne)</li>
              <li>• Compte test fourni par L&Lui Kribi</li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-medium mb-2">Étape 3 — Isolation données</h3>
            <ul className="space-y-1">
              <li>• champ agence_id sur chaque portail_users</li>
              <li>• Requêtes Firestore filtrées par agence_id</li>
              <li>• Reporting séparé par agence</li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-medium mb-2">Étape 4 — Activer</h3>
            <ul className="space-y-1">
              <li>• Basculer statut → Actif</li>
              <li>• Tester avec compte mariage test</li>
              <li>• Lancer la communication locale</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
