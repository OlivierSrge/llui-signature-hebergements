'use client'
// components/portail/CountdownRing.tsx
// Compte à rebours SVG temps réel jusqu'à la date du mariage

import { useEffect, useState } from 'react'

interface Props {
  dateEvenement: string | null // ISO string
  nomEvenement: string
}

function computeCountdown(dateStr: string | null): { jours: number; pct: number } {
  if (!dateStr) return { jours: 0, pct: 0 }
  const target = new Date(dateStr).getTime()
  const now = Date.now()
  const diff = target - now
  if (diff <= 0) return { jours: 0, pct: 100 }
  const jours = Math.ceil(diff / (1000 * 60 * 60 * 24))
  // Anneau basé sur une année (365j max)
  const pct = Math.max(0, Math.min(100, ((365 - jours) / 365) * 100))
  return { jours, pct }
}

const R = 48
const CIRC = 2 * Math.PI * R

export default function CountdownRing({ dateEvenement, nomEvenement }: Props) {
  const [{ jours, pct }, setState] = useState(() => computeCountdown(dateEvenement))

  useEffect(() => {
    if (!dateEvenement) return
    setState(computeCountdown(dateEvenement))
    const id = setInterval(() => setState(computeCountdown(dateEvenement)), 60_000)
    return () => clearInterval(id)
  }, [dateEvenement])

  const dashOffset = CIRC - (pct / 100) * CIRC

  return (
    <div className="flex flex-col items-center">
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={60} cy={60} r={R} fill="none" stroke="#F5F0E8" strokeWidth={10} />
        <circle
          cx={60} cy={60} r={R} fill="none"
          stroke="#C9A84C" strokeWidth={10}
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x={60} y={56} textAnchor="middle" fontSize={22} fontWeight="bold" fill="#1A1A1A">
          {jours}
        </text>
        <text x={60} y={72} textAnchor="middle" fontSize={10} fill="#888">
          jours
        </text>
      </svg>
      <p className="text-xs text-[#888] mt-1 text-center max-w-[120px] leading-tight">
        {dateEvenement ? `avant ${nomEvenement || 'votre mariage'}` : 'Date non définie'}
      </p>
    </div>
  )
}
