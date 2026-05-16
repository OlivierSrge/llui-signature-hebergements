'use client'

import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import PopupCalendrier from '@/components/calendrier/PopupCalendrier'

interface PassData {
  id: string
  nom: string
  type_pass: string
  date_fin: string
  statut: string
}

const QR_LIFETIME_SEC = 300 // 5 minutes
const BOUTIQUE_URL = 'https://l-et-lui-signature.netlify.app'

export default function PassVipDashboardClient({ pass }: { pass: PassData }) {
  const [qrData, setQrData] = useState<{ url: string; expiresAt: number } | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCalendrierOpen, setIsCalendrierOpen] = useState(false)

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

  // Listener global pour le calendrier (au cas où d'autres composants déclenchent l'événement)
  useEffect(() => {
    const handler = () => setIsCalendrierOpen(true)
    document.addEventListener('openCalendrier', handler)
    return () => document.removeEventListener('openCalendrier', handler)
  }, [])

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

      {/* Services VIP */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ margin: '0 0 16px', fontSize: '11px', fontWeight: 600, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '.1em', textAlign: 'center' }}>
          Privilèges & Services
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Boutique */}
          <a href={BOUTIQUE_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A84C' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 500, color: '#fff' }}>Boutique Signature</p>
                <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>Découvrez nos articles exclusifs</p>
              </div>
              <div style={{ color: '#666' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            </div>
          </a>

          {/* Calendrier Kribi */}
          <div className="glass-panel" onClick={() => document.dispatchEvent(new Event('openCalendrier'))} style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A84C' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 500, color: '#fff' }}>Agenda de Kribi</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>Événements et recommandations</p>
            </div>
            <div style={{ color: '#666' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>

          {/* Offrir le Pass */}
          <a href={BOUTIQUE_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease', border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.05)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #C9A84C, #D4AF37)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 12 20 22 4 22 4 12"></polyline>
                  <rect x="2" y="7" width="20" height="5"></rect>
                  <line x1="12" y1="22" x2="12" y2="7"></line>
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 500, color: '#C9A84C' }}>Offrir un Pass</p>
                <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>Parrainez ou gâtez un proche</p>
              </div>
              <div style={{ color: '#C9A84C' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            </div>
          </a>

        </div>
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

      {/* Rendu de la popup calendrier pour l'espace VIP */}
      <PopupCalendrier isOpen={isCalendrierOpen} onClose={() => setIsCalendrierOpen(false)} />
    </div>
  )
}
