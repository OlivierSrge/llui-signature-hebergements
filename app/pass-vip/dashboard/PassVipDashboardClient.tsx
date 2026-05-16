'use client'

import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface PassData {
  id: string
  nom: string
  type_pass: string
  date_fin: string
  statut: string
}

const QR_LIFETIME_SEC = 300 // 5 minutes

export default function PassVipDashboardClient({ pass }: { pass: PassData }) {
  const [qrData, setQrData] = useState<{ url: string; expiresAt: number } | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Countdown timer
  useEffect(() => {
    if (!qrData) return
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((qrData.expiresAt - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) setQrData(null)
    }, 500)
    return () => clearInterval(interval)
  }, [qrData])

  const generateQR = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pass-vip/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pass_id: pass.id }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        setQrData({ url: data.url, expiresAt: new Date(data.expires_at).getTime() })
        setSecondsLeft(QR_LIFETIME_SEC)
      } else {
        setError(data.error ?? 'Erreur génération QR')
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [pass.id])

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const isExpired = qrData && secondsLeft === 0

  const logout = async () => {
    await fetch('/api/pass-vip/logout', { method: 'POST' })
    window.location.href = '/pass-vip/login'
  }

  return (
    <div>
      <style>{`
        @keyframes pulse-gold {
          0% { box-shadow: 0 0 0 0 rgba(201, 168, 76, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(201, 168, 76, 0); }
          100% { box-shadow: 0 0 0 0 rgba(201, 168, 76, 0); }
        }
        .btn-gold {
          animation: pulse-gold 2s infinite;
        }
      `}</style>

      {/* Zone QR Code (Glassmorphism) */}
      <div className="glass-panel" style={{ padding: '32px 24px', marginBottom: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <p style={{ margin: '0 0 24px', fontSize: '11px', fontWeight: 600, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '.1em' }}>
          Mon code d'accès partenaire
        </p>

        {qrData && !isExpired ? (
          <>
            <div style={{ display: 'inline-block', padding: '16px', background: '#fff', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 0 20px rgba(201,168,76,0.2)' }}>
              <QRCodeSVG value={qrData.url} size={200} fgColor="#0A0A0A" bgColor="#ffffff" />
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.05em' }}>Expiration</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#C9A84C', fontFamily: 'monospace' }}>
                  {mm}:{ss}
                </span>
              </div>
              
              {/* Barre de progression fluide */}
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(secondsLeft / QR_LIFETIME_SEC) * 100}%`,
                  background: 'linear-gradient(90deg, #C9A84C, #D4AF37)',
                  transition: 'width 0.5s linear'
                }} />
              </div>
            </div>
            
            <p style={{ margin: 0, fontSize: '12px', color: '#999', lineHeight: 1.6 }}>
              Présentez ce QR au partenaire.<br />Usage unique et strictement personnel.
            </p>
          </>
        ) : (
          <div style={{ padding: '40px 0' }}>
            <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: 'rgba(201,168,76,0.3)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
                <line x1="15" y1="3" x2="15" y2="21"></line>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="3" y1="15" x2="21" y2="15"></line>
              </svg>
            </div>
            <p style={{ margin: '0 0 8px', color: '#fff', fontSize: '16px', fontWeight: 300 }}>
              {isExpired ? 'Code de sécurité expiré' : 'Aucun code actif'}
            </p>
            <p style={{ margin: 0, color: '#888', fontSize: '12px' }}>
              Générez un nouveau code à présenter lors de votre passage en caisse.
            </p>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#ef4444' }}>{error}</p>
          </div>
        )}

        {(!qrData || isExpired) && (
          <button
            onClick={generateQR}
            disabled={loading}
            className={!loading ? "btn-gold" : ""}
            style={{
              width: '100%', padding: '16px', marginTop: '16px',
              background: loading ? 'rgba(201,168,76,0.5)' : 'linear-gradient(135deg, #C9A84C, #D4AF37)',
              color: loading ? 'rgba(255,255,255,0.7)' : '#0A0A0A', 
              border: 'none', borderRadius: '12px',
              fontSize: '15px', fontWeight: 600, letterSpacing: '.05em',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {loading ? 'GÉNÉRATION EN COURS...' : 'GÉNÉRER MON CODE SÉCURISÉ'}
          </button>
        )}
      </div>

      {/* Bouton déconnexion */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={logout}
          style={{
            padding: '12px 24px',
            background: 'transparent', color: '#666',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px',
            fontSize: '11px', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
