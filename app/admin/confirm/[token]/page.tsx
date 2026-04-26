// app/admin/confirm/[token]/page.tsx — Page confirmation admin (PUBLIQUE via token)
// Auth : token UUID dans l'URL (envoyé par email admin)
// Mobile-first, pas de session admin requise

export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import { PASS_REDUCTIONS } from '@/lib/pass-vip-helpers'
import type { PassType } from '@/lib/pass-vip-helpers'
import ConfirmActions from './ConfirmActions'

interface Props {
  params: Promise<{ token: string }>
}

export default async function AdminConfirmPage({ params }: Props) {
  const { token } = await params

  // Charger la commande depuis Firestore
  const snap = await db.collection('pass_vip_pending_orders')
    .where('token', '==', token)
    .limit(1)
    .get()

  if (snap.empty) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,.1)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h1 style={{ margin: '0 0 8px', fontFamily: 'Georgia,serif', fontSize: '20px', color: '#1a1a1a' }}>Token invalide</h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Ce lien de confirmation est invalide ou a déjà été utilisé.</p>
        </div>
      </div>
    )
  }

  const doc = snap.docs[0]
  const order = { id: doc.id, ...doc.data() } as {
    id: string
    token: string
    nom_client: string
    email_client: string
    tel_client: string
    type_pass: string
    montant: number
    code_promo?: string
    nom_affilie?: string
    commission_pourcent?: number
    date_commande: { _seconds: number } | string
    statut: string
  }

  if (order.statut === 'confirmed') {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,.1)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h1 style={{ margin: '0 0 8px', fontFamily: 'Georgia,serif', fontSize: '20px', color: '#166534' }}>Déjà confirmée</h1>
          <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>Cette commande a déjà été confirmée et le client a reçu ses accès.</p>
        </div>
      </div>
    )
  }

  if (order.statut === 'cancelled') {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,.1)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <h1 style={{ margin: '0 0 8px', fontFamily: 'Georgia,serif', fontSize: '20px', color: '#991b1b' }}>Annulée</h1>
          <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>Cette commande a été annulée.</p>
        </div>
      </div>
    )
  }

  const montantFormatted = new Intl.NumberFormat('fr-FR').format(order.montant)
  const passType = order.type_pass.toUpperCase().includes('DIAMANT') ? 'DIAMANT'
    : order.type_pass.toUpperCase().includes('SAPHIR') ? 'SAPHIR'
    : order.type_pass.toUpperCase().includes('OR') ? 'OR'
    : 'ARGENT' as PassType
  const reductions = PASS_REDUCTIONS[passType]

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', padding: '24px 16px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '.1em' }}>L&Lui ✦ Signature</p>
          <h1 style={{ margin: 0, fontFamily: 'Georgia,serif', fontSize: '22px', color: '#1a1a1a' }}>Confirmation paiement</h1>
        </div>

        {/* Récap commande */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
          <p style={{ margin: '0 0 16px', fontSize: '12px', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Détails de la commande
          </p>

          {[
            ['Client', order.nom_client],
            ['Email', order.email_client],
            ['Téléphone', order.tel_client],
            ['Pass commandé', order.type_pass],
            ['Montant', `${montantFormatted} FCFA`],
            ...(order.code_promo ? [['Code promo', order.code_promo]] : []),
            ...(order.nom_affilie ? [['Affilié', order.nom_affilie]] : []),
            ...(order.commission_pourcent ? [['Commission', `${order.commission_pourcent}%`]] : []),
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ color: '#666', fontSize: '14px' }}>{label}</span>
              <span style={{ color: '#1a1a1a', fontSize: '14px', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Avantages du pass */}
        <div style={{ background: '#FFF8E7', border: '1px solid #E8D5A3', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase' }}>
            Avantages {passType}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, textAlign: 'center', background: '#fff', borderRadius: '8px', padding: '10px' }}>
              <p style={{ margin: '0 0 2px', fontSize: '20px', fontWeight: 700, color: '#C9A84C' }}>{reductions.hebergement}</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>Hébergement</p>
            </div>
            <div style={{ flex: 1, textAlign: 'center', background: '#fff', borderRadius: '8px', padding: '10px' }}>
              <p style={{ margin: '0 0 2px', fontSize: '20px', fontWeight: 700, color: '#C9A84C' }}>{reductions.restaurant}</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>Restaurant</p>
            </div>
          </div>
        </div>

        {/* Boutons confirmation/annulation */}
        <ConfirmActions
          token={token}
          orderData={{
            nom_client: order.nom_client,
            email_client: order.email_client,
            type_pass: order.type_pass,
            montant: order.montant,
          }}
        />

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#aaa', marginTop: '20px' }}>
          ✦ L&Lui Signature — Portail Admin
        </p>
      </div>
    </div>
  )
}
