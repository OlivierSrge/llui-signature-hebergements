'use client'
// app/admin/registre-legal/page.tsx — #128 Registre légal événements Kribi
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { ClipboardList, CheckCircle, AlertCircle, RefreshCw, Bell, Plus, Phone, MapPin, Calendar } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const AUTORISATIONS_TEMPLATE = [
  { id: 'mairie_declaration', label: 'Déclaration en mairie de Kribi', categorie: 'Mairie', valide: false, notes: '' },
  { id: 'mairie_salle', label: 'Autorisation occupation salle des fêtes', categorie: 'Mairie', valide: false, notes: '' },
  { id: 'prefecture_reunions', label: 'Autorisation préfectorale réunion publique', categorie: 'Préfecture', valide: false, notes: '' },
  { id: 'prefecture_securite', label: 'Déclaration sécurité rassemblement >200 personnes', categorie: 'Préfecture', valide: false, notes: '' },
  { id: 'beach_party_autorisation', label: 'Autorisation beach party / espace côtier', categorie: 'Beach Party', valide: false, notes: '' },
  { id: 'beach_party_sonorisation', label: 'Autorisation sonorisation en plein air', categorie: 'Beach Party', valide: false, notes: '' },
  { id: 'police_circulation', label: 'Coordination police pour cortège / circulation', categorie: 'Police', valide: false, notes: '' },
  { id: 'sapeurs_pompiers', label: 'Notification sapeurs-pompiers Kribi', categorie: 'Sécurité', valide: false, notes: '' },
  { id: 'assurance_evenement', label: 'Assurance événement responsabilité civile', categorie: 'Assurance', valide: false, notes: '' },
  { id: 'alcool_vente', label: 'Autorisation vente alcool (si applicable)', categorie: 'Réglementation', valide: false, notes: '' },
]

const CONTACTS_KRIBI = [
  { service: 'Mairie de Kribi', responsable: 'Service des affaires générales', telephone: '+237 222 46 10 XX', adresse: 'Avenue du 20 Mai, Kribi Centre' },
  { service: 'Préfecture du Département de l\'Océan', responsable: 'Bureau du Préfet', telephone: '+237 222 46 XX XX', adresse: 'Kribi, Région du Sud' },
  { service: 'Commissariat Central Kribi', responsable: 'Service ordre public', telephone: '+237 222 46 XX XX', adresse: 'Avenue Independance, Kribi' },
  { service: 'Brigade Sapeurs-Pompiers Kribi', responsable: 'Commandant de brigade', telephone: '+237 222 46 XX XX', adresse: 'Route de Limbe, Kribi' },
  { service: 'Délégation Tourisme & Loisirs', responsable: 'Délégué régional', telephone: '+237 222 46 XX XX', adresse: 'Kribi, Région du Sud' },
]

interface Autorisation {
  id: string
  label: string
  categorie: string
  valide: boolean
  notes: string
}

interface RegistreItem {
  registre_id: string
  marie_uid: string
  noms_maries: string
  date_mariage: string
  lieu: string
  autorisations: Autorisation[]
  date_creation: string
  rappel_j45_envoye: boolean
}

interface MarieListe {
  marie_uid: string
  noms_maries: string
  date_mariage: string
}

