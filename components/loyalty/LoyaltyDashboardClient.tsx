'use client'

import { useState, useEffect } from 'react'
import { getLoyaltyPrograms } from '@/actions/loyalty'
import type { LoyaltyProgram } from '@/types/loyalty'
import LoyaltyStatsTab from './tabs/LoyaltyStatsTab'
import LoyaltyClientsTab from './tabs/LoyaltyClientsTab'
import LoyaltyScannerTab from './tabs/LoyaltyScannerTab'
import LoyaltyPaymentsTab from './tabs/LoyaltyPaymentsTab'
import LoyaltyHistoryTab from './tabs/LoyaltyHistoryTab'

// ── Onglet Boutique Canal 2 ───────────────────────────────────────────────────

function Canal2Tab({ partenaireId }: { partenaireId: string }) {
  const [stats, setStats] = useState<{
    total_ca_boutique_fcfa: number
    total_commissions_fcfa: number
    total_utilisations: number
  } | null>(null)
  const [commissions, setCommissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/partenaire/${partenaireId}/canal2-stats`).then((r) => r.json()).catch(() => null),
      fetch(`/api/partenaire/${partenaireId}/commissions`).then((r) => r.json()).catch(() => null),
    ]).then(([s, c]) => {
      if (s) setStats(s)
      if (c?.commissions) setCommissions(c.commissions.slice(0, 20))
      setLoading(false)
    })
  }, [partenaireId])

  // Fallback : lire directement depuis prescripteurs_partenaires via action
  useEffect(() => {
    if (!loading && !stats) {
      import('@/actions/codes-sessions').then(({ getPrescripteurPartenaire }) => {
        getPrescripteurPartenaire(partenaireId).then((res: any) => {
          if (res?.partenaire) {
            const p = res.partenaire
            setStats({
              total_ca_boutique_fcfa: p.total_ca_boutique_fcfa ?? 0,
              total_commissions_fcfa: p.total_commissions_fcfa ?? 0,
              total_utilisations: p.total_utilisations ?? 0,
            })
          }
        }).catch(() => {})
      }).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  if (loading) return <div className="text-[#F5F0E8]/50 text-center py-8">Chargement...</div>

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[#F5F0E8] font-semibold mb-1">🛍 Revenus Boutique Affiliée</h3>
        <p className="text-[#F5F0E8]/40 text-xs">
          Achats effectués dans la boutique en ligne via votre code promo partenaire
        </p>
      </div>

      {/* KPIs Canal 2 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'CA boutique',
            value: (stats?.total_ca_boutique_fcfa ?? 0).toLocaleString('fr-FR'),
            suffix: ' FCFA',
            color: 'text-[#C9A84C]',
          },
          {
            label: 'Commissions',
            value: (stats?.total_commissions_fcfa ?? 0).toLocaleString('fr-FR'),
            suffix: ' FCFA',
            color: 'text-emerald-400',
          },
          {
            label: 'Ventes',
            value: stats?.total_utilisations ?? 0,
            suffix: '',
            color: 'text-purple-400',
          },
        ].map((k) => (
          <div key={k.label} className="bg-[#0A0A0A] border border-[#C9A84C]/10 rounded-xl p-4">
            <p className="text-[#F5F0E8]/50 text-xs mb-2">{k.label}</p>
            <p className={`text-xl font-bold ${k.color}`}>
              {k.value}
              <span className="text-xs font-normal">{k.suffix}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Dernières commissions */}
      {commissions.length > 0 ? (
        <div>
          <h4 className="text-[#F5F0E8]/60 text-xs uppercase tracking-wider mb-3">
            Dernières ventes
          </h4>
          <div className="space-y-2">
            {commissions.map((c: any, i: number) => (
              <div
                key={i}
                className="bg-[#0A0A0A] border border-[#C9A84C]/10 rounded-lg px-4 py-3 flex justify-between items-center"
              >
                <div>
                  <p className="text-[#F5F0E8] text-sm font-medium">
                    {c.client_nom ?? c.code ?? '—'}
                  </p>
                  <p className="text-[#F5F0E8]/40 text-xs">
                    {c.created_at
                      ? new Date(c.created_at?.seconds ? c.created_at.seconds * 1000 : c.created_at).toLocaleDateString('fr-FR')
                      : '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[#C9A84C] font-semibold text-sm">
                    +{(c.commission_fcfa ?? 0).toLocaleString('fr-FR')} FCFA
                  </p>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      c.statut === 'versee'
                        ? 'bg-green-900/30 text-green-400'
                        : c.statut === 'en_attente'
                        ? 'bg-amber-900/30 text-amber-400'
                        : 'bg-white/5 text-[#F5F0E8]/40'
                    }`}
                  >
                    {c.statut === 'versee' ? 'Versé' : c.statut === 'en_attente' ? 'En attente' : 'En cours'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[#0A0A0A] border border-[#C9A84C]/10 rounded-xl p-8 text-center">
          <p className="text-[#F5F0E8]/40 text-sm">
            Aucune vente boutique enregistrée pour le moment.
          </p>
          <p className="text-[#F5F0E8]/25 text-xs mt-2">
            Les ventes confirmées via votre code promo apparaissent ici automatiquement.
          </p>
        </div>
      )}
    </div>
  )
}

