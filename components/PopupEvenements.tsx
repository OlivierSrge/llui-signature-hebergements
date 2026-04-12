'use client'

import { useEffect, useState } from 'react'

interface Evenement {
  uid: string
  emoji: string
  titre: string
  lieu: string
  date_formatee?: string
}

interface PopupEvenementsProps {
  nomPartenaire?: string
}

export default function PopupEvenements({ nomPartenaire }: PopupEvenementsProps) {
  const [visible, setVisible] = useState(false)
  const [evenements, setEvenements] = useState<Evenement[]>([])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const charger = async () => {
      try {
        const { getEvenementsActifs } = await import('@/actions/evenements')
        const data = await getEvenementsActifs()
        setEvenements(data)
        if (data.length > 0) {
          timer = setTimeout(() => setVisible(true), 5000)
        }
      } catch (err) {
        console.error('PopupEvenements:', err)
      }
    }

    charger()
    return () => { if (timer) clearTimeout(timer) }
  }, [])

  if (!visible || evenements.length === 0) return null

  const titre = nomPartenaire
    ? `Bienvenue depuis ${nomPartenaire} !`
    : 'Kribi vous attend !'

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#F9F5F2',
      borderTop: '2px solid #C9A84C',
      padding: '16px 20px',
      zIndex: 9999,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, color: '#C9A84C', marginBottom: '10px', fontSize: '15px' }}>
            📅 {titre}
          </p>
          {evenements.map((evt) => (
            <div key={evt.uid} style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '16px' }}>{evt.emoji}</span>
              {' '}
              <strong style={{ fontSize: '13px', color: '#1A1A1A' }}>{evt.titre}</strong>
              <span style={{ fontSize: '12px', color: '#888', marginLeft: '6px' }}>
                — {evt.date_formatee}
              </span>
              <br />
              <span style={{ fontSize: '11px', color: '#888', marginLeft: '22px' }}>
                {evt.lieu}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'none',
            border: '1px solid #C9A84C',
            borderRadius: '6px',
            padding: '6px 12px',
            cursor: 'pointer',
            color: '#C9A84C',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Fermer ✕
        </button>
      </div>
    </div>
  )
}