export default function RegistreLegalPage() {
  const [registres, setRegistres] = useState<RegistreItem[]>([])
  const [marieListe, setMarieListe] = useState<MarieListe[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedRegistre, setSelectedRegistre] = useState<RegistreItem | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newMarie, setNewMarie] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [regRes, usersRes] = await Promise.all([
        fetch('/api/admin/registre-legal'),
        fetch('/api/admin/utilisateurs'),
      ])
      if (regRes.ok) {
        const d = await regRes.json()
        setRegistres(d.registres || [])
      }
      if (usersRes.ok) {
        const d = await usersRes.json()
        setMarieListe((d.users || []).slice(0, 50))
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!newMarie) { toast.error('Sélectionnez un marié'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/registre-legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marie_uid: newMarie,
          autorisations: AUTORISATIONS_TEMPLATE,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erreur création')
      toast.success(`Registre ${d.registre_id} créé`)
      setShowNewForm(false)
      setNewMarie('')
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleAutorisation(autorisationId: string) {
    if (!selectedRegistre) return
    const updated = selectedRegistre.autorisations.map((a) =>
      a.id === autorisationId ? { ...a, valide: !a.valide } : a
    )
    const newReg = { ...selectedRegistre, autorisations: updated }
    setSelectedRegistre(newReg)
    setRegistres(registres.map((r) => r.registre_id === selectedRegistre.registre_id ? newReg : r))

    await fetch('/api/admin/registre-legal', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registre_id: selectedRegistre.registre_id, autorisations: updated }),
    })
  }

  async function handleRappelJ45() {
    if (!selectedRegistre) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/registre-legal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registre_id: selectedRegistre.registre_id,
          autorisations: selectedRegistre.autorisations,
          envoyer_rappel: true,
        }),
      })
      if (!res.ok) throw new Error('Erreur envoi rappel')
      toast.success('Rappel J-45 envoyé par WhatsApp')
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const categories = AUTORISATIONS_TEMPLATE.map((a) => a.categorie).filter((c, i, arr) => arr.indexOf(c) === i)

  if (loading) return (
    <div className="p-8 mt-14 lg:mt-0 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" /></div>
  )

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <Toaster position="top-right" />

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList size={24} className="text-gold-500" />
          <div>
            <h1 className="font-serif text-3xl font-semibold text-dark">Registre légal — Kribi</h1>
            <p className="text-dark/50 text-sm">Autorisations événementielles · Rappels J-45 · Contacts services locaux</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Nouveau registre
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste registres */}
        <div className="lg:col-span-1">
          {showNewForm && (
            <div className="bg-white border border-beige-200 rounded-2xl p-4 mb-4 shadow-sm">
              <h3 className="font-semibold text-sm text-dark mb-3">Créer un registre</h3>
              <select
                value={newMarie}
                onChange={(e) => setNewMarie(e.target.value)}
                className="w-full border border-beige-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gold-300"
              >
                <option value="">Sélectionner un couple...</option>
                {marieListe.map((m) => (
                  <option key={m.marie_uid} value={m.marie_uid}>{m.noms_maries}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={() => setShowNewForm(false)} className="flex-1 py-2 rounded-xl border border-beige-200 text-xs text-dark/60 hover:bg-beige-50 transition-colors">Annuler</button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-gold-500 text-white text-xs font-medium hover:bg-gold-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {registres.map((r) => {
              const total = r.autorisations?.length || 0
              const done = r.autorisations?.filter((a) => a.valide).length || 0
              const pct = total > 0 ? Math.round((done / total) * 100) : 0
              return (
                <button
                  key={r.registre_id}
                  onClick={() => setSelectedRegistre(r)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selectedRegistre?.registre_id === r.registre_id
                      ? 'border-gold-300 bg-gold-50'
                      : 'border-beige-200 bg-white hover:border-gold-200'
                  }`}
                >
                  <p className="text-sm font-semibold text-dark truncate">{r.noms_maries}</p>
                  <p className="text-xs text-dark/50 mb-2">
                    {r.date_mariage ? new Date(r.date_mariage).toLocaleDateString('fr-FR') : '—'}
                  </p>
                  <div className="w-full bg-beige-200 rounded-full h-1.5 mb-1">
                    <div className="bg-gold-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-dark/40">{done}/{total} autorisations validées</p>
                </button>
              )
            })}
            {registres.length === 0 && (
              <div className="p-6 text-center text-dark/40 text-sm bg-white rounded-2xl border border-beige-200">Aucun registre créé</div>
            )}
          </div>
        </div>

        {/* Détail registre */}
        <div className="lg:col-span-2 space-y-6">
          {selectedRegistre ? (
            <>
              {/* Header */}
              <div className="bg-white border border-beige-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-dark">{selectedRegistre.noms_maries}</h2>
                  <button
                    onClick={handleRappelJ45}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {saving ? <RefreshCw size={12} className="animate-spin" /> : <Bell size={12} />}
                    Envoyer rappel J-45
                  </button>
                </div>
                <div className="flex gap-4 text-xs text-dark/50">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {selectedRegistre.date_mariage ? new Date(selectedRegistre.date_mariage).toLocaleDateString('fr-FR') : '—'}</span>
                  <span className="flex items-center gap-1"><MapPin size={12} /> {selectedRegistre.lieu}</span>
                  {selectedRegistre.rappel_j45_envoye && <span className="text-green-600">Rappel J-45 envoyé</span>}
                </div>
              </div>

              {/* Checklists par catégorie */}
              {categories.map((cat) => {
                const items = (selectedRegistre.autorisations || []).filter((a) => a.categorie === cat)
                if (!items.length) return null
                return (
                  <div key={cat} className="bg-white border border-beige-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-3 bg-beige-50 border-b border-beige-100">
                      <h3 className="text-sm font-semibold text-dark">{cat}</h3>
                    </div>
                    <div className="divide-y divide-beige-50">
                      {items.map((item) => (
                        <div key={item.id} className="px-5 py-3 flex items-center gap-3">
                          <button
                            onClick={() => handleToggleAutorisation(item.id)}
                            className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              item.valide ? 'border-green-500 bg-green-500' : 'border-beige-300'
                            }`}
                          >
                            {item.valide && <CheckCircle size={12} className="text-white" />}
                          </button>
                          <span className={`text-sm flex-1 ${item.valide ? 'text-dark/40 line-through' : 'text-dark'}`}>
                            {item.label}
                          </span>
                          {!item.valide && <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </>
          ) : (
            <div className="bg-white border border-beige-200 rounded-2xl p-12 text-center text-dark/40">
              <ClipboardList size={40} className="mx-auto mb-3 opacity-20" />
              <p>Sélectionnez un registre ou créez-en un nouveau</p>
            </div>
          )}

          {/* Contacts services locaux Kribi */}
          <div className="bg-white border border-beige-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-beige-100">
              <h3 className="font-semibold text-dark flex items-center gap-2"><Phone size={16} className="text-gold-500" /> Contacts services locaux Kribi</h3>
            </div>
            <div className="divide-y divide-beige-50">
              {CONTACTS_KRIBI.map((c) => (
                <div key={c.service} className="px-5 py-3">
                  <p className="text-sm font-medium text-dark">{c.service}</p>
                  <p className="text-xs text-dark/50">{c.responsable}</p>
                  <div className="flex gap-4 mt-1 text-xs text-dark/40">
                    <span className="flex items-center gap-1"><Phone size={10} /> {c.telephone}</span>
                    <span className="flex items-center gap-1"><MapPin size={10} /> {c.adresse}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
