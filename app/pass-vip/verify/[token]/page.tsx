// app/pass-vip/verify/[token]/page.tsx — Page vérification partenaire (PUBLIQUE)
// Scan QR → vérifie token → affiche infos pass + bouton "Enregistrer utilisation"

export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import { PASS_REDUCTIONS, PASS_BADGE_COLORS, PASS_LABELS } from '@/lib/pass-vip-helpers'
import type { PassType } from '@/lib/pass-vip-helpers'
import VerifyActions from './VerifyActions'

interface Props {
  params: Promise<{ token: string }>
}

export default async function VerifyTokenPage({ params }: Props) {
  const { token } = await params

  // ── Charger le QR token ─────────────────────────────────────────
  const tokenDoc = await db.collection('qr_tokens').doc(token).get()

  if (!tokenDoc.exists) {
    return <ErrorPage title="Token invalide" message="Ce QR code ne correspond à aucun token valide." />
  }

  const qr = tokenDoc.data()!
  const now = new Date()

  if (qr.used) {
    return <ErrorPage title="Déjà utilisé" message="Ce QR code a déjà été scanné et utilisé." />
  }

  if (new Date(qr.expires_at as string) < now) {
    return <ErrorPage title="Code expiré" message="Ce QR code a expiré. Le client doit en générer un nouveau (valide 5 min)." />
  }

  // ── Charger le Pass VIP associé ─────────────────────────────────
  const passDoc = await db.collection('pass_vip_boutique').doc(qr.pass_id as string).get()

  if (!passDoc.exists) {
    return <ErrorPage title="Pass introuvable" message="Le Pass VIP associé n'existe pas." />
  }

  const pass = { id: passDoc.id, ...passDoc.data() } as {
    id: string
    nom: string
    email: string
    type_pass: PassType
    date_fin: string
    statut: string
  }

  if (pass.statut !== 'actif') {
    return <ErrorPage title="Pass inactif" message="Ce Pass VIP n'est plus actif." />
  }

  if (new Date(pass.date_fin) < now) {
    return <ErrorPage title="Pass expiré" message="Ce Pass VIP a expiré." />
  }

  const badgeColor = PASS_BADGE_COLORS[pass.type_pass]
  const reductions = PASS_REDUCTIONS[pass.type_pass]
  const passLabel = PASS_LABELS[pass.type_pass]

  const dateFinDisplay = new Date(pass.date_fin).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const secondsLeft = Math.max(0, Math.ceil(
    (new Date(qr.expires_at as string).getTime() - now.getTime()) / 1000
  ))

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', padding: '20px 16px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Bannière VALIDE */}
        <div style={{ background: '#22c55e', borderRadius: '16px', padding: '16px 20px', marginBottom: '16px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff' }}>✅ PASS VIP VALIDE</p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>
            Code valide encore ~{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
          </p>
        </div>

        {/* Infos client */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
          <p style={{ margin: '0 0 16px', fontSize: '12px', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Titulaire du Pass
          </p>
          <p style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 700, color: '#1a1a1a' }}>{pass.nom}</p>
          <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#888' }}>{pass.email}</p>

          <div style={{
            display: 'inline-block',
            background: badgeColor.bg,
            color: badgeColor.text,
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 700,
            marginBottom: '12px',
          }}>
            {passLabel}
          </div>

          <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#666' }}>
            Valide jusqu'au <strong>{dateFinDisplay}</strong>
          </p>
        </div>

        {/* Réductions applicables */}
        <div style={{ background: '#FFF8E7', border: '2px solid #C9A84C', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
          <p style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Réductions à appliquer
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[
              { label: '🏠 Hébergement', value: reductions.hebergement },
              { label: '🍽️ Restaurant', value: reductions.restaurant },
            ].map(({ label, value }) => (
              <div key={label} style={{ flex: 1, background: '#fff', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#888' }}>{label}</p>
                <p style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#C9A84C' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bouton enregistrer utilisation */}
        <VerifyActions token={token} passNom={pass.nom} />

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#aaa', marginTop: '16px' }}>
          ✦ L&Lui Signature — Vérification Pass VIP
        </p>
      </div>
    </div>
  )
}

function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,.1)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <h1 style={{ margin: '0 0 8px', fontFamily: 'Georgia,serif', fontSize: '20px', color: '#991b1b' }}>{title}</h1>
        <p style={{ margin: 0, color: '#666', fontSize: '14px', lineHeight: 1.6 }}>{message}</p>
      </div>
    </div>
  )
}
