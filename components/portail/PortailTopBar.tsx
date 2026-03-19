'use client'

import { formatFCFA } from '@/lib/devisDefaults'
import { GRADE_COLORS, GRADE_THRESHOLDS, type PortailGrade, PORTAIL_GRADES } from '@/lib/portailGrades'
import PanierIndicateur from '@/components/panier/PanierIndicateur'

interface Props {
  uid: string
  grade: PortailGrade
  revLifetime: number
  walletCash: number
  displayName: string
}

function getNextGradeInfo(grade: PortailGrade, revLifetime: number) {
  const idx = PORTAIL_GRADES.indexOf(grade)
  if (idx === PORTAIL_GRADES.length - 1) return { label: 'Niveau maximum', pct: 100, revNext: 0 }
  const next = PORTAIL_GRADES[idx + 1]
  const current = GRADE_THRESHOLDS[grade]
  const target = GRADE_THRESHOLDS[next]
  const pct = Math.min(100, Math.round(((revLifetime - current) / (target - current)) * 100))
  return { label: next, pct: Math.max(0, pct), revNext: target - revLifetime }
}

export default function PortailTopBar({ uid, grade, revLifetime, walletCash, displayName }: Props) {
  const color = GRADE_COLORS[grade]
  const { label: nextLabel, pct, revNext } = getNextGradeInfo(grade, revLifetime)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#1A1A1A] flex items-center px-4 gap-4 shadow-lg">
      {/* Logo */}
      <span className="text-[#C9A84C] font-serif italic text-lg whitespace-nowrap hidden sm:block">
        L&amp;Lui Signature
      </span>
      <div className="h-5 w-px bg-white/10 hidden sm:block" />

      {/* Badge grade */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
        style={{ background: color + '22', color, border: `1px solid ${color}60` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        {grade}
      </div>

      {/* Barre de progression */}
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <div className="flex justify-between text-[10px] text-white/40">
          <span>{revLifetime.toLocaleString('fr-FR')} REV</span>
          <span className="hidden sm:block">
            {pct < 100 ? `encore ${revNext.toLocaleString('fr-FR')} REV pour ${nextLabel}` : ''}
          </span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>

      {/* Wallet */}
      <div className="text-right whitespace-nowrap">
        <p className="text-[10px] text-white/40">Wallet</p>
        <p className="text-sm font-semibold text-[#C9A84C]">{formatFCFA(walletCash)}</p>
      </div>

      {/* Nom */}
      <div className="hidden md:block text-right ml-2">
        <p className="text-[10px] text-white/40">Bonjour</p>
        <p className="text-sm text-white/80 truncate max-w-[120px]">{displayName}</p>
      </div>

      {/* Panier */}
      <PanierIndicateur uid={uid} />
    </header>
  )
}
