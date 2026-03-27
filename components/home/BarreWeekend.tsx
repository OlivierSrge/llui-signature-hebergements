'use client'
// Élément A — barre fine sous la nav avec compteur dynamique ce weekend

import { useEffect, useState } from 'react'

interface WeekendData {
  evenements: { titre: string; date_debut: string }[]
  total: number
  hebergements: { id: string }[]
}

export default function BarreWeekend() {
  const [data, setData] = useState<WeekendData | null>(null)

  useEffect(() => {
    fetch('/api/evenements/weekend')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data || data.total === 0) return null

  // Prochain événement à venir
  const prochainEv = data.evenements.find(
    (ev) => new Date(ev.date_debut) >= new Date()
  ) ?? data.evenements[0]

  const joursRestants = prochainEv
    ? Math.ceil(
        (new Date(prochainEv.date_debut).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null

  const open = () => document.dispatchEvent(new CustomEvent('openCalendrier'))

  return (
    <button
      onClick={open}
      className="w-full bg-[#1A1A1A] border-b border-white/5 px-4 py-2 text-center hover:bg-[#2a2a2a] transition-colors"
    >
      <span className="text-xs text-white/70 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
        <span>
          🗓 Ce weekend :{' '}
          <span className="text-[#C9A84C] font-medium">
            {data.total} activité{data.total > 1 ? 's' : ''} à Kribi
          </span>
        </span>
        <span className="hidden sm:inline text-white/30">·</span>
        <span className="hidden sm:inline">
          {data.hebergements.length} hébergement{data.hebergements.length > 1 ? 's' : ''} disponible{data.hebergements.length > 1 ? 's' : ''}
        </span>
        {prochainEv && joursRestants !== null && joursRestants >= 0 && (
          <>
            <span className="hidden sm:inline text-white/30">·</span>
            <span className="hidden sm:inline">
              Prochain :{' '}
              <span className="text-white/90 font-medium">{prochainEv.titre}</span>
              {joursRestants === 0 ? " — aujourd'hui" : joursRestants === 1 ? ' — demain' : ` dans ${joursRestants}j`}
            </span>
          </>
        )}
      </span>
    </button>
  )
}
