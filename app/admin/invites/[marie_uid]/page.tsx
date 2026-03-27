'use client'
// app/admin/invites/[marie_uid]/page.tsx
// Tableau complet des invités d'un marié — admin
// Colonnes : Nom / RSVP / Régime / Hébergement / WhatsApp / Statut relance
// Actions individuelles + export CSV
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Users, Search, Download, Send, RotateCcw, RefreshCw,
  CheckCircle, Clock, XCircle, ChevronRight, Phone,
  Filter, ArrowUpDown
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'

interface Invite {
  id: string
  nom: string
  telephone: string
  email: string
  statut: 'invite' | 'confirme' | 'decline'
  rsvp_repondu: boolean
  lien_envoye: boolean
  regime_alimentaire: string
  hebergement: string
  relance_envoyee: boolean
  relance_at: string | null
  created_at: string | null
  total_achats: number
}

interface UserData {
  uid: string
  noms_maries: string
  whatsapp: string
  date_mariage: string | null
}

function fdate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR')
}
function fdatetime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA' }

export default function AdminInvitesPage() {
  const params = useParams()
  const marie_uid = params.marie_uid as string

  const [user, setUser] = useState<UserData | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<'all' | 'invite' | 'confirme' | 'decline'>('all')
  const [sortBy, setSortBy] = useState<'nom' | 'statut' | 'date'>('nom')

  useEffect(() => { loadData() }, [marie_uid])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/dossier-marie?uid=${marie_uid}`)
      if (!res.ok) throw new Error('Erreur chargement')
      const d = await res.json()
      setUser(d.user)
      setInvites(d.invites || [])
    } catch {
      toast.error('Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  async function sendActionToInvite(inviteId: string, action: string) {
    setSending(`${action}-${inviteId}`)
    try {
      const res = await fetch('/api/admin/actions-marie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, marie_uid, invites: [inviteId] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      toast.success(data.success_count > 0 ? 'Message envoyé' : 'Échec envoi')
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSending(null)
    }
  }

  async function sendGroupAction(action: string) {
    const targets = filtered.map(i => i.id)
    setSending(action)
    try {
      const res = await fetch('/api/admin/actions-marie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, marie_uid, invites: targets }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      toast.success(`${data.success_count}/${data.total} messages envoyés`)
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSending(null)
    }
  }

  function exportCSV() {
    const rows = [
      ['Nom', 'Téléphone', 'Email', 'Statut RSVP', 'Régime alimentaire', 'Hébergement', 'Lien envoyé', 'Relancé', 'Date relance', 'Total achats', 'Date ajout'],
      ...filtered.map(i => [
        i.nom,
        i.telephone,
        i.email || '',
        i.statut === 'confirme' ? 'Confirmé' : i.statut === 'decline' ? 'Décliné' : 'En attente',
        i.regime_alimentaire || '',
        i.hebergement || '',
        i.lien_envoye ? 'Oui' : 'Non',
        i.relance_envoyee ? 'Oui' : 'Non',
        fdatetime(i.relance_at),
        i.total_achats.toString(),
        fdate(i.created_at),
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invites_${user?.noms_maries?.replace(/\s+/g, '-') ?? marie_uid}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Filtres + tri
  let filtered = invites.filter(i => {
    const matchSearch = !search || i.nom.toLowerCase().includes(search.toLowerCase()) || i.telephone.includes(search)
    const matchStatut = filterStatut === 'all' || i.statut === filterStatut
    return matchSearch && matchStatut
  })

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'nom') return a.nom.localeCompare(b.nom)
    if (sortBy === 'statut') return a.statut.localeCompare(b.statut)
    if (sortBy === 'date') return (a.created_at ?? '').localeCompare(b.created_at ?? '')
    return 0
  })

  const stats = {
    total: invites.length,
    confirmes: invites.filter(i => i.statut === 'confirme').length,
    declines: invites.filter(i => i.statut === 'decline').length,
    silencieux: invites.filter(i => i.statut === 'invite' && !i.rsvp_repondu).length,
  }

  if (loading) return (
    <div className="p-8 mt-14 lg:mt-0 flex justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" />
    </div>
  )

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <Toaster position="top-right" />

      {/* Breadcrumb + header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-dark/40 mb-2">
          <Link href="/admin/utilisateurs" className="hover:text-gold-500 transition-colors">Utilisateurs</Link>
          <ChevronRight size={12} />
          <Link href={`/admin/mariage/${marie_uid}`} className="hover:text-gold-500 transition-colors">{user?.noms_maries || marie_uid}</Link>
          <ChevronRight size={12} />
          <span className="text-dark/60">Invités</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users size={24} className="text-gold-500" />
            <div>
              <h1 className="font-serif text-2xl font-semibold text-dark">Invités — {user?.noms_maries}</h1>
              <p className="text-dark/50 text-sm">
                {user?.date_mariage ? fdate(user.date_mariage) : '—'}
                {' · '}{invites.length} invités
              </p>
            </div>
          </div>
          <button
            onClick={exportCSV}
            className="px-4 py-2 rounded-xl border border-beige-200 bg-white text-sm text-dark/60 hover:bg-beige-50 transition-colors flex items-center gap-1.5"
          >
            <Download size={15} /> Exporter CSV
          </button>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', val: stats.total, color: 'text-dark', bg: 'bg-beige-50', border: 'border-beige-200', filter: 'all' },
          { label: 'Confirmés', val: stats.confirmes, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', filter: 'confirme' },
          { label: 'Déclinés', val: stats.declines, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', filter: 'decline' },
          { label: 'Silencieux', val: stats.silencieux, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', filter: 'invite' },
        ].map(({ label, val, color, bg, border, filter }) => (
          <button
            key={label}
            onClick={() => setFilterStatut(filter as any)}
            className={`${bg} border ${border} rounded-2xl p-4 text-center transition-all hover:shadow-sm ${filterStatut === filter ? 'ring-2 ring-gold-300' : ''}`}
          >
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-dark/50 mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* Actions groupées */}
      <div className="bg-white border border-beige-200 rounded-2xl p-4 mb-4 shadow-sm flex flex-wrap gap-2 items-center">
        <span className="text-xs text-dark/40 mr-1">Actions sur la sélection filtrée ({filtered.length}) :</span>
        {[
          { action: 'faire-part', label: 'Faire-part', color: 'bg-blue-500 hover:bg-blue-600' },
          { action: 'relance', label: 'Relancer', color: 'bg-amber-500 hover:bg-amber-600' },
          { action: 'carte-cadeau', label: 'Carte cadeau', color: 'bg-purple-500 hover:bg-purple-600' },
        ].map(({ action, label, color }) => (
          <button
            key={action}
            onClick={() => sendGroupAction(action)}
            disabled={!!sending || filtered.length === 0}
            className={`px-3 py-1.5 rounded-xl ${color} text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1`}
          >
            {sending === action ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
            {label}
          </button>
        ))}
      </div>

      {/* Barre de recherche + filtres */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom ou téléphone..."
            className="w-full pl-9 pr-4 py-2.5 border border-beige-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="border border-beige-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
        >
          <option value="nom">Trier par nom</option>
          <option value="statut">Trier par statut</option>
          <option value="date">Trier par date</option>
        </select>
      </div>

      {/* Tableau invités */}
      <div className="bg-white border border-beige-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-beige-50 border-b border-beige-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-dark/50">Nom</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-dark/50">WhatsApp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-dark/50">RSVP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-dark/50">Régime</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-dark/50">Hébergement</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-dark/50">Relance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-dark/50">Achats</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-dark/50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-dark/30 text-sm">
                    {search || filterStatut !== 'all' ? 'Aucun résultat pour ces filtres' : 'Aucun invité'}
                  </td>
                </tr>
              ) : filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-beige-50 hover:bg-beige-50/40 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-dark">{inv.nom}</p>
                    {inv.email && <p className="text-xs text-dark/30 truncate max-w-32">{inv.email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-dark/60 font-mono">{inv.telephone || '—'}</p>
                    {inv.lien_envoye && <span className="text-[10px] text-blue-500">Lien envoyé</span>}
                  </td>
                  <td className="px-4 py-3">
                    {inv.statut === 'confirme'
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700"><CheckCircle size={9} /> Confirmé</span>
                      : inv.statut === 'decline'
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-500"><XCircle size={9} /> Décliné</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-600"><Clock size={9} /> En attente</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-dark/50">{inv.regime_alimentaire || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-dark/50">{inv.hebergement || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    {inv.relance_envoyee
                      ? <div>
                          <span className="text-[10px] text-amber-600 font-medium">Relancé</span>
                          <p className="text-[10px] text-dark/30">{fdatetime(inv.relance_at)}</p>
                        </div>
                      : <span className="text-[10px] text-dark/30">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-dark/50">{inv.total_achats > 0 ? fmt(inv.total_achats) : '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => sendActionToInvite(inv.id, 'faire-part')}
                        disabled={!!sending}
                        title="Envoyer faire-part"
                        className="p-1.5 rounded-lg border border-beige-200 text-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        {sending === `faire-part-${inv.id}` ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                      </button>
                      {inv.statut !== 'confirme' && (
                        <button
                          onClick={() => sendActionToInvite(inv.id, 'relance')}
                          disabled={!!sending}
                          title="Relancer"
                          className="p-1.5 rounded-lg border border-beige-200 text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-50"
                        >
                          {sending === `relance-${inv.id}` ? <RefreshCw size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-beige-100 bg-beige-50 flex items-center justify-between">
          <p className="text-xs text-dark/40">
            {filtered.length} invité{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}
            {search || filterStatut !== 'all' ? ` (filtrés sur ${invites.length} total)` : ''}
          </p>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs text-dark/50 hover:text-gold-600 transition-colors"
          >
            <Download size={12} /> CSV
          </button>
        </div>
      </div>
    </div>
  )
}
