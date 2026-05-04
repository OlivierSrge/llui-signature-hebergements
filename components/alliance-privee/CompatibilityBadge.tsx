'use client'
// components/alliance-privee/CompatibilityBadge.tsx

import type { CompatibilityLevel } from '@/lib/alliance-privee-matching'

interface Props {
  score: number
  level: CompatibilityLevel
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export default function CompatibilityBadge({
  score,
  level,
  size = 'md',
  showLabel = true,
}: Props) {
  const sizes = {
    sm: { emoji: 'text-sm', score: 'text-xs', label: 'text-[10px]', px: 'px-2 py-0.5' },
    md: { emoji: 'text-base', score: 'text-sm', label: 'text-xs', px: 'px-3 py-1' },
    lg: { emoji: 'text-xl', score: 'text-base', label: 'text-sm', px: 'px-4 py-1.5' },
  }
  const s = sizes[size]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${s.px} font-light`}
      style={{
        borderColor: `${level.color}44`,
        backgroundColor: `${level.color}14`,
      }}
    >
      <span className={s.emoji}>{level.emoji}</span>
      <span className={`${s.score} font-semibold`} style={{ color: level.color }}>
        {score}%
      </span>
      {showLabel && (
        <span className={`${s.label} uppercase tracking-wide`} style={{ color: level.color, opacity: 0.8 }}>
          {level.label === 'PARFAIT'
            ? 'Match Parfait'
            : level.label === 'EXCELLENT'
            ? 'Excellent'
            : level.label === 'BON'
            ? 'Bon Match'
            : level.label === 'MOYEN'
            ? 'Moyen'
            : 'Faible'}
        </span>
      )}
    </span>
  )
}
