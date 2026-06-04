'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LoyaltyProgram } from '@/types/loyalty'
import PricingConfigurator from './PricingConfigurator'
import NiveauxConfigurator from './NiveauxConfigurator'
import AvantagesConfigurator from './AvantagesConfigurator'

interface Props {
  program: LoyaltyProgram
}

type Tab = 'pricing' | 'niveaux' | 'avantages'

export default function ConfigureLoyaltyProgramClient({ program }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('pricing')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pricing', label: '💰 Tarification' },
    { key: 'niveaux', label: '🏆 Niveaux' },
    { key: 'avantages', label: '🎁 Avantages' },
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="text-[#F5F0E8]/40 hover:text-[#F5F0E8] text-sm"
          >
            ← Retour
          </button>
          <div>
            <h1 className="text-3xl font-serif text-[#C9A84C]">Configurer la carte</h1>
            <p className="text-[#F5F0E8]/50 text-sm mt-0.5">
              {program.nom} · Partenaire : {program.partenaire_id}
            </p>
          </div>
          <span
            className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${
              program.statut === 'ACTIVE'
                ? 'bg-green-900/40 text-green-400'
                : program.statut === 'PAUSED'
                ? 'bg-yellow-900/40 text-yellow-400'
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            {program.statut}
          </span>
        </div>

        {/* Tabs */}
        <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-xl overflow-hidden">
          <div className="flex border-b border-[#C9A84C]/20">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-4 px-6 text-sm font-medium transition ${
                  activeTab === t.key
                    ? 'bg-[#C9A84C]/20 text-[#C9A84C]'
                    : 'text-[#F5F0E8]/60 hover:bg-[#C9A84C]/10 hover:text-[#F5F0E8]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'pricing' && (
              <PricingConfigurator program={program} />
            )}
            {activeTab === 'niveaux' && (
              <NiveauxConfigurator program={program} />
            )}
            {activeTab === 'avantages' && (
              <AvantagesConfigurator program={program} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
