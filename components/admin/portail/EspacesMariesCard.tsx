'use client'
// components/admin/portail/EspacesMariesCard.tsx
// Card admin — Liste des espaces mariés + accès direct + panneau gestion rapide

import { useState, useEffect } from 'react'

interface VersementItem {
  label: string
  montant: number
  statut: 'en_attente' | 'payé' | 'en_retard'
}

interface Versements {
  v1?: VersementItem
  v2?: VersementItem
  v3?: VersementItem
}

interface Marie {
  uid: string
  noms_maries: string
  code: string
  date_mariage: string
  lieu: string
  cagnotte_cash: number
  cagnotte_credits: number
  budget_total: number
  nb_invites_prevus: number
  versements: Versements | null
  actif: boolean
}

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

function formatDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return iso }
}

const STATUT_COLORS: Record<string, { bg: string; text: string }> = {
  payé:        { bg: '#7C9A7E22', text: '#7C9A7E' },
  en_attente:  { bg: '#C9A84C22', text: '#C9A84C' },
  en_retard:   { bg: '#C0392B22', text: '#C0392B' },
}

function StatutBadge({ statut, onClick }: { statut: string; onClick?: () => void }) {
  const c = STATUT_COLORS[statut] ?? { bg: '#88888822', text: '#888' }
  return (
    <button
      onClick={onClick}
      className="text-[10px] px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-70 transition-opacity"
      style={{ background: c.bg, color: c.text }}
      title="Changer le statut"
    >
      {statut.replace('_', ' ')}
    </button>
  )
}

const STATUTS_CYCLE: Array<'en_attente' | 'payé' | 'en_retard'> = ['en_attente', 'payé', 'en_retard']

function nextStatut(current: string): 'en_attente' | 'payé' | 'en_retard' {
  const idx = STATUTS_CYCLE.indexOf(current as 'en_attente' | 'payé' | 'en_retard')
  return STATUTS_CYCLE[(idx + 1) % STATUTS_CYCLE.length]
}

