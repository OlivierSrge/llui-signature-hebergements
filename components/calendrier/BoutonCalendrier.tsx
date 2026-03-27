'use client'

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import PopupCalendrier from './PopupCalendrier'

export default function BoutonCalendrier() {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    // Charge le nombre d'événements du weekend
    fetch('/api/evenements/weekend')
      .then((r) => r.json())
      .then((d) => setCount(d.total ?? 0))
      .catch(() => setCount(0))
  }, [])

  // Écoute l'événement global pour ouvrir le popup depuis d'autres composants
  useEffect(() => {
    const handler = () => setOpen(true)
    document.addEventListener('openCalendrier', handler)
    return () => document.removeEventListener('openCalendrier', handler)
  }, [])

  // Masquer si 0 événements (ou pas encore chargé)
  if (count === null || count === 0) return <PopupCalendrier isOpen={open} onClose={() => setOpen(false)} />

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Ce weekend à Kribi — ${count} événement${count > 1 ? 's' : ''}`}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: '#C9A84C',
          color: '#412402',
          borderRadius: 28,
          padding: '12px 20px',
          fontWeight: 500,
          fontSize: 13,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(201,168,76,0.35)',
        }}
      >
        {/* Indicateur vert "live" */}
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#1D9E75',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <Calendar size={14} style={{ flexShrink: 0 }} />
        Ce weekend à Kribi
        {/* Badge nombre */}
        <span
          style={{
            background: '#412402',
            color: '#F5F0E8',
            borderRadius: 12,
            padding: '1px 7px',
            fontSize: 11,
            fontWeight: 700,
            lineHeight: '18px',
          }}
        >
          {count}
        </span>
      </button>

      <PopupCalendrier isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
