'use client'

import { useEffect, useState } from 'react'
import type { EvenementCanal2 } from '@/actions/evenements'

interface Props {
  nomPartenaire?: string
}

export default function PopupEvenements({ nomPartenaire }: Props) {
  const [visible, setVisible] = useState(false)
  const [evenements, setEvenements] = useState<EvenementCanal2[]>([])

  useEffect(() => {
    const chargerEvenements = async () => {
      try {
        const { getEvenementsActifs } = await import('@/actions/evenements')
        const data = await getEvenementsActifs()
        if (data.length > 0) {
          setEvenements(data)
          setTimeout(() => setVisible(true), 5000)
        }
      } catch {
        // silencieux
      }
    }
    chargerEvenements()
  }, [])

  if (!visible || evenements.length === 0) return null

  const titre = nomPartenaire ? `Bienvenue depuis ${nomPartenaire} !` : 'Kribi vous attend !'
  const sousTitre = nomPartenaire ? 'Événements à Kribi' : 'Événements à ne pas manquer'

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#F5F0E8',
      borderTop: '2px solid #C9A84C',
      padding: '16px',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        maxWidth: '600px',
        margin: '0 auto',
        gap: '12px',
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 600, color: '#C9A84C', marginBottom: '2px', fontSize: '14px' }}>
            {titre}
          </p>
          <p style={{ fontSize: '11px', color: '#1A1A1A', opacity: 0.5, marginBottom: '10px' }}>
            📅 {sousTitre}
          </p>
          {evenements.map((ev) => (
            <div key={ev.uid} style={{ marginBottom: '8px' }}>
              <span>{ev.emoji} </span>
              <strong style={{ fontSize: '13px', color: '#1A1A1A' }}>{ev.titre}</strong>
              <span style={{ color: '#1A1A1A', opacity: 0.5, fontSize: '12px' }}>
                {' '}— {ev.date_formatee}
              </span>
              <br />
              <span style={{ fontSize: '11px', color: '#1A1A1A', opacity: 0.4 }}>
                {ev.lieu}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#999',
            padding: '4px 8px',
            lineHeight: 1,
            flexShrink: 0,
          }}
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
