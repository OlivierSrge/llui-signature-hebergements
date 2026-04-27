// app/admin/confirm/[token]/go/page.tsx
// Confirmation automatique côté serveur — aucun JS requis.
// Admin clique le lien email → page confirme directement → affiche résultat.

export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { Resend } from 'resend'
import {
  extraireTypePass,
  extraireDuree,
  calculerDateFin,
  generateTempPassword,
  hashPassword,
  todayDate,
} from '@/lib/pass-vip-helpers'
import { getPassVipActivationEmailHtml } from '@/lib/email-templates/pass-vip-activation'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
const FROM = process.env.FROM_EMAIL ?? 'onboarding@resend.dev'

interface Props {
  params: Promise<{ token: string }>
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,.1)' }}>
        {children}
      </div>
    </div>
  )
}

export default async function AutoConfirmPage({ params }: Props) {
  const { token } = await params

  // ── Charger la commande ─────────────────────────────────────────
  let snap: FirebaseFirestore.QuerySnapshot
  try {
    snap = await db.collection('pass_vip_pending_orders')
      .where('token', '==', token)
      .limit(1)
      .get()
  } catch (e) {
    console.error('[AUTO-CONFIRM] Firestore read error:', e)
    return (
      <Card>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h1 style={{ margin: '0 0 8px', fontFamily: 'Georgia,serif', fontSize: '20px', color: '#991b1b' }}>Erreur serveur</h1>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Impossible de charger la commande. Réessayez.</p>
      </Card>
    )
  }

  if (snap.empty) {
    return (
      <Card>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <h1 style={{ margin: '0 0 8px', fontFamily: 'Georgia,serif', fontSize: '20px', color: '#1a1a1a' }}>Token invalide</h1>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Ce lien est invalide ou a déjà été utilisé.</p>
      </Card>
    )
  }

  const orderDoc = snap.docs[0]
  const order = orderDoc.data()

  // ── Statuts terminaux ───────────────────────────────────────────
  if (order.statut === 'confirmed') {
    return (
      <Card>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <h1 style={{ margin: '0 0 8px', fontFamily: 'Georgia,serif', fontSize: '20px', color: '#166534' }}>Déjà confirmée</h1>
        <p style={{ margin: '0 0 16px', color: '#555', fontSize: '14px' }}>Cette commande a déjà été confirmée. Le client a reçu ses accès.</p>
        <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px', color: '#888' }}>{order.nom_client} — {order.type_pass}</p>
      </Card>
    )
  }

  if (order.statut === 'cancelled') {
    return (
      <Card>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
        <h1 style={{ margin: '0 0 8px', fontFamily: 'Georgia,serif', fontSize: '20px', color: '#991b1b' }}>Commande annulée</h1>
        <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>Cette commande a été annulée.</p>
      </Card>
    )
  }

  // ── Confirmation ────────────────────────────────────────────────
  const {
    nom_client, email_client, tel_client,
    type_pass, montant, code_promo, nom_affilie,
    sheets_row, sheets_id, commission_pourcent,
  } = order

  const passType = extraireTypePass(type_pass as string)
  const duree = extraireDuree(type_pass as string)
  const dateFin = calculerDateFin(duree)
  const dateFinStr = dateFin.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const password = generateTempPassword(nom_client as string)
  const passwordHash = hashPassword(password)
  const now = new Date().toISOString()

  try {
    // 1. Créer le Pass VIP actif
    const passRef = db.collection('pass_vip_boutique').doc()
    await passRef.set({
      email: email_client,
      nom: (nom_client as string).toUpperCase().trim(),
      tel: tel_client ?? '',
      type_pass: passType,
      duree_jours: duree,
      date_achat: now,
      date_debut: now,
      date_fin: dateFin.toISOString(),
      statut: 'actif',
      montant: montant ?? 0,
      code_promo: code_promo ?? null,
      nom_affilie: nom_affilie ?? null,
      password_hash: passwordHash,
      qr_generated_today: 0,
      qr_reset_date: todayDate(),
      created_at: now,
    })
    const passId = passRef.id
    console.log('[AUTO-CONFIRM] Pass VIP créé — id:', passId)

    // 2. Email activation client (non bloquant)
    const loginUrl = `${APP_URL}/pass-vip/login`
    const html = getPassVipActivationEmailHtml({
      nom: nom_client as string,
      type_pass: type_pass as string,
      date_fin: dateFinStr,
      email: email_client as string,
      password,
      login_url: loginUrl,
    })
    const resend = new Resend(process.env.RESEND_API_KEY)
    resend.emails.send({
      from: FROM,
      to: email_client as string,
      subject: `✅ Votre Pass VIP ${passType} est activé — L&Lui Signature`,
      html,
    }).then(() => console.log('[AUTO-CONFIRM] Email client envoyé ✅'))
      .catch((e) => console.error('[AUTO-CONFIRM] Email client erreur ❌', e))

    // 3. Mise à jour Sheets (non bloquant)
    if (sheets_row) {
      import('@/lib/sheets-pass-vip').then(({ updatePassVipStatutSheets }) =>
        updatePassVipStatutSheets(sheets_row as number, sheets_id as string | null)
          .catch((e) => console.warn('[AUTO-CONFIRM] Sheets update erreur:', e))
      )
    }

    // 4. Commission affiliée (non bloquant)
    if (code_promo && montant) {
      const tauxCommission = (commission_pourcent as number | null) ?? 10
      const commissionFcfa = Math.round((montant as number) * tauxCommission / 100)
      db.collection('commissions_canal2').add({
        code: code_promo,
        canal: 'boutique_pass_vip',
        montant_transaction_fcfa: montant,
        commission_fcfa: commissionFcfa,
        taux_commission_pct: tauxCommission,
        statut: 'en_attente',
        pass_id: passId,
        created_at: now,
        confirmee_at: now,
      }).catch((e) => console.warn('[AUTO-CONFIRM] Commission erreur:', e))
    }

    // 5. Marquer commande confirmée
    await orderDoc.ref.update({
      statut: 'confirmed',
      confirmed_at: now,
      pass_id: passId,
    })

    const montantFormatted = new Intl.NumberFormat('fr-FR').format(montant as number)

    return (
      <div style={{ minHeight: '100vh', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '440px', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>✅</div>
            <h1 style={{ margin: '0 0 6px', fontFamily: 'Georgia,serif', fontSize: '22px', color: '#166534' }}>Paiement confirmé !</h1>
            <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>Le Pass VIP est maintenant actif.</p>
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            {[
              ['Client', (nom_client as string).toUpperCase()],
              ['Email', email_client as string],
              ['Pass activé', `Pass VIP ${passType} — ${duree} jours`],
              ['Montant', `${montantFormatted} FCFA`],
              ['Expire le', dateFinStr],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #d1fae5' }}>
                <span style={{ color: '#166534', fontSize: '13px' }}>{label}</span>
                <span style={{ color: '#14532d', fontSize: '13px', fontWeight: 600, textAlign: 'right', maxWidth: '55%' }}>{value}</span>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#555', margin: '0 0 16px' }}>
            Un email d&apos;activation a été envoyé au client avec ses identifiants de connexion.
          </p>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#aaa', margin: 0 }}>✦ L&Lui Signature — Portail Admin</p>
        </div>
      </div>
    )
  } catch (e: unknown) {
    console.error('[AUTO-CONFIRM] Erreur:', e)
    const errMsg = e instanceof Error ? e.message : 'Erreur interne'
    return (
      <Card>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h1 style={{ margin: '0 0 8px', fontFamily: 'Georgia,serif', fontSize: '20px', color: '#991b1b' }}>Erreur de confirmation</h1>
        <p style={{ margin: '0 0 12px', color: '#666', fontSize: '14px' }}>{errMsg}</p>
        <p style={{ margin: 0, fontSize: '12px', color: '#aaa' }}>
          Essayez via{' '}
          <a href={`${APP_URL}/admin/confirm/${token}`} style={{ color: '#10b981' }}>
            la page de confirmation manuelle
          </a>
        </p>
      </Card>
    )
  }
}
