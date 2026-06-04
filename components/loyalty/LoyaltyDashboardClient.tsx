'use client'

import { useState, useEffect } from 'react'
import { getLoyaltyPrograms } from '@/actions/loyalty'
import type { LoyaltyProgram } from '@/types/loyalty'
import LoyaltyStatsTab from './tabs/LoyaltyStatsTab'
import LoyaltyClientsTab from './tabs/LoyaltyClientsTab'
import LoyaltyScannerTab from './tabs/LoyaltyScannerTab'
import LoyaltyPaymentsTab from './tabs/LoyaltyPaymentsTab'
import LoyaltyHistoryTab from './tabs/LoyaltyHistoryTab'

type TabType = 'stats' | 'clients' | 'scanner' | 'payments' | 'history'

const TABS: { id: TabType; label: string }[] = [
  { id: 'stats', label: '📊 Stats' },
  { id: 'clients', label: '👥 Clients' },
  { id: 'scanner', label: '📱 Scanner' },
  { id: 'payments', label: '💰 Paiements' },
  { id: 'history', label: '📋 Historique' },
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
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
