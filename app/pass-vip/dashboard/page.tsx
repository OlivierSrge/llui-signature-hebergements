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
    <div style={{ minHeight: '100vh', background: '#F5F0E8', padding: '20px 16px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '.1em' }}>L&Lui ✦ Signature</p>
          <h1 style={{ margin: 0, fontFamily: 'Georgia,serif', fontSize: '20px', color: '#1a1a1a' }}>Mon Pass VIP</h1>
        </div>

        {/* Carte Pass */}
        <div style={{
          background: `linear-gradient(135deg, ${badgeColor.bg}, ${badgeColor.bg}cc)`,
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,.15)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: badgeColor.text, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '.08em' }}>
              Club VIP L&Lui Signature
            </p>
            <p style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 700, color: badgeColor.text }}>
              {passLabel}
            </p>
            <p style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600, color: badgeColor.text }}>
              {pass.nom}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '11px', color: badgeColor.text, opacity: 0.7 }}>Valide jusqu'au</p>
                <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: badgeColor.text }}>{dateFinDisplay}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '4px 12px' }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: badgeColor.text }}>
                    {joursRestants}j restants
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Avantages */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
          <p style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Mes réductions garanties
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[
              { label: '🏠 Hébergement', value: reductions.hebergement },
              { label: '🍽️ Restaurant', value: reductions.restaurant },
            ].map(({ label, value }) => (
              <div key={label} style={{ flex: 1, background: '#F5F0E8', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#888' }}>{label}</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#C9A84C' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* QR Code + actions */}
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
