'use client'

import { useState, useEffect } from 'react'

const BOUTIQUE_URL = 'https://l-et-lui-signature.com/index.html'

const PRODUITS = [
  { emoji: '💍', nom: 'Pack Mariage', prix: 'dès 85 000 FCFA' },
  { emoji: '🌊', nom: 'Lune de Miel', prix: 'dès 350 000 FCFA' },
  { emoji: '🎉', nom: 'EVJF Kribi', prix: 'dès 200 000 FCFA' },
  { emoji: '📸', nom: 'Photo & Vidéo', prix: 'dès 35 000 FCFA' },
]

export default function PopupBoutique() {
  const [visible, setVisible] = useState(false)
  const [anime, setAnime] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true)
      setTimeout(() => setAnime(true), 50)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const fermer = () => {
    setAnime(false)
    setTimeout(() => setVisible(false), 300)
  }

  const ouvrirBoutique = () => {
    window.open(BOUTIQUE_URL, '_blank')
    fermer()
  }

  if (!visible) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={fermer}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1999,
          opacity: anime ? 1 : 0,
          transition: 'opacity 300ms ease',
        }}
      />

      {/* Popup */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: anime
            ? 'translate(-50%,-50%) scale(1)'
            : 'translate(-50%,-40%) scale(0.95)',
          opacity: anime ? 1 : 0,
          transition: 'all 300ms ease',
          zIndex: 2000,
          width: '90%',
          maxWidth: '380px',
          background: '#F5F0E8',
          border: '1px solid #C9A84C',
          borderRadius: '16px',
          padding: '1.5rem',
        }}
      >
        {/* Bouton fermeture */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
          <button
            onClick={fermer}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#999',
              fontSize: '18px',
              lineHeight: 1,
              padding: '2px 4px',
            }}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Badge doré */}
        <div style={{ marginBottom: '0.75rem' }}>
          <span
            style={{
              display: 'inline-block',
              background: '#FAEEDA',
              color: '#633806',
              borderRadius: '20px',
              fontSize: '10px',
              fontWeight: 600,
              padding: '3px 10px',
              letterSpacing: '0.03em',
            }}
          >
            Boutique L&amp;Lui Signature
          </span>
        </div>

        {/* Titre */}
        <h2
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '18px',
            fontWeight: 700,
            color: '#1A1A1A',
            marginBottom: '0.4rem',
            lineHeight: 1.3,
          }}
        >
          Complétez votre séjour à Kribi
        </h2>

        {/* Sous-titre */}
        <p
          style={{
            fontSize: '12px',
            color: '#888',
            marginBottom: '1rem',
            lineHeight: 1.5,
          }}
        >
          Découvrez nos services et expériences premium pour un séjour inoubliable.
        </p>

        {/* Grille 2×2 produits */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '1rem',
          }}
        >
          {PRODUITS.map((p) => (
            <div
              key={p.nom}
              style={{
                background: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: '10px',
                padding: '10px',
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{p.emoji}</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#1A1A1A', lineHeight: 1.3 }}>
                {p.nom}
              </div>
              <div style={{ fontSize: '10px', color: '#C9A84C', marginTop: '2px' }}>{p.prix}</div>
            </div>
          ))}
        </div>

        {/* Bouton principal */}
        <button
          onClick={ouvrirBoutique}
          style={{
            width: '100%',
            padding: '12px',
            background: '#C9A84C',
            color: '#412402',
            border: 'none',
            borderRadius: '28px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: '10px',
          }}
        >
          Découvrir la boutique →
        </button>

        {/* Bouton secondaire */}
        <button
          onClick={fermer}
          style={{
            display: 'block',
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            color: '#999',
            textAlign: 'center',
            padding: '4px 0',
            marginBottom: '12px',
          }}
        >
          Passer · Continuer vers les hébergements
        </button>

        {/* Séparateur */}
        <div style={{ borderTop: '1px solid rgba(201,168,76,0.2)', marginBottom: '10px' }} />

        {/* Ligne de confiance */}
        <p style={{ fontSize: '10px', color: '#AAA', textAlign: 'center' }}>
          ● Paiement sécurisé · Sans engagement immédiat · Kribi, Cameroun
        </p>
      </div>
    </>
  )
}
