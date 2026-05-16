// app/pass-vip/dashboard/page.tsx — Dashboard client Pass VIP (protégé)

export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/firebase'
import { parseSession, PASS_VIP_COOKIE, PASS_BADGE_COLORS, PASS_REDUCTIONS, PASS_LABELS } from '@/lib/pass-vip-helpers'
import type { PassType } from '@/lib/pass-vip-helpers'
import PassVipDashboardClient from './PassVipDashboardClient'

export default async function PassVipDashboardPage() {
  // ── Auth cookie ─────────────────────────────────────────────────
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(PASS_VIP_COOKIE)?.value
  const passId = parseSession(sessionCookie)

  if (!passId) {
    redirect('/pass-vip/login')
  }

  // ── Charger le Pass VIP ─────────────────────────────────────────
  const doc = await db.collection('pass_vip_boutique').doc(passId).get()
  if (!doc.exists) {
    redirect('/pass-vip/login')
  }

  const pass = { id: doc.id, ...doc.data() } as {
    id: string
    nom: string
    email: string
    type_pass: PassType
    duree_jours: number
    date_debut: string
    date_fin: string
    statut: string
    montant: number
    qr_generated_today: number
  }

  if (pass.statut !== 'actif') {
    redirect('/pass-vip/login')
  }

  // Vérifier expiration
  if (new Date(pass.date_fin) < new Date()) {
    redirect('/pass-vip/login')
  }

  const badgeColor = PASS_BADGE_COLORS[pass.type_pass]
  const reductions = PASS_REDUCTIONS[pass.type_pass]
  const passLabel = PASS_LABELS[pass.type_pass]

  const dateFinDisplay = new Date(pass.date_fin).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const joursRestants = Math.max(0, Math.ceil(
    (new Date(pass.date_fin).getTime() - Date.now()) / 86400000
  ))

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', padding: '24px 16px', position: 'relative', overflow: 'hidden' }}>
      
      {/* Lueur de fond dorée subtile */}
      <div style={{
        position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
        width: '100vw', height: '400px', background: 'radial-gradient(ellipse at top, rgba(201,168,76,0.15) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none'
      }} />

      <style>{`
        .vip-card {
          position: relative;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .vip-card::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
          transform: skewX(-25deg);
          animation: shine 6s infinite;
        }
        @keyframes shine {
          0% { left: -100%; }
          20% { left: 200%; }
          100% { left: 200%; }
        }
        .glass-panel {
          background: rgba(20, 20, 20, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(201, 168, 76, 0.2);
          border-radius: 16px;
        }
      `}</style>

      <div style={{ maxWidth: '480px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '.15em' }}>L&Lui ✦ Signature</p>
          <h1 style={{ margin: 0, fontFamily: 'Georgia,serif', fontSize: '22px', color: '#fff', fontWeight: 400 }}>Mon Pass VIP</h1>
        </div>

        {/* Carte Pass (Glass & Shine) */}
        <div className="vip-card" style={{
          background: `linear-gradient(135deg, ${badgeColor.bg}, #111)`,
          borderRadius: '20px',
          padding: '28px',
          marginBottom: '24px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '10px', color: badgeColor.text, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                  Club Privilège
                </p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: badgeColor.text, fontFamily: 'Georgia,serif' }}>
                  {passLabel}
                </p>
              </div>
              <div style={{ width: '32px', height: '32px', opacity: 0.8 }}>
                {/* Icône étoile filante premium */}
                <svg viewBox="0 0 24 24" fill="none" stroke={badgeColor.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            </div>
            
            <p style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 300, color: badgeColor.text, letterSpacing: '.05em', textTransform: 'uppercase' }}>
              {pass.nom}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '10px', color: badgeColor.text, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Valide jusqu'au</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: badgeColor.text }}>{dateFinDisplay}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', borderRadius: '12px', padding: '6px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: badgeColor.text, letterSpacing: '.05em' }}>
                    {joursRestants} JOURS
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Avantages Glassmorphism */}
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <p style={{ margin: '0 0 16px', fontSize: '11px', fontWeight: 600, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '.1em', textAlign: 'center' }}>
            Mes réductions garanties
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            {/* Hébergement */}
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '24px', height: '24px', margin: '0 auto 8px', color: '#C9A84C' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '.05em' }}>Hébergement</p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 300, color: '#fff' }}>{reductions.hebergement}</p>
            </div>
            
            {/* Restaurant */}
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '24px', height: '24px', margin: '0 auto 8px', color: '#C9A84C' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20"></path>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '.05em' }}>Restaurant</p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 300, color: '#fff' }}>{reductions.restaurant}</p>
            </div>
          </div>
        </div>

        {/* QR Code + actions (Client Component) */}
        <PassVipDashboardClient pass={{
          id: pass.id,
          nom: pass.nom,
          type_pass: pass.type_pass,
          date_fin: pass.date_fin,
          statut: pass.statut,
        }} />
      </div>
    </div>
  )
}
