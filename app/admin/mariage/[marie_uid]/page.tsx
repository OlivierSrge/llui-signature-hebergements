'use client'
// app/admin/mariage/[marie_uid]/page.tsx
// Dossier complet d'un marié — 3 onglets : Invités / Communications / Journal
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Users, MessageCircle, BookOpen, Send, RefreshCw,
  CheckCircle, Clock, XCircle, AlertTriangle,
  Mail, Gift, RotateCcw, ChevronRight, FileText,
  Calendar, MapPin, Phone, Eye
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────
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

interface JournalEntry {
  id: string
  action: string
  description: string
  type: string
  montant: number | null
  date: string | null
}

interface UserData {
  uid: string
  noms_maries: string
  whatsapp: string
  date_mariage: string | null
  lieu: string
  pack_nom: string
  montant_total: number
  acompte_verse: number
  nb_invites_prevus: number
  grade: string
  contrat_actif: string | null
  code_promo: string
}

interface StatsInvites {
  total: number
  confirmes: number
  declines: number
  silencieux: number
  liens_envoyes: number
}

// ─── Helpers ──────────────────────────────────────────────
function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA' }
function fdate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR')
}
function fdatetime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const TYPE_BADGES: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-700',
  paiement: 'bg-blue-100 text-blue-700',
  contrat: 'bg-purple-100 text-purple-700',
  info: 'bg-beige-100 text-dark/60',
  annulation: 'bg-red-100 text-red-700',
}

const TABS = [
  { id: 'invites', label: 'Invités', icon: Users },
  { id: 'communications', label: 'Communications', icon: MessageCircle },
  { id: 'journal', label: 'Journal', icon: BookOpen },
]