function PanneauGestionRapide({ marie, onClose, onUpdate }: {
  marie: Marie
  onClose: () => void
  onUpdate: (uid: string, updates: Partial<Marie>) => void
}) {
  const [budget, setBudget] = useState(String(marie.budget_total || 0))
  const [nbInvites, setNbInvites] = useState(String(marie.nb_invites_prevus || 0))
  const [versements, setVersements] = useState<Versements>(marie.versements ?? {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const budgetNum = Number(budget) || 0

  // Recalcul en temps réel des montants
  const v1Montant = Math.round(budgetNum * 0.3)
  const v2Montant = Math.round(budgetNum * 0.4)
  const v3Montant = Math.round(budgetNum * 0.3)

  function cycleStatut(key: 'v1' | 'v2' | 'v3') {
    setVersements(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        statut: nextStatut(prev[key]?.statut ?? 'en_attente'),
      },
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const versementStatuts = {
        v1: versements.v1?.statut,
        v2: versements.v2?.statut,
        v3: versements.v3?.statut,
      }
      await fetch('/api/admin/update-marie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: marie.uid,
          budget_total: budgetNum,
          nb_invites_prevus: Number(nbInvites) || 0,
          versement_statuts: versementStatuts,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onUpdate(marie.uid, {
        budget_total: budgetNum,
        nb_invites_prevus: Number(nbInvites) || 0,
        versements: {
          v1: { label: 'Acompte 30%', montant: v1Montant, statut: versements.v1?.statut ?? 'en_attente' },
          v2: { label: 'Versement 40%', montant: v2Montant, statut: versements.v2?.statut ?? 'en_attente' },
          v3: { label: 'Solde 30%', montant: v3Montant, statut: versements.v3?.statut ?? 'en_attente' },
        },
      })
    } catch {
      alert('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 rounded-2xl p-4 bg-[#FAFAF8] border border-[#C9A84C]/30">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wide">Gestion rapide · {marie.noms_maries}</p>
        <button onClick={onClose} className="text-[#AAA] hover:text-[#666] text-xs">✕ Fermer</button>
      </div>

      {/* Cagnotte actuelle */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 rounded-xl p-3 bg-white border border-[#F5F0E8]">
          <p className="text-[10px] text-[#888] mb-0.5">Cagnotte Cash</p>
          <p className="text-sm font-bold" style={{ color: marie.cagnotte_cash > 0 ? '#C9A84C' : '#AAA' }}>
            {formatFCFA(marie.cagnotte_cash)}
          </p>
        </div>
        <div className="flex-1 rounded-xl p-3 bg-white border border-[#F5F0E8]">
          <p className="text-[10px] text-[#888] mb-0.5">Crédits Services</p>
          <p className="text-sm font-bold" style={{ color: marie.cagnotte_credits > 0 ? '#7C9A7E' : '#AAA' }}>
            {formatFCFA(marie.cagnotte_credits)}
          </p>
        </div>
      </div>

      {/* Budget total */}
      <div className="mb-3">
        <label className="text-[10px] text-[#888] uppercase tracking-wide block mb-1">Budget total (FCFA)</label>
        <input
          type="number"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          value={budget}
          onChange={e => setBudget(e.target.value)}
          placeholder="0"
        />
        {budgetNum > 0 && (
          <p className="text-[10px] text-[#888] mt-1">
            Acompte 30% = {formatFCFA(v1Montant)} · 40% = {formatFCFA(v2Montant)} · Solde 30% = {formatFCFA(v3Montant)}
          </p>
        )}
      </div>

      {/* Nb invités */}
      <div className="mb-3">
        <label className="text-[10px] text-[#888] uppercase tracking-wide block mb-1">Nombre d&apos;invités prévus</label>
        <input
          type="number"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          value={nbInvites}
          onChange={e => setNbInvites(e.target.value)}
          placeholder="0"
        />
      </div>

      {/* Versements — clic pour cycler le statut */}
      {(versements.v1 || versements.v2 || versements.v3) && (
        <div className="mb-3">
          <p className="text-[10px] text-[#888] uppercase tracking-wide mb-2">Versements (cliquer pour changer statut)</p>
          <div className="space-y-1.5">
            {(['v1', 'v2', 'v3'] as const).map(key => {
              const v = versements[key]
              if (!v) return null
              const montant = key === 'v1' ? v1Montant : key === 'v2' ? v2Montant : v3Montant
              return (
                <div key={key} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-[#F5F0E8]">
                  <span className="text-xs">{v.label ?? key}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#888]">
                      {budgetNum > 0 ? formatFCFA(montant) : formatFCFA(v.montant ?? 0)}
                    </span>
                    <StatutBadge statut={v.statut ?? 'en_attente'} onClick={() => cycleStatut(key)} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
        style={{ background: saved ? '#7C9A7E' : '#C9A84C' }}
      >
        {saving ? 'Enregistrement…' : saved ? '✅ Enregistré !' : '💾 Enregistrer les modifications'}
      </button>
    </div>
  )
}

export default function EspacesMariesCard() {
  const [maries, setMaries] = useState<Marie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessingUid, setAccessingUid] = useState<string | null>(null)
  const [panelUid, setPanelUid] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/liste-maries')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setMaries(d.maries ?? [])
      })
      .catch(() => setError('Erreur réseau'))
      .finally(() => setLoading(false))
  }, [])

  async function accederEspace(uid: string) {
    setAccessingUid(uid)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marie_uid: uid }),
      })
      const data = await res.json()
      if (data.error) { alert('Erreur : ' + data.error); return }
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch {
      alert('Erreur réseau')
    } finally {
      setAccessingUid(null)
    }
  }

  function handleUpdate(uid: string, updates: Partial<Marie>) {
    setMaries(prev => prev.map(m => m.uid === uid ? { ...m, ...updates } : m))
  }

  return (
    <div className="bg-white rounded-2xl p-6 border-2 border-[#C9A84C] shadow-sm col-span-1 sm:col-span-2">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center text-xl">💍</div>
        <div>
          <h2 className="font-bold text-[#1A1A1A] text-lg">Espaces Mariés Actifs</h2>
          <p className="text-xs text-[#1A1A1A]/50">Accès direct · Gestion rapide · {maries.length} espace{maries.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading && <p className="text-sm text-[#888] text-center py-4">Chargement…</p>}
      {error && <p className="text-sm text-red-500 text-center py-4">❌ {error}</p>}

      {!loading && !error && maries.length === 0 && (
        <p className="text-sm text-[#AAA] text-center py-4">Aucun espace marié créé</p>
      )}

      {!loading && maries.length > 0 && (
        <div className="space-y-2">
          {maries.map(m => (
            <div key={m.uid}>
              <div
                className={`overflow-x-auto -mx-2 rounded-xl transition-colors ${panelUid === m.uid ? 'bg-[#FFFDF5]' : ''}`}
              >
                <table className="w-full text-sm min-w-[640px]">
                  {m === maries[0] && (
                    <thead>
                      <tr className="border-b border-[#F5F0E8]">
                        <th className="text-left text-[10px] text-[#888] uppercase tracking-wide px-2 py-2 font-semibold">Mariés</th>
                        <th className="text-left text-[10px] text-[#888] uppercase tracking-wide px-2 py-2 font-semibold">Code</th>
                        <th className="text-left text-[10px] text-[#888] uppercase tracking-wide px-2 py-2 font-semibold">Date</th>
                        <th className="text-left text-[10px] text-[#888] uppercase tracking-wide px-2 py-2 font-semibold">Lieu</th>
                        <th className="text-right text-[10px] text-[#888] uppercase tracking-wide px-2 py-2 font-semibold">Cagnotte</th>
                        <th className="text-right text-[10px] text-[#888] uppercase tracking-wide px-2 py-2 font-semibold">Budget</th>
                        <th className="text-center text-[10px] text-[#888] uppercase tracking-wide px-2 py-2 font-semibold">Statut</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    <tr className="border-b border-[#F5F0E8] last:border-0 hover:bg-[#FAFAF8] transition-colors">
                      <td className="px-2 py-3">
                        <p className="font-semibold text-[#1A1A1A] text-sm leading-tight">{m.noms_maries || '—'}</p>
                        <p className="text-[10px] text-[#AAA] truncate max-w-[140px]">{m.uid}</p>
                      </td>
                      <td className="px-2 py-3">
                        <code className="text-xs bg-[#F5F0E8] px-1.5 py-0.5 rounded font-mono">{m.code || '—'}</code>
                      </td>
                      <td className="px-2 py-3 text-xs text-[#555] whitespace-nowrap">{formatDate(m.date_mariage)}</td>
                      <td className="px-2 py-3 text-xs text-[#555] max-w-[100px] truncate">{m.lieu || '—'}</td>
                      <td className="px-2 py-3 text-right">
                        <span className="text-sm font-semibold" style={{ color: m.cagnotte_cash > 0 ? '#C9A84C' : '#AAA' }}>
                          {formatFCFA(m.cagnotte_cash)}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <span className="text-xs text-[#888]">
                          {m.budget_total > 0 ? formatFCFA(m.budget_total) : '—'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: m.actif ? '#7C9A7E22' : '#88888822', color: m.actif ? '#7C9A7E' : '#888' }}>
                          {m.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setPanelUid(panelUid === m.uid ? null : m.uid)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors"
                            style={{
                              borderColor: '#C9A84C',
                              color: panelUid === m.uid ? 'white' : '#C9A84C',
                              background: panelUid === m.uid ? '#C9A84C' : 'transparent',
                            }}
                            title="Gérer cet espace"
                          >
                            ⚙
                          </button>
                          <button
                            onClick={() => accederEspace(m.uid)}
                            disabled={accessingUid === m.uid}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white whitespace-nowrap disabled:opacity-50 transition-colors hover:opacity-90"
                            style={{ background: '#C9A84C' }}
                          >
                            {accessingUid === m.uid ? '…' : 'Accéder →'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Panneau gestion rapide */}
              {panelUid === m.uid && (
                <PanneauGestionRapide
                  marie={m}
                  onClose={() => setPanelUid(null)}
                  onUpdate={handleUpdate}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
