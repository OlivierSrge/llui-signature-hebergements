// lib/alliance-privee-notifications.ts — Notifications matching & chat Alliance Privée
// NE PAS importer twilio — utiliser fetch /api/whatsapp/send

import { sendBrevoEmail } from '@/lib/email-brevo'
import { db } from '@/lib/firebase'

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
const COL_PORTRAITS = 'alliance_privee_portraits_verified'

// ─── Helper WhatsApp ──────────────────────────────────────────────────────────

async function sendWhatsApp(telephone: string, message: string): Promise<void> {
  try {
    await fetch(`${APP_URL}/api/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ADMIN_API_KEY ?? ''}`,
      },
      body: JSON.stringify({ telephone, message }),
    })
  } catch (e) {
    console.warn('[AllianceNotif] WhatsApp erreur:', e)
  }
}

// ─── Récupérer coordonnées d'un membre ───────────────────────────────────────

interface MemberContact {
  prenom: string
  telephone?: string
  email?: string
}

async function getMemberContact(memberId: string): Promise<MemberContact | null> {
  const snap = await db.collection(COL_PORTRAITS).doc(memberId).get()
  if (!snap.exists) return null
  const d = snap.data()!
  return { prenom: d.prenom, telephone: d.telephone, email: d.email }
}

// ─── 1. Intérêt reçu ─────────────────────────────────────────────────────────

export async function sendInterestReceivedNotification(
  toMemberId: string,
  fromMemberId: string
): Promise<void> {
  const [to, from] = await Promise.all([
    getMemberContact(toMemberId),
    getMemberContact(fromMemberId),
  ])
  if (!to || !from) return

  const dashboardUrl = `${APP_URL}/alliance-privee/interets-recus`

  // WhatsApp
  if (to.telephone) {
    await sendWhatsApp(
      to.telephone,
      `🌟 Alliance Privée — Bonjour ${to.prenom} !\n\nQuelqu'un s'intéresse à votre profil.\n\nConsultez vos intérêts : ${dashboardUrl}`
    )
  }

  // Email
  if (to.email) {
    await sendBrevoEmail({
      to: [{ email: to.email, name: to.prenom }],
      subject: '🌟 Quelqu\'un s\'intéresse à vous — Alliance Privée',
      html: `
        <div style="background:#0A0A0A;padding:40px;font-family:Georgia,serif;color:#F5F0E8;max-width:560px;margin:auto">
          <div style="text-align:center;margin-bottom:32px">
            <p style="color:#D4AF37;letter-spacing:4px;font-size:12px;margin:0">L&amp;LUI · ALLIANCE PRIVÉE</p>
            <h1 style="color:#F5F0E8;font-size:24px;margin:16px 0">Quelqu'un s'intéresse à vous</h1>
            <div style="width:60px;height:1px;background:#D4AF37;margin:0 auto"></div>
          </div>
          <p style="color:#D4AF37;font-size:18px">Bonjour ${to.prenom},</p>
          <p style="color:#F5F0E8;opacity:0.8">Un membre de l'Alliance a marqué son intérêt pour votre profil.<br/>Si vous ressentez la même chose, marquez votre intérêt — un match sera créé.</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${dashboardUrl}" style="background:#D4AF37;color:#0A0A0A;padding:14px 32px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block">
              Voir mes intérêts reçus
            </a>
          </div>
          <p style="color:#D4AF37;opacity:0.5;font-size:11px;text-align:center">Alliance Privée · Discrétion garantie</p>
        </div>
      `,
    }).catch((e) => console.warn('[AllianceNotif] Email intérêt reçu:', e))
  }
}

// ─── 2. Intérêt mutuel (Match) ────────────────────────────────────────────────

export async function sendMutualInterestNotification(
  memberAId: string,
  memberBId: string,
  matchId: string
): Promise<void> {
  const [memberA, memberB] = await Promise.all([
    getMemberContact(memberAId),
    getMemberContact(memberBId),
  ])
  if (!memberA || !memberB) return

  const chatUrl = `${APP_URL}/alliance-privee/chat/${matchId}`

  // Notifier membre A
  if (memberA.telephone) {
    await sendWhatsApp(
      memberA.telephone,
      `💎 Alliance Privée — C'est un Match, ${memberA.prenom} !\n\nVotre intérêt a été partagé. Le chat sécurisé est maintenant ouvert.\n\n→ ${chatUrl}`
    )
  }
  if (memberA.email) {
    await sendMatchEmail(memberA, chatUrl)
  }

  // Notifier membre B
  if (memberB.telephone) {
    await sendWhatsApp(
      memberB.telephone,
      `💎 Alliance Privée — C'est un Match, ${memberB.prenom} !\n\nVotre intérêt a été partagé. Le chat sécurisé est maintenant ouvert.\n\n→ ${chatUrl}`
    )
  }
  if (memberB.email) {
    await sendMatchEmail(memberB, chatUrl)
  }
}

async function sendMatchEmail(member: MemberContact, chatUrl: string): Promise<void> {
  await sendBrevoEmail({
    to: [{ email: member.email!, name: member.prenom }],
    subject: '💎 C\'est un Match — Alliance Privée',
    html: `
      <div style="background:#0A0A0A;padding:40px;font-family:Georgia,serif;color:#F5F0E8;max-width:560px;margin:auto">
        <div style="text-align:center;margin-bottom:32px">
          <p style="color:#D4AF37;letter-spacing:4px;font-size:12px;margin:0">L&amp;LUI · ALLIANCE PRIVÉE</p>
          <h1 style="color:#D4AF37;font-size:28px;margin:16px 0">💎 C'est un Match !</h1>
          <div style="width:60px;height:1px;background:#D4AF37;margin:0 auto"></div>
        </div>
        <p style="color:#D4AF37;font-size:18px">Félicitations, ${member.prenom} !</p>
        <p style="color:#F5F0E8;opacity:0.8">
          Votre intérêt est partagé. Le chat sécurisé Alliance Privée est maintenant ouvert.<br/><br/>
          <strong style="color:#D4AF37">Sentinelle IA</strong> veille à la qualité et la sécurité de vos échanges.
          L'échange de coordonnées directes est réservé aux rendez-vous officiels organisés par L&amp;Lui.
        </p>
        <div style="text-align:center;margin:32px 0">
          <a href="${chatUrl}" style="background:#D4AF37;color:#0A0A0A;padding:14px 32px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block">
            Ouvrir le Chat Sécurisé
          </a>
        </div>
        <p style="color:#D4AF37;opacity:0.5;font-size:11px;text-align:center">Alliance Privée · Discrétion · Excellence · Sécurité</p>
      </div>
    `,
  }).catch((e) => console.warn('[AllianceNotif] Email match:', e))
}

// ─── 3. Nouveau message ───────────────────────────────────────────────────────

export async function sendNewMessageNotification(
  recipientId: string,
  senderPrenom: string,
  matchId: string,
  apercu: string
): Promise<void> {
  const recipient = await getMemberContact(recipientId)
  if (!recipient) return

  const chatUrl = `${APP_URL}/alliance-privee/chat/${matchId}`
  const apercu60 = apercu.length > 60 ? apercu.substring(0, 57) + '…' : apercu

  if (recipient.telephone) {
    await sendWhatsApp(
      recipient.telephone,
      `💬 Alliance Privée — Message de ${senderPrenom} :\n"${apercu60}"\n\n→ ${chatUrl}`
    )
  }
}
