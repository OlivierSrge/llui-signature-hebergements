// app/api/faire-part/envoyer-email/route.ts
// POST — Envoie les invitations numériques Diane & Charly par email (Resend)
// Auth : Bearer ADMIN_API_KEY
// Body : { marie_uid: string, invites: Array<{ prenom: string; nom: string; email: string }> }

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
const FROM = process.env.FROM_EMAIL ?? 'onboarding@resend.dev'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

function formatDateLong(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return iso }
}

function buildHtml(opts: {
  prenom: string
  noms_maries: string
  date_mariage: string
  lieu: string
  faire_part_url: string
  message: string
  principal: string
  accent: string
}): string {
  const { prenom, noms_maries, date_mariage, lieu, faire_part_url, message, principal, accent } = opts
  const dateLong = formatDateLong(date_mariage)

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Invitation — ${noms_maries}</title>
</head>
<body style="margin:0;padding:0;background:#0D2137;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D2137;min-height:100vh;">
<tr><td align="center" style="padding:40px 20px;">
<table width="100%" style="max-width:520px;background:linear-gradient(160deg,#1B4F72 0%,#0A1E2F 100%);border-radius:24px;overflow:hidden;border:1px solid ${accent}22;">

  <!-- En-tête -->
  <tr><td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid ${accent}15;">
    <p style="margin:0 0 16px;font-size:11px;letter-spacing:5px;text-transform:uppercase;color:${accent}99;">L&amp;Lui Signature</p>
    <p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.4);">Vous êtes cordialement invité(e) à célébrer</p>
    <h1 style="margin:0;font-size:36px;color:white;font-family:Georgia,serif;line-height:1.2;">${noms_maries}</h1>
    <div style="margin:20px auto;width:60px;height:1px;background:${accent}60;"></div>
  </td></tr>

  <!-- Corps -->
  <tr><td style="padding:32px 40px;text-align:center;">

    <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${accent}80;">Cher(e) ${prenom},</p>
    <p style="margin:0 0 28px;font-size:14px;color:rgba(255,255,255,0.65);line-height:1.7;">
      Diane &amp; Charly ont le bonheur de vous inviter à partager ce jour exceptionnel.
    </p>

    <!-- Date & lieu -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.05);border-radius:16px;margin-bottom:28px;border:1px solid ${accent}18;">
    <tr><td style="padding:24px;text-align:center;">
      <p style="margin:0 0 4px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${accent}80;">Le</p>
      <p style="margin:0 0 12px;font-size:18px;font-family:Georgia,serif;color:white;">${dateLong}</p>
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.55);">📍 ${lieu}</p>
    </td></tr>
    </table>

    <!-- Message personnel -->
    ${message ? `<p style="margin:0 0 28px;font-size:13px;color:rgba(255,255,255,0.55);font-style:italic;line-height:1.7;padding:20px 24px;background:rgba(255,255,255,0.03);border-radius:12px;border-left:3px solid ${accent}50;">&ldquo;${message}&rdquo;</p>` : ''}

    <!-- CTA -->
    <a href="${faire_part_url}"
       style="display:inline-block;padding:16px 40px;background:linear-gradient(90deg,${principal},${accent});color:white;text-decoration:none;border-radius:16px;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1px;">
      Voir l&apos;invitation complète
    </a>

    <p style="margin:20px 0 0;font-size:12px;color:rgba(255,255,255,0.3);">
      RSVP &amp; programme complet sur la page d&apos;invitation
    </p>

  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 40px;text-align:center;border-top:1px solid ${accent}15;">
    <p style="margin:0 0 4px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.4);">L&amp;Lui Signature</p>
    <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.2);">Organisateur de mariage · Kribi, Cameroun</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

interface Invite {
  prenom: string
  nom: string
  email: string
}

export async function POST(req: NextRequest) {
  // Auth
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ') || auth.slice(7) !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY manquante' }, { status: 500 })
  }

  let body: { marie_uid?: string; invites?: Invite[] }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const { marie_uid, invites } = body
  if (!marie_uid || !Array.isArray(invites) || invites.length === 0) {
    return NextResponse.json({ error: 'marie_uid et invites[] requis' }, { status: 400 })
  }

  // Charger les données du mariage
  let marieData: Record<string, unknown>
  try {
    const db = getDb()
    const snap = await db.collection('portail_users').doc(marie_uid).get()
    if (!snap.exists) return NextResponse.json({ error: 'Mariage introuvable' }, { status: 404 })
    marieData = snap.data()!
  } catch (e) {
    console.error('[faire-part/envoyer-email] Firestore:', e)
    return NextResponse.json({ error: 'Erreur Firestore' }, { status: 500 })
  }

  const noms_maries = (marieData.noms_maries as string) || 'Les Mariés'
  const date_mariage = (marieData.date_mariage as string) || ''
  const lieu = (marieData.lieu as string) || 'Kribi, Cameroun'
  const message = (marieData.message_faire_part as string) || ''
  const theme = (marieData.theme as Record<string, string>) || {}
  const principal = theme.principal || '#1B4F72'
  const accent = theme.accent || '#C9A84C'
  const faire_part_url = `${APP_URL}/faire-part/${marie_uid}`

  const resend = getResend()
  const results: { email: string; status: 'sent' | 'skipped' | 'error'; error?: string }[] = []

  for (const invite of invites) {
    // Skip si pas d'email
    if (!invite.email?.trim()) {
      results.push({ email: '', status: 'skipped' })
      continue
    }

    const html = buildHtml({
      prenom: invite.prenom || 'Cher invité',
      noms_maries, date_mariage, lieu, message, faire_part_url, principal, accent,
    })

    try {
      await resend.emails.send({
        from: FROM,
        to: invite.email.trim(),
        subject: `💍 Invitation au mariage de ${noms_maries}`,
        html,
      })
      results.push({ email: invite.email, status: 'sent' })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[faire-part/email] ${invite.email}: ${msg}`)
      results.push({ email: invite.email, status: 'error', error: msg })
    }
  }

  const sent = results.filter(r => r.status === 'sent').length
  const errors = results.filter(r => r.status === 'error').length

  return NextResponse.json({ success: true, sent, errors, results })
}
