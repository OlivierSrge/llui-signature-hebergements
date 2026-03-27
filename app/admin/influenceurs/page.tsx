'use client'
// app/admin/influenceurs/page.tsx — #165 Tableau de bord influenceurs admin
import { useEffect, useState } from 'react'
import { TrendingUp, Plus, Link2, Copy, CheckCircle, RefreshCw, Users, DollarSign } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface Influenceur {
  id: string
  nom: string
  instagram: string
  tiktok: string
  followers: number
  niche: string
  utm_code: string
  contrats_signes: number
  commission_totale: number
  statut: 'actif' | 'inactif'
  created_at: string
}

interface Demande {
  id: string
  nom: string
  email: string
  instagram: string
  followers: number
  statut: string
  created_at: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

export default function AdminInfluenceursPage() {
  const [influenceurs, setInfluenceurs] = useState<Influenceur[]>([])
  const [demandes, setDemandes] = useState<Demande[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom: '', instagram: '', tiktok: '', followers: '', niche: 'lifestyle', taux_commission: '5' })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [infRes, demRes] = await Promise.all([
        fetch('/api/influenceurs'),
        fetch('/api/admin/demandes-influenceurs').catch(() => ({ ok: false, json: async () => ({ demandes: [] }) } as any)),
      ])
      if (infRes.ok) { const d = await infRes.json(); setInfluenceurs(d.influenceurs || []) }
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/influenceurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, followers: parseInt(form.followers || '0'), taux_commission: parseInt(form.taux_commission) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur création')
      toast.success(`Influenceur créé — Code UTM : ${data.utm_code}`)
      setShowForm(false)
      setForm({ nom: '', instagram: '', tiktok: '', followers: '', niche: 'lifestyle', taux_commission: '5' })
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  function copyLink(utm_code: string) {
    const lien = `https://llui-signature-hebergements.vercel.app/?utm_source=influenceur&utm_medium=social&utm_campaign=${utm_code}`
    navigator.clipboard.writeText(lien)
    toast.success('Lien copié !')
  }

  const totalCommissions = influenceurs.reduce((sum, i) => sum + (i.commission_totale || 0), 0)
  const totalContrats = influenceurs.reduce((sum, i) => sum + (i.contrats_signes || 0), 0)

  if (loading) return (
    <div className="p-8 mt-14 lg:mt-0 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" /></div>
  )

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <Toaster position="top-right" />

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp size={24} className="text-gold-500" />
          <div>
            <h1 className="font-serif text-3xl font-semibold text-dark">Programme Influenceurs</h1>
            <p className="text-dark/50 text-sm">Convention · Liens UTM · Commissions automatiques · Cameroun</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Ajouter influenceur
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {([
          ['Ambassadeurs', influenceurs.length],
          ['Actifs', influenceurs.filter((i) => i.statut === 'actif').length],
          ['Contrats signés', totalContrats],
          ['Commissions dues', fmt(totalCommissions)],
        ] as [string, string | number][]).map(([label, val]) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-beige-200 shadow-sm">
            <p className="text-xs text-dark/40 mb-1">{label}</p>
            <p className="text-xl font-bold text-dark">{val}</p>
          </div>
        ))}
      </div>

      {/* Formulaire */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-beige-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-dark mb-4">Créer un ambassadeur</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[
              { key: 'nom', label: 'Nom', placeholder: 'Christelle A.' },
              { key: 'instagram', label: 'Instagram', placeholder: '@handle' },
              { key: 'tiktok', label: 'TikTok', placeholder: '@handle' },
              { key: 'followers', label: 'Abonnés total', placeholder: '25000' },
              { key: 'taux_commission', label: 'Commission (%)', placeholder: '5' },
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
              <label className="text-xs text-dark/50 mb-1 block">Niche</label>
              <select
                value={form.niche}
                onChange={(e) => setForm({ ...form, niche: e.target.value })}
                className="w-full border border-beige-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
              >
                {['lifestyle', 'mariage', 'famille', 'mode', 'voyage', 'food'].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-beige-200 text-sm text-dark/60 hover:bg-beige-50 transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl bg-gold-500 text-white text-sm font-medium hover:bg-gold-600 transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? 'Création...' : 'Créer & générer lien UTM'}
            </button>
          </div>
        </form>
      )}

      {/* Liste influenceurs */}
      <div className="bg-white border border-beige-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-beige-100">
          <h2 className="font-semibold text-dark">Ambassadeurs ({influenceurs.length})</h2>
        </div>
        {influenceurs.length === 0 ? (
          <div className="p-8 text-center text-dark/40 text-sm">Aucun ambassadeur enregistré</div>
        ) : (
          <div className="divide-y divide-beige-100">
            {influenceurs.map((inf) => (
              <div key={inf.id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-dark">{inf.nom}</p>
                    <p className="text-xs text-dark/50">
                      {inf.instagram && `@${inf.instagram}`}
                      {inf.instagram && inf.tiktok && ' · '}
                      {inf.tiktok && `TikTok: @${inf.tiktok}`}
                      {` · ${new Intl.NumberFormat('fr-FR').format(inf.followers)} abonnés`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-sm font-bold text-dark">{inf.contrats_signes}</p>
                      <p className="text-xs text-dark/40">contrats</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gold-600">{fmt(inf.commission_totale)}</p>
                      <p className="text-xs text-dark/40">commissions</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-beige-50 px-2 py-1 rounded-lg text-dark/60 flex-1 truncate">
                    UTM: {inf.utm_code}
                  </code>
                  <button
                    onClick={() => copyLink(inf.utm_code)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-beige-200 text-xs text-dark/60 hover:bg-beige-50 transition-colors"
                  >
                    <Copy size={12} /> Copier lien
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