// ─── Composant principal ───────────────────────────────────
export default function DossierMariePage() {
  const params = useParams()
  const marie_uid = params.marie_uid as string

  const [tab, setTab] = useState<'invites' | 'communications' | 'journal'>('invites')
  const [user, setUser] = useState<UserData | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [journal, setJournal] = useState<JournalEntry[]>([])
  const [stats, setStats] = useState<StatsInvites | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [customMessage, setCustomMessage] = useState('')
  const [filterJournal, setFilterJournal] = useState('all')
  const [selectedInvites, setSelectedInvites] = useState<string[]>([])
  const [previewAction, setPreviewAction] = useState<string | null>(null)

  useEffect(() => { loadData() }, [marie_uid])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/dossier-marie?uid=${marie_uid}`)
      if (!res.ok) throw new Error('Erreur chargement')
      const d = await res.json()
      setUser(d.user)
      setInvites(d.invites || [])
      setJournal(d.journal || [])
      setStats(d.stats_invites)
    } catch {
      toast.error('Erreur chargement du dossier')
    } finally {
      setLoading(false)
    }
  }

  async function sendAction(action: string, targetIds?: string[]) {
    setSending(action)
    try {
      const body: Record<string, unknown> = { action, marie_uid }
      if (targetIds && targetIds.length > 0) body.invites = targetIds
      if (customMessage) body.message = customMessage

      const res = await fetch('/api/admin/actions-marie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur envoi')
      toast.success(`${data.success_count}/${data.total} messages envoyés`)
      setPreviewAction(null)
      setSelectedInvites([])
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSending(null)
    }
  }

  function toggleSelectInvite(id: string) {
    setSelectedInvites(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function selectAll(subset: Invite[]) {
    setSelectedInvites(subset.map(i => i.id))
  }

  if (loading) return (
    <div className="p-8 mt-14 lg:mt-0 flex items-center justify-center min-h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-500" />
    </div>
  )

  if (!user) return (
    <div className="p-8 mt-14 lg:mt-0 text-center text-dark/40">Dossier introuvable</div>
  )

  const silencieux = invites.filter(i => i.statut === 'invite' && !i.rsvp_repondu)
  const confirmes = invites.filter(i => i.statut === 'confirme')
  const filteredJournal = filterJournal === 'all'
    ? journal
    : journal.filter(j => j.type === filterJournal)

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <Toaster position="top-right" />

      {/* Header dossier */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-dark/40 mb-2">
          <Link href="/admin/utilisateurs" className="hover:text-gold-500 transition-colors">Utilisateurs</Link>
          <ChevronRight size={12} />
          <span className="text-dark/60">{user.noms_maries}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-dark">{user.noms_maries}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-dark/50">
              <span className="flex items-center gap-1"><Calendar size={13} /> {fdate(user.date_mariage)}</span>
              <span className="flex items-center gap-1"><MapPin size={13} /> {user.lieu || '—'}</span>
              <span className="flex items-center gap-1"><Phone size={13} /> {user.whatsapp}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/contrats/${marie_uid}`}
              className="px-3 py-2 rounded-xl border border-beige-200 text-xs text-dark/60 hover:bg-beige-50 transition-colors flex items-center gap-1.5"
            >
              <FileText size={14} /> Contrat
            </Link>
            <Link
              href={`/admin/invites/${marie_uid}`}
              className="px-3 py-2 rounded-xl border border-beige-200 text-xs text-dark/60 hover:bg-beige-50 transition-colors flex items-center gap-1.5"
            >
              <Users size={14} /> Tableau invités
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs rapides */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total invités', val: stats.total, color: 'text-dark' },
            { label: 'Confirmés', val: stats.confirmes, color: 'text-green-600' },
            { label: 'Déclinés', val: stats.declines, color: 'text-red-500' },
            { label: 'Silencieux', val: stats.silencieux, color: 'text-amber-600' },
            { label: 'Liens envoyés', val: stats.liens_envoyes, color: 'text-blue-600' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white rounded-2xl p-3 border border-beige-200 text-center shadow-sm">
              <p className={`text-xl font-bold ${color}`}>{val}</p>
              <p className="text-xs text-dark/40 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-1 mb-6 bg-beige-100 p-1 rounded-2xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === id ? 'bg-white text-dark shadow-sm' : 'text-dark/50 hover:text-dark'
            }`}
          >
            <Icon size={15} />
            {label}
            {id === 'invites' && stats?.silencieux ? (
              <span className="ml-1 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {stats.silencieux}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ─── ONGLET INVITÉS ─────────────────────────────── */}
      {tab === 'invites' && (
        <div className="space-y-4">
          {/* Actions groupées */}
          <div className="bg-white border border-beige-200 rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-dark mb-4">Actions groupées</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Faire-part */}
              <div className="border border-beige-100 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm text-dark flex items-center gap-1.5"><Mail size={14} className="text-blue-500" /> Faire-part WhatsApp</p>
                    <p className="text-xs text-dark/40 mt-0.5">Envoie le lien invitation personnalisé</p>
                  </div>
                  <span className="text-xs bg-beige-50 px-2 py-0.5 rounded-full text-dark/40">
                    {selectedInvites.length > 0 ? `${selectedInvites.length} sélectionnés` : 'Tous'}
                  </span>
                </div>
                <button
                  onClick={() => sendAction('faire-part', selectedInvites)}
                  disabled={sending === 'faire-part'}
                  className="w-full py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {sending === 'faire-part' ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                  {sending === 'faire-part' ? 'Envoi...' : 'Envoyer faire-part'}
                </button>
              </div>

              {/* Guide Kribi */}
              <div className="border border-beige-100 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm text-dark flex items-center gap-1.5"><MapPin size={14} className="text-green-500" /> Guide Kribi</p>
                    <p className="text-xs text-dark/40 mt-0.5">Aux confirmés uniquement</p>
                  </div>
                  <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">{confirmes.length} confirmés</span>
                </div>
                <button
                  onClick={() => sendAction('guide')}
                  disabled={sending === 'guide' || confirmes.length === 0}
                  className="w-full py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {sending === 'guide' ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                  {sending === 'guide' ? 'Envoi...' : 'Envoyer guide Kribi'}
                </button>
              </div>

              {/* Relance silencieux */}
              <div className="border border-amber-100 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm text-dark flex items-center gap-1.5"><RotateCcw size={14} className="text-amber-500" /> Relancer les silencieux</p>
                    <p className="text-xs text-dark/40 mt-0.5">Invités sans réponse</p>
                  </div>
                  <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">{silencieux.length} silencieux</span>
                </div>
                <button
                  onClick={() => sendAction('relance')}
                  disabled={sending === 'relance' || silencieux.length === 0}
                  className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {sending === 'relance' ? <RefreshCw size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                  {sending === 'relance' ? 'Envoi...' : 'Relancer silencieux'}
                </button>
              </div>

              {/* Carte cadeau */}
              <div className="border border-purple-100 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm text-dark flex items-center gap-1.5"><Gift size={14} className="text-purple-500" /> Carte cadeau post-mariage</p>
                    <p className="text-xs text-dark/40 mt-0.5">Message de remerciement + lien boutique</p>
                  </div>
                </div>
                <button
                  onClick={() => sendAction('carte-cadeau', selectedInvites)}
                  disabled={sending === 'carte-cadeau'}
                  className="w-full py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {sending === 'carte-cadeau' ? <RefreshCw size={12} className="animate-spin" /> : <Gift size={12} />}
                  {sending === 'carte-cadeau' ? 'Envoi...' : 'Envoyer carte cadeau'}
                </button>
              </div>
            </div>
          </div>

          {/* Liste invités */}
          <div className="bg-white border border-beige-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-beige-100 flex items-center justify-between">
              <h2 className="font-semibold text-dark">Liste des invités ({invites.length})</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedInvites([])}
                  className="text-xs text-dark/40 hover:text-dark transition-colors"
                >
                  Désélectionner
                </button>
                <button
                  onClick={() => selectAll(invites)}
                  className="text-xs text-gold-600 hover:text-gold-700 transition-colors"
                >
                  Tout sélectionner
                </button>
              </div>
            </div>

            {invites.length === 0 ? (
              <div className="p-8 text-center text-dark/40 text-sm">Aucun invité enregistré</div>
            ) : (
              <div className="divide-y divide-beige-50">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className={`px-5 py-3 flex items-center gap-3 transition-colors ${
                      selectedInvites.includes(inv.id) ? 'bg-gold-50' : 'hover:bg-beige-50/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedInvites.includes(inv.id)}
                      onChange={() => toggleSelectInvite(inv.id)}
                      className="rounded border-beige-300 accent-gold-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark truncate">{inv.nom}</p>
                      <p className="text-xs text-dark/40 truncate">{inv.telephone}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {inv.statut === 'confirme'
                        ? <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] bg-green-100 text-green-700"><CheckCircle size={9} /> Confirmé</span>
                        : inv.statut === 'decline'
                        ? <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-500"><XCircle size={9} /> Décliné</span>
                        : <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-600"><Clock size={9} /> En attente</span>
                      }
                      {inv.lien_envoye && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Lien envoyé" />}
                      {inv.relance_envoyee && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Relancé" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── ONGLET COMMUNICATIONS ──────────────────────── */}
      {tab === 'communications' && (
        <div className="space-y-4">
          {/* Message personnalisé */}
          <div className="bg-white border border-beige-200 rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-dark mb-3 flex items-center gap-2">
              <MessageCircle size={18} className="text-green-500" /> Envoyer un message personnalisé
            </h2>
            <p className="text-xs text-dark/40 mb-3">
              Variables : {'{prenom}'}, {'{nom}'}, {'{noms_maries}'}, {'{date}'}, {'{lieu}'}
            </p>
            <textarea
              rows={4}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Bonjour {prenom}, au nom de {noms_maries}..."
              className="w-full border border-beige-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300 mb-3"
            />
            <div className="flex gap-3">
              <button
                onClick={() => sendAction('message-custom', selectedInvites)}
                disabled={!customMessage.trim() || sending === 'message-custom'}
                className="px-5 py-2.5 rounded-xl bg-dark text-white text-sm font-medium hover:bg-dark/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {sending === 'message-custom' ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                {sending === 'message-custom' ? 'Envoi...' : `Envoyer ${selectedInvites.length > 0 ? `(${selectedInvites.length} sel.)` : 'à tous'}`}
              </button>
              <button onClick={() => setCustomMessage('')} className="px-4 py-2.5 rounded-xl border border-beige-200 text-sm text-dark/50 hover:bg-beige-50 transition-colors">
                Effacer
              </button>
            </div>
          </div>

          {/* Actions rapides communication */}
          <div className="bg-white border border-beige-200 rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-dark mb-4">Actions de communication rapides</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { action: 'faire-part', label: 'Faire-part', desc: 'Lien invitation WhatsApp', icon: Mail, color: 'blue' },
                { action: 'guide', label: 'Guide Kribi', desc: 'Aux confirmés uniquement', icon: MapPin, color: 'green' },
                { action: 'relance', label: 'Relance silencieux', desc: `${silencieux.length} sans réponse`, icon: RotateCcw, color: 'amber' },
                { action: 'carte-cadeau', label: 'Carte cadeau', desc: 'Post-mariage boutique', icon: Gift, color: 'purple' },
              ].map(({ action, label, desc, icon: Icon, color }) => (
                <button
                  key={action}
                  onClick={() => sendAction(action, selectedInvites)}
                  disabled={!!sending}
                  className={`p-4 rounded-xl border text-left transition-all hover:shadow-sm disabled:opacity-50 ${
                    color === 'blue' ? 'border-blue-100 hover:border-blue-200 hover:bg-blue-50' :
                    color === 'green' ? 'border-green-100 hover:border-green-200 hover:bg-green-50' :
                    color === 'amber' ? 'border-amber-100 hover:border-amber-200 hover:bg-amber-50' :
                    'border-purple-100 hover:border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  <Icon size={18} className={`mb-2 ${
                    color === 'blue' ? 'text-blue-500' :
                    color === 'green' ? 'text-green-500' :
                    color === 'amber' ? 'text-amber-500' :
                    'text-purple-500'
                  }`} />
                  <p className="text-sm font-medium text-dark">{label}</p>
                  <p className="text-xs text-dark/40 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Lien vers templates */}
          <div className="bg-beige-50 border border-beige-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-dark">Templates WhatsApp configurés</p>
              <p className="text-xs text-dark/50">Modifier les modèles de messages globaux</p>
            </div>
            <Link
              href="/admin/templates"
              className="px-4 py-2 rounded-xl border border-beige-200 bg-white text-sm text-dark/60 hover:bg-beige-100 transition-colors flex items-center gap-1.5"
            >
              <MessageCircle size={14} /> Templates
            </Link>
          </div>
        </div>
      )}

      {/* ─── ONGLET JOURNAL ─────────────────────────────── */}
      {tab === 'journal' && (
        <div className="space-y-4">
          {/* Filtres */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'whatsapp', 'paiement', 'contrat', 'info'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterJournal(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  filterJournal === f
                    ? 'bg-dark text-white'
                    : 'bg-white border border-beige-200 text-dark/60 hover:border-dark/20'
                }`}
              >
                {f === 'all' ? 'Tous' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="bg-white border border-beige-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-beige-100">
              <h2 className="font-semibold text-dark">Journal d'activité ({filteredJournal.length})</h2>
            </div>
            {filteredJournal.length === 0 ? (
              <div className="p-8 text-center text-dark/40 text-sm">Aucune entrée dans le journal</div>
            ) : (
              <div className="divide-y divide-beige-50">
                {filteredJournal.map((entry) => (
                  <div key={entry.id} className="px-5 py-3 flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-400 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-dark">{entry.action}</p>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TYPE_BADGES[entry.type] ?? TYPE_BADGES.info}`}>
                          {entry.type}
                        </span>
                        {entry.montant !== null && (
                          <span className="text-xs text-gold-600 font-medium">{fmt(entry.montant)}</span>
                        )}
                      </div>
                      <p className="text-xs text-dark/50 truncate">{entry.description}</p>
                    </div>
                    <p className="text-xs text-dark/30 flex-shrink-0">{fdatetime(entry.date)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
