'use client'
// components/portail/FastStartWidget.tsx
// Widget dashboard — timeline J30/J60/J90 avec barre temps + REV

import { useMemo } from 'react'

const PALIERS = [
  { jours: 30, rev: 80,  prime: 30_000  },
  { jours: 60, rev: 200, prime: 80_000  },
  { jours: 90, rev: 450, prime: 200_000 },
]

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n)) + ' FCFA'
}

export interface FastStartWidgetProps {
  enrolledAt: string | null
  revLifetime: number
  palier30: { unlocked: boolean; paye: boolean; expire: boolean; claimed: boolean }
  palier60: { unlocked: boolean; paye: boolean; expire: boolean; claimed: boolean }
  palier90: { unlocked: boolean; paye: boolean; expire: boolean; claimed: boolean }
}

function nodeColor(state: { unlocked: boolean; paye: boolean; expire: boolean }): string {
  if (state.paye)    return '#7C9A7E'
  if (state.expire)  return '#C0392B'
  if (state.unlocked) return '#C9A84C'
  return '#CCC'
}

function nodeIcon(state: { unlocked: boolean; paye: boolean; expire: boolean }): string {
  if (state.paye)    return '💰'
  if (state.expire)  return '❌'
  if (state.unlocked) return '🟡'
  return '⬜'
}

export default function FastStartWidget({
  enrolledAt, revLifetime, palier30, palier60, palier90,
}: FastStartWidgetProps) {
  const palierStates = [palier30, palier60, palier90]

  const { joursEcoules, pctTemps } = useMemo(() => {
    if (!enrolledAt) return { joursEcoules: 0, pctTemps: 0 }
    const diff = Date.now() - new Date(enrolledAt).getTime()
    const j = Math.floor(diff / 86_400_000)
    return { joursEcoules: j, pctTemps: Math.min(100, Math.round((j / 90) * 100)) }
  }, [enrolledAt])

  // Prochain palier non atteint
  const prochain = PALIERS.find((p, i) =>
    !palierStates[i].unlocked && !palierStates[i].expire && !palierStates[i].paye
  ) ?? null

  const allDone = palierStates.every(s => s.paye || s.expire)
  if (!enrolledAt || (allDone && palierStates.every(s => s.paye))) return null

  // Y a-t-il un palier débloqué non encore réclamé ?
  const palierAReclamer = PALIERS.find((p, i) => palierStates[i].unlocked && !palierStates[i].claimed && !palierStates[i].paye)

  return (
    <div className="bg-[#1A1A1A] rounded-2xl p-5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wide">Fast Start Bonus</p>
          <p className="text-[11px] text-white/40 mt-0.5">Jour {joursEcoules} / 90</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/40">REV actuels</p>
          <p className="text-sm font-bold text-white">{revLifetime}</p>
        </div>
      </div>

      {/* Timeline 3 nœuds */}
      <div className="flex items-center gap-0 mb-4">
        {PALIERS.map((p, i) => {
          const state = palierStates[i]
          const color = nodeColor(state)
          const isLast = i === PALIERS.length - 1
          return (
            <div key={p.jours} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className="text-base leading-none">{nodeIcon(state)}</div>
                <div className="text-[10px] text-white/50 mt-1">J{p.jours}</div>
                <div className="text-[9px] font-bold mt-0.5" style={{ color }}>{formatFCFA(p.prime)}</div>
              </div>
              {!isLast && (
                <div className="flex-1 h-px mx-2" style={{ background: color === '#CCC' ? '#333' : color + '66' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Barre temps */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-white/30 mb-1">
          <span>Temps écoulé</span>
          <span>{pctTemps}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pctTemps}%`, background: '#C9A84C' }} />
        </div>
      </div>

      {/* Prochain objectif */}
      {prochain && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-white/40 mb-1">
            <span>Objectif J{prochain.jours} : {prochain.rev} REV</span>
            <span>{Math.max(0, prochain.rev - revLifetime)} manquants</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full"
              style={{ width: `${Math.min(100, Math.round((revLifetime / prochain.rev) * 100))}%`, background: '#7C9A7E' }} />
          </div>
        </div>
      )}

      {/* CTA si palier à réclamer */}
      {palierAReclamer && (
        <a
          href="/portail/avantages#fast-start"
          className="block w-full py-2.5 rounded-xl text-sm font-semibold text-[#1A1A1A] text-center animate-pulse"
          style={{ background: '#C9A84C' }}
        >
          Réclamer ma prime J{palierAReclamer.jours} →
        </a>
      )}
    </div>
  )
}
