'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  Plus, RefreshCw, CheckCircle2, XCircle, Star, ShieldCheck,
  Eye, Trash2, UserCheck, Loader2, Download, ExternalLink,
} from 'lucide-react'

type Tab = 'prestataires' | 'candidatures' | 'bookings'

const CAT_LABELS: Record<string, string> = {
  restauration: 'Restauration', photo_video: 'Photo & Vidéo',
  decoration: 'Décoration', son_animation: 'Son & Animation',
  beaute_bienetre: 'Beauté', experiences: 'Expériences',
  mariage_evenements: 'Mariage',
}

const STATUT_COLORS: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  confirme: 'bg-green-100 text-green-700',
  termine: 'bg-blue-100 text-blue-700',
  annule: 'bg-red-100 text-red-700',
  actif: 'bg-green-100 text-green-700',
  suspendu: 'bg-red-100 text-red-700',
  accepte: 'bg-green-100 text-green-700',
  refuse: 'bg-red-100 text-red-700',
}

function Badge({ statut }: { statut: string }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUT_COLORS[statut] ?? 'bg-gray-100 text-gray-600'}`}>
      {statut.replace(/_/g, ' ')}
    </span>
  )
}

export default function PrestatairesServicesPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('prestataires')
  const [prestataires, setPrestataires] = useState<any[]>([])
  const [candidatures, setCandidatures] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [totalCommissions, setTotalCommissions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, cRes, bRes] = await Promise.all([
        fetch('/api/admin/prestataires-services'),
        fetch('/api/admin/prestataires-services/candidatures'),
        fetch('/api/admin/prestataires-services/bookings'),
      ])
      const [pData, cData, bData] = await Promise.all([pRes.json(), cRes.json(), bRes.json()])
      setPrestataires(pData.prestataires ?? [])
      setCandidatures(cData.candidatures ?? [])
      setBookings(bData.bookings ?? [])
      setTotalCommissions(bData.total_commissions ?? 0)
    } catch {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleToggleStatut = async (p: any) => {
    const newStatut = p.statut === 'actif' ? 'suspendu' : 'actif'
    const res = await fetch('/api/admin/prestataires-services', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, statut: newStatut }),
    })
    if (res.ok) { toast.success(`${p.nom} ${newStatut === 'actif' ? 'activé' : 'suspendu'}`); fetchAll() }
  }

  const handleCertifier = async (p: any) => {
    const res = await fetch('/api/admin/prestataires-services', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, certifie: !p.certifie }),
    })
    if (res.ok) { toast.success(p.certifie ? 'Certification retirée' : 'Certifié ✅'); fetchAll() }
  }

  const handleDelete = async (p: any) => {
    if (!confirm(`Supprimer "${p.nom}" ?`)) return
    const res = await fetch('/api/admin/prestataires-services', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id }),
    })
    if (res.ok) { toast.success('Supprimé'); fetchAll() }
  }

  const handleCandidatureStatut = async (id: string, statut: string, creer = false) => {
    const res = await fetch('/api/admin/prestataires-services/candidatures', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, statut, creer_prestataire: creer }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success(creer ? 'Prestataire créé depuis la candidature ✅' : `Candidature ${statut}`)
      fetchAll()
    } else {
      toast.error(data.error || 'Erreur')
    }
  }

  const handleBookingStatut = async (id: string, statut: string) => {
    const res = await fetch('/api/admin/prestataires-services/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, statut }),
    })
    if (res.ok) { toast.success('Statut mis à jour'); fetchAll() }
  }

  const handleSeed = async () => {
    if (!confirm('Insérer les 5 prestataires test dans Firestore ?')) return
    setSeeding(true)
    const res = await fetch('/api/admin/seed-prestataires', { method: 'POST' })
    const data = await res.json()
    if (data.success) { toast.success(`${data.inserted} prestataires insérés !`); fetchAll() }
    else toast.error(data.error || 'Erreur')
    setSeeding(false)
  }

  const downloadCSV = () => {
    const headers = ['Date', 'Prestataire', 'Service', 'Client', 'Téléphone', 'Montant', 'Commission', 'Statut']
    const rows = bookings.map((b) => [
      b.created_at ? new Date(b.created_at).toLocaleDateString('fr-FR') : '',
      b.prestataire_nom, b.service_titre,
      b.client_prenom, b.client_telephone,
      b.montant_total, b.commission_llui, b.statut,
    ])
    const csv = [headers, ...rows].map((r) => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'bookings-prestataires.csv'; a.click()
  }

  const TAB_BTN = (t: Tab, label: string, count?: number) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'bg-gold-500 text-white' : 'text-dark/60 hover:bg-beige-100'}`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1.5 w-5 h-5 bg-red-500 text-white rounded-full inline-flex items-center justify-center text-[10px] font-bold">{count}</span>
      )}
    </button>
  )

  const pendingCandidatures = candidatures.filter((c) => c.statut === 'en_attente').length

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-dark">Prestataires Services</h1>
          <p className="text-dark/50 text-sm">Annuaire certifié L&amp;Lui — non-hébergeurs</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSeed} disabled={seeding} className="btn-secondary flex items-center gap-2 text-sm">
            {seeding ? <Loader2 size={14} className="animate-spin" /> : '🌟'}
            Importer données test
          </button>
          <a href="/prestataires" target="_blank" className="btn-secondary flex items-center gap-2 text-sm">
            <ExternalLink size={14} /> Voir l&apos;annuaire
          </a>
          <button onClick={fetchAll} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TAB_BTN('prestataires', `Prestataires (${prestataires.length})`)}
        {TAB_BTN('candidatures', 'Candidatures', pendingCandidatures)}
        {TAB_BTN('bookings', 'Réservations')}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gold-500" />
        </div>
      ) : (
        <>
          {/* ══ PRESTATAIRES ══ */}
          {tab === 'prestataires' && (
            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              {prestataires.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">🤝</div>
                  <h3 className="font-serif text-xl text-dark mb-2">Aucun prestataire</h3>
                  <p className="text-dark/50 text-sm mb-4">Importez les données test ou ajoutez manuellement</p>
                  <button onClick={handleSeed} className="btn-primary">🌟 Importer données test</button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-beige-200 bg-beige-50">
                      <th className="text-left px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider">Prestataire</th>
                      <th className="text-left px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider hidden sm:table-cell">Catégorie</th>
                      <th className="text-left px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider hidden md:table-cell">Note</th>
                      <th className="text-left px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider hidden lg:table-cell">Bookings</th>
                      <th className="text-center px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider">Statut</th>
                      <th className="text-right px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-beige-100">
                    {prestataires.map((p) => (
                      <tr key={p.id} className="hover:bg-beige-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium text-dark leading-tight">{p.nom}</p>
                              {p.certifie && (
                                <span className="flex items-center gap-0.5 text-[10px] text-[#085041] mt-0.5">
                                  <ShieldCheck size={9} /> Certifié
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs bg-beige-100 text-dark/70 px-2 py-1 rounded-full">
                            {CAT_LABELS[p.categorie] ?? p.categorie}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-dark/60 text-xs">
                          {p.note_moyenne > 0 ? `★ ${p.note_moyenne.toFixed(1)} (${p.nb_avis})` : '—'}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-dark/60 text-xs">
                          {p.nb_bookings ?? 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge statut={p.statut ?? 'actif'} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <a href={`/prestataires/${p.id}`} target="_blank" className="p-1.5 rounded-lg text-dark/40 hover:text-dark hover:bg-beige-100 transition-colors" title="Voir fiche">
                              <Eye size={14} />
                            </a>
                            <button onClick={() => handleCertifier(p)} className={`p-1.5 rounded-lg transition-colors ${p.certifie ? 'text-[#085041] bg-[#E1F5EE]' : 'text-dark/40 hover:text-dark hover:bg-beige-100'}`} title={p.certifie ? 'Retirer certification' : 'Certifier'}>
                              <ShieldCheck size={14} />
                            </button>
                            <button onClick={() => handleToggleStatut(p)} className={`p-1.5 rounded-lg transition-colors ${p.statut === 'actif' ? 'text-green-600 hover:bg-green-50' : 'text-red-400 hover:bg-red-50'}`} title={p.statut === 'actif' ? 'Suspendre' : 'Activer'}>
                              {p.statut === 'actif' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            </button>
                            <button onClick={() => handleDelete(p)} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Supprimer">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ══ CANDIDATURES ══ */}
          {tab === 'candidatures' && (
            <div className="space-y-4">
              {candidatures.length === 0 ? (
                <div className="bg-white rounded-2xl border border-beige-200 text-center py-16">
                  <div className="text-5xl mb-4">📬</div>
                  <p className="text-dark/50 text-sm">Aucune candidature pour l&apos;instant</p>
                </div>
              ) : candidatures.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl border border-beige-200 p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-dark">{c.nom}</h3>
                        <Badge statut={c.statut} />
                      </div>
                      <p className="text-sm text-dark/60">
                        {CAT_LABELS[c.categorie] ?? c.categorie} · {c.localisation ?? 'Kribi'} · {c.telephone}
                      </p>
                      {c.description && <p className="text-sm text-dark/70 mt-2 leading-relaxed">{c.description}</p>}
                      {c.services_proposes && (
                        <p className="text-xs text-dark/50 mt-1 bg-beige-50 px-3 py-1.5 rounded-lg">{c.services_proposes}</p>
                      )}
                      <p className="text-xs text-dark/40 mt-2">
                        Reçu le {c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : '—'}
                      </p>
                    </div>
                    {c.statut === 'en_attente' && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleCandidatureStatut(c.id, 'accepte', true)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                        >
                          <UserCheck size={14} /> Valider → créer prestataire
                        </button>
                        <button
                          onClick={() => handleCandidatureStatut(c.id, 'refuse')}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          <XCircle size={14} /> Refuser
                        </button>
                        <a
                          href={`https://wa.me/${c.telephone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${c.nom}, nous avons reçu votre candidature sur L&Lui Signature.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                        >
                          📱 WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ BOOKINGS ══ */}
          {tab === 'bookings' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-beige-200 p-4">
                  <p className="text-xs text-dark/50 uppercase tracking-wide mb-1">Total réservations</p>
                  <p className="text-2xl font-bold text-dark">{bookings.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-beige-200 p-4">
                  <p className="text-xs text-dark/50 uppercase tracking-wide mb-1">Commissions totales</p>
                  <p className="text-2xl font-bold" style={{ color: '#C9A84C' }}>
                    {totalCommissions.toLocaleString('fr-FR')} <span className="text-sm font-normal text-dark/50">FCFA</span>
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-beige-200 p-4 col-span-2 sm:col-span-1">
                  <p className="text-xs text-dark/50 uppercase tracking-wide mb-1">En attente</p>
                  <p className="text-2xl font-bold text-dark">
                    {bookings.filter((b) => b.statut === 'en_attente').length}
                  </p>
                </div>
              </div>

              <div className="flex justify-end mb-3">
                <button onClick={downloadCSV} className="btn-secondary flex items-center gap-2 text-sm">
                  <Download size={14} /> Exporter CSV
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
                {bookings.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-dark/50 text-sm">Aucune réservation pour l&apos;instant</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-beige-200 bg-beige-50">
                        <th className="text-left px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider">Date</th>
                        <th className="text-left px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider">Prestataire · Service</th>
                        <th className="text-left px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider hidden sm:table-cell">Client</th>
                        <th className="text-left px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider hidden md:table-cell">Commission</th>
                        <th className="text-center px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider">Statut</th>
                        <th className="text-right px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-beige-100">
                      {bookings.map((b) => (
                        <tr key={b.id} className="hover:bg-beige-50/50 transition-colors">
                          <td className="px-4 py-3 text-dark/60 text-xs">
                            {b.created_at ? new Date(b.created_at).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-dark text-xs">{b.prestataire_nom}</p>
                            <p className="text-dark/50 text-xs">{b.service_titre}</p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-dark/60 text-xs">
                            {b.client_prenom} · {b.client_telephone}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-xs font-semibold" style={{ color: '#C9A84C' }}>
                            {(b.commission_llui ?? 0).toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge statut={b.statut} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <select
                              value={b.statut}
                              onChange={(e) => handleBookingStatut(b.id, e.target.value)}
                              className="text-xs border border-beige-200 rounded-lg px-2 py-1 bg-white"
                            >
                              <option value="en_attente">En attente</option>
                              <option value="confirme">Confirmé</option>
                              <option value="termine">Terminé</option>
                              <option value="annule">Annulé</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