type TabType = 'stats' | 'clients' | 'scanner' | 'payments' | 'history' | 'canal2'

const TABS: { id: TabType; label: string }[] = [
  { id: 'stats', label: '📊 Stats' },
  { id: 'clients', label: '👥 Clients' },
  { id: 'scanner', label: '📱 Scanner' },
  { id: 'payments', label: '💰 Paiements' },
  { id: 'history', label: '📋 Historique' },
  { id: 'canal2', label: '🛍 Boutique' },
]

export default function LoyaltyDashboardClient({ partenaireId }: { partenaireId: string }) {
  const [activeTab, setActiveTab] = useState<TabType>('stats')
  const [programs, setPrograms] = useState<(LoyaltyProgram & { program_id: string })[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLoyaltyPrograms(partenaireId).then(({ programs: p = [] }) => {
      setPrograms(p)
      if (p.length > 0) setSelectedProgram(p[0].program_id)
      setLoading(false)
    })
  }, [partenaireId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#C9A84C] text-lg">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-serif text-[#C9A84C] mb-6">
          🎫 Mes cartes de fidélité
        </h1>

        {programs.length === 0 ? (
          <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-xl p-12 text-center">
            <p className="text-[#F5F0E8]/60">Aucun programme de fidélité actif.</p>
            <p className="text-[#F5F0E8]/30 text-sm mt-2">
              Contactez L&amp;Lui pour créer votre programme personnalisé.
            </p>
          </div>
        ) : (
          <>
            {programs.length > 1 && (
              <div className="mb-6">
                <label className="block text-[#F5F0E8]/70 text-sm mb-1.5">Programme :</label>
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="bg-[#1A1A1A] border border-[#C9A84C]/30 text-[#F5F0E8] px-3 py-2 rounded-lg"
                >
                  {programs.map((p) => (
                    <option key={p.program_id} value={p.program_id}>
                      {p.nom}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-xl overflow-hidden">
              {/* Onglets */}
              <div className="flex border-b border-[#C9A84C]/20 overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-max py-3 px-4 text-sm text-center transition whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-[#C9A84C]/20 text-[#C9A84C] font-medium'
                        : 'text-[#F5F0E8]/60 hover:bg-[#C9A84C]/10 hover:text-[#F5F0E8]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Contenu */}
              <div className="p-5">
                {activeTab === 'stats' && <LoyaltyStatsTab programId={selectedProgram} />}
                {activeTab === 'clients' && <LoyaltyClientsTab programId={selectedProgram} />}
                {activeTab === 'scanner' && (
                  <LoyaltyScannerTab
                    programId={selectedProgram}
                    program={programs.find((p) => p.program_id === selectedProgram) ?? null}
                  />
                )}
                {activeTab === 'payments' && (
                  <LoyaltyPaymentsTab partenaireId={partenaireId} />
                )}
                {activeTab === 'history' && (
                  <LoyaltyHistoryTab partenaireId={partenaireId} />
                )}
                {activeTab === 'canal2' && (
                  <Canal2Tab partenaireId={partenaireId} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
