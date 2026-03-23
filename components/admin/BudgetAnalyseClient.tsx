'use client'
// components/admin/BudgetAnalyseClient.tsx — #122 Tableau analyse prédictive budgets admin

import { useState } from 'react'
import AnalyseBudget from './AnalyseBudget'

interface VersementLibre { montant: number; statut: string; date?: string }

interface MarieBudget {
  marie_uid: string
  noms_maries: string
  budget_total: number
  versements: VersementLibre[]
  date_mariage: string
}

interface Props {
  budgets: MarieBudget[]
}

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA' }

function joursAvant(dateMariage: string): number {
  if (!dateMariage) return 999
  const dm = new Date(dateMariage)
  dm.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((dm.getTime() - today.getTime()) / 86400000)
}

function getStatutVersement(budget_total: number, versements: VersementLibre[], date_mariage: string) {
  const jours = joursAvant(date_mariage)
  const totalVerse = versements.filter(v => v.statut === 'confirme').reduce((acc, v) => acc + v.montant, 0)
  const pct = budget_total > 0 ? totalVerse / budget_total : 0
  let seuilAttendu = 0
  if (jours <= 90 && jours > 60) seuilAttendu = 0.30
  else if (jours <= 60 && jours > 30) seuilAttendu = 0.50
  else if (jours <= 30 && jours > 7) seuilAttendu = 0.80
  else if (jours <= 7) seuilAttendu = 1.00
  const retard = pct < seuilAttendu - 0.10
  return { pct, totalVerse, retard, seuilAttendu }
}

export default function BudgetAnalyseClient({ budgets }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [filtre, setFiltre] = useState<'tous' | 'retard' | 'ok'>('tous')

  const enRetard = budgets.filter(b => getStatutVersement(b.budget_total, b.versements, b.date_mariage).retard)
  const totalBudgets = budgets.reduce((acc, b) => acc + b.budget_total, 0)
  const totalVerse = budgets.reduce((acc, b) => {
    return acc + b.versements.filter(v => v.statut === 'confirme').reduce((s, v) => s + v.montant, 0)
  }, 0)

  const filtered = budgets.filter(b => {
    if (filtre === 'retard') return getStatutVersement(b.budget_total, b.versements, b.date_mariage).retard
    if (filtre === 'ok') return !getStatutVersement(b.budget_total, b.versements, b.date_mariage).retard
    return true
  })

  const selectedBudget = budgets.find(b => b.marie_uid === selected)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">📊 Analyse prédictive budgets</h1>
        <p className="text-sm text-[#888] mt-1">Comparaison versements vs historique L&Lui — alertes dépassement précoces</p>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl p-4 text-center bg-white" style={{ border: '1px solid #F5F0E8' }}>
          <p className="text-[10px] text-[#888] mb-1">Budgets totaux</p>
          <p className="text-xl font-bold text-[#C9A84C]">{fmt(totalBudgets)}</p>
          <p className="text-[10px] text-[#888] mt-0.5">{budgets.length} couples</p>
        </div>
        <div className="rounded-2xl p-4 text-center bg-white" style={{ border: '1px solid #F5F0E8' }}>
          <p className="text-[10px] text-[#888] mb-1">Total versé (confirmé)</p>
          <p className="text-xl font-bold text-[#7C9A7E]">{fmt(totalVerse)}</p>
          <p className="text-[10px] text-[#888] mt-0.5">{totalBudgets > 0 ? Math.round(totalVerse / totalBudgets * 100) : 0}% du total</p>
        </div>
        <div className="rounded-2xl p-4 text-center bg-white" style={{ border: `1px solid ${enRetard.length > 0 ? '#C0392B25' : '#7C9A7E25'}` }}>
          <p className="text-[10px] text-[#888] mb-1">Alertes retard</p>
          <p className="text-xl font-bold" style={{ color: enRetard.length > 0 ? '#C0392B' : '#7C9A7E' }}>{enRetard.length}</p>
          <p className="text-[10px] text-[#888] mt-0.5">couple{enRetard.length > 1 ? 's' : ''} en retard</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'tous', label: `Tous (${budgets.length})` },
          { key: 'retard', label: `⚠️ En retard (${enRetard.length})` },
          { key: 'ok', label: `✅ OK (${budgets.length - enRetard.length})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFiltre(f.key as typeof filtre)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: filtre === f.key ? '#1A1A1A' : '#F5F0E8',
              color: filtre === f.key ? '#C9A84C' : '#888',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Liste */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-center text-sm text-[#AAA] py-8">Aucun couple trouvé</p>
          )}
          {filtered.map(b => {
            const stat = getStatutVersement(b.budget_total, b.versements, b.date_mariage)
            const jours = joursAvant(b.date_mariage)
            const isSelected = selected === b.marie_uid
            return (
              <button
                key={b.marie_uid}
                onClick={() => setSelected(isSelected ? null : b.marie_uid)}
                className="w-full text-left p-4 rounded-2xl transition-all"
                style={{
                  background: isSelected ? '#1A1A1A' : 'white',
                  border: `1px solid ${stat.retard ? '#C0392B30' : isSelected ? '#C9A84C' : '#F5F0E8'}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: isSelected ? '#C9A84C' : '#1A1A1A' }}>{b.noms_maries}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: isSelected ? '#888' : '#AAA' }}>
                      {jours > 0 ? `J-${jours}` : jours === 0 ? 'Aujourd\'hui !' : 'Passé'} · {fmt(b.budget_total)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xs font-bold" style={{ color: stat.retard ? '#C0392B' : '#7C9A7E' }}>
                        {Math.round(stat.pct * 100)}%
                      </p>
                      <p className="text-[9px] text-[#888]">versé</p>
                    </div>
                    {stat.retard && <span className="text-base">⚠️</span>}
                  </div>
                </div>
                {/* Mini barre */}
                <div className="mt-2 bg-[#F5F0E8] rounded-full h-1.5">
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.min(stat.pct * 100, 100)}%`, background: stat.retard ? '#C0392B' : '#7C9A7E' }} />
                </div>
              </button>
            )
          })}
        </div>

        {/* Détail sélectionné */}
        <div>
          {selectedBudget ? (
            <AnalyseBudget
              marie_uid={selectedBudget.marie_uid}
              noms_maries={selectedBudget.noms_maries}
              budget_total={selectedBudget.budget_total}
              versements={selectedBudget.versements}
              date_mariage={selectedBudget.date_mariage}
            />
          ) : (
            <div className="rounded-2xl p-8 text-center" style={{ background: '#FDFAF4', border: '1px dashed #E8E0D0' }}>
              <div className="text-4xl mb-3">📊</div>
              <p className="text-sm text-[#888]">Sélectionnez un couple pour voir l'analyse détaillée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
