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
      {/* Zone QR Code */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', textAlign: 'center' }}>
        <p style={{ margin: '0 0 16px', fontSize: '12px', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Mon code QR Pass VIP
        </p>

        {qrData && !isExpired ? (
          <>
            <div style={{ display: 'inline-block', padding: '16px', background: '#fff', border: '3px solid #C9A84C', borderRadius: '12px', marginBottom: '12px' }}>
              <QRCodeSVG value={qrData.url} size={180} fgColor="#1a1a1a" bgColor="#ffffff" />
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '8px 16px', display: 'inline-block', marginBottom: '12px' }}>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#166534', fontFamily: 'monospace' }}>
                {mm}:{ss}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>
              Présentez ce QR au partenaire — usage unique, expire dans {mm}:{ss}
            </p>
          </>
        ) : (
          <div style={{ padding: '32px 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '12px', opacity: 0.3 }}>📱</div>
            <p style={{ margin: '0 0 4px', color: '#888', fontSize: '14px' }}>
              {isExpired ? 'Code expiré — générez-en un nouveau' : 'Aucun code actif'}
            </p>
          </div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#dc2626' }}>{error}</p>
          </div>
        )}

        {(!qrData || isExpired) && (
          <button
            onClick={generateQR}
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? '#e5c882' : 'linear-gradient(135deg, #C9A84C, #D4AF37)',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Génération...' : '📲 Générer mon code QR'}
          </button>
        )}
      </div>

      {/* Bouton déconnexion */}
      <button
        onClick={logout}
        style={{
          width: '100%', padding: '12px',
          background: 'transparent', color: '#888',
          border: '1px solid #ddd', borderRadius: '10px',
          fontSize: '14px', cursor: 'pointer',
        }}
      >
        Se déconnecter
      </button>
    </div>
  )
}
