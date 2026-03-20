'use client'
// app/admin/commandes/CommandesClient.tsx
// Admin — validation des versements + KPIs commandes

import { useEffect, useState, useCallback } from 'react'

interface Versement {
  id: string
  commande_id: string
  uid: string
  montant: number
  mode: string
  reference: string
  statut: string
  declared_at: string | null
}

interface Kpis {
  nbCommandes: number
  totalCommandes: number
  totalDeclare: number
  totalValide: number
  enAttente: number
}

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

const STATUT_COLORS: Record<string, string> = {
  EN_ATTENTE: '#888',
  VALIDE: '#7C9A7E',
  REFUSE: '#C0392B',
}

const MODE_ICONS: Record<string, string> = {
  OM: '🟠', MOMO: '🟡', VIREMENT: '🏦', CASH: '💵',
}

export default function CommandesClient() {
  const [versements, setVersements] = useState<Versement[]>([])
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtreStatut, setFiltreStatut] = useState('EN_ATTENTE')
  const [validating, setValidating] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/versements?statut=${filtreStatut}`)
      .then(r => r.json())
      .then((data: { versements?: Versement[]; kpis?: Kpis }) => {
        setVersements(data.versements ?? [])
        setKpis(data.kpis ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filtreStatut])

  useEffect(() => { load() }, [load])

  async function handleValidate(id: string, statut: 'VALIDE' | 'REFUSE') {
    setValidating(id)
    try {
      await fetch('/api/admin/versements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, statut }),
      })
      load()
    } catch {
      // silently ignore
    } finally {
      setValidating(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Commandes &amp; Versements</h1>
        <p className="text-[#1A1A1A]/60 text-sm mb-6">Validation des paiements déclarés par les mariés</p>

        {/* KPIs */}
        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Commandes', value: kpis.nbCommandes.toString(), color: '#1A1A1A' },
              { label: 'Total engagé', value: formatFCFA(kpis.totalCommandes), color: '#0F52BA' },
              { label: 'Déclaré', value: formatFCFA(kpis.totalDeclare), color: '#C9A84C' },
              { label: 'Validé', value: formatFCFA(kpis.totalValide), color: '#7C9A7E' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
                <p className="text-xs text-[#888] mb-1">{kpi.label}</p>
                <p className="text-lg font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              </div>
            ))}
          </div>
        )}

        {kpis && kpis.enAttente > 0 && (
          <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-2xl p-4 mb-5 flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-semibold text-[#C9A84C]">{kpis.enAttente} versement(s) en attente de validation</p>
              <p className="text-xs text-[#888]">À traiter dans les 24h</p>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { key: 'EN_ATTENTE', label: 'En attente' },
            { key: 'VALIDE', label: 'Validés' },
            { key: 'REFUSE', label: 'Refusés' },
            { key: 'all', label: 'Tous' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFiltreStatut(f.key)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: filtreStatut === f.key ? '#C9A84C' : '#F5F0E8',
                color: filtreStatut === f.key ? 'white' : '#888',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Liste versements */}
        {loading ? (
          <div className="text-center py-12 text-[#888] text-sm">Chargement…</div>
        ) : versements.length === 0 ? (
          <div className="text-center py-12 text-[#888] text-sm">Aucun versement pour ce filtre.</div>
        ) : (
          <div className="space-y-3">
            {versements.map(v => {
              const statutColor = STATUT_COLORS[v.statut] ?? '#888'
              const isValidating = validating === v.id
              return (
                <div key={v.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{MODE_ICONS[v.mode] ?? '💳'}</span>
                        <span className="font-bold text-[#1A1A1A]">{formatFCFA(v.montant)}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: statutColor + '22', color: statutColor }}>
                          {v.statut}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#888]">UID : {v.uid}</p>
                      <p className="text-[11px] text-[#888]">Commande : <span className="font-mono">{v.commande_id}</span></p>
                      {v.reference && <p className="text-[11px] text-[#888]">Réf. {v.reference}</p>}
                      {v.declared_at && (
                        <p className="text-[11px] text-[#888]">
                          {new Date(v.declared_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>

                  {v.statut === 'EN_ATTENTE' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleValidate(v.id, 'VALIDE')}
                        disabled={isValidating}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                        style={{ background: '#7C9A7E' }}
                      >
                        {isValidating ? '…' : '✓ Valider'}
                      </button>
                      <button
                        onClick={() => handleValidate(v.id, 'REFUSE')}
                        disabled={isValidating}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                        style={{ background: '#C0392B' }}
                      >
                        {isValidating ? '…' : '✗ Refuser'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
