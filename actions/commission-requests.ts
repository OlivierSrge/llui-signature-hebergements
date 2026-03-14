'use server'

import { db } from '@/lib/firebase'
import { loadAdminPaymentSettings } from './payment-settings'
import { Resend } from 'resend'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CommissionRequest {
  id: string
  partnerId: string
  partnerName: string
  ref: string
  month: number
  year: number
  totalAmount: number
  reservationsCount: number
  status: 'generated' | 'sent_whatsapp' | 'sent_email' | 'paid'
  generatedAt: string
  sentAt: string | null
  paidAt: string | null
  pdfUrl: string | null
}

// ── Actions ──────────────────────────────────────────────────────────────────

export async function getAdminPaymentSettingsForPDF() {
  return loadAdminPaymentSettings()
}

export async function getPartnerForCommission(partnerId: string) {
  const doc = await db.collection('partenaires').doc(partnerId).get()
  if (!doc.exists) return null
  const d = doc.data()!
  return {
    id: doc.id,
    name: d.name || '',
    email: d.email || '',
    whatsapp_number: d.whatsapp_number || d.phone || '',
    plan: d.plan || d.subscription_plan || '',
  }
}

export async function saveCommissionRequest(data: {
  partnerId: string
  partnerName: string
  ref: string
  month: number
  year: number
  totalAmount: number
  reservationsCount: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString()
    const docRef = db
      .collection('partenaires')
      .doc(data.partnerId)
      .collection('commissionRequests')
      .doc(data.ref)

    const existing = await docRef.get()
    if (existing.exists) {
      // Mise à jour uniquement des champs volatils
      await docRef.update({ totalAmount: data.totalAmount, reservationsCount: data.reservationsCount })
    } else {
      await docRef.set({
        ref: data.ref,
        partnerName: data.partnerName,
        month: data.month,
        year: data.year,
        totalAmount: data.totalAmount,
        reservationsCount: data.reservationsCount,
        status: 'generated',
        generatedAt: now,
        sentAt: null,
        paidAt: null,
        pdfUrl: null,
      })
    }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateCommissionRequestStatus(
  partnerId: string,
  ref: string,
  status: 'sent_whatsapp' | 'sent_email' | 'paid'
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString()
    const updates: Record<string, any> = { status }
    if (status === 'paid') updates.paidAt = now
    else updates.sentAt = now

    await db
      .collection('partenaires')
      .doc(partnerId)
      .collection('commissionRequests')
      .doc(ref)
      .update(updates)

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function markCommissionRequestPaid(
  partnerId: string,
  ref: string
): Promise<{ success: boolean; error?: string }> {
  return updateCommissionRequestStatus(partnerId, ref, 'paid')
}

export async function getAllCommissionRequests(): Promise<CommissionRequest[]> {
  const partnersSnap = await db.collection('partenaires').get()
  const all: CommissionRequest[] = []

  for (const partnerDoc of partnersSnap.docs) {
    const reqSnap = await partnerDoc.ref.collection('commissionRequests').get()
    reqSnap.docs.forEach((d) => {
      all.push({ id: d.id, partnerId: partnerDoc.id, ...d.data() } as CommissionRequest)
    })
  }

  return all.sort((a, b) => (b.generatedAt || '').localeCompare(a.generatedAt || ''))
}

export async function sendCommissionEmailAction(params: {
  partnerEmail: string
  partnerName: string
  month: number
  year: number
  totalAmount: number
  ref: string
  limitDate: string
  omNumber: string
  revolutLink: string
  pdfBase64: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.FROM_EMAIL ?? 'onboarding@resend.dev'

    const MONTH_NAMES_FR = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
    ]
    const monthName = MONTH_NAMES_FR[(params.month - 1)] || ''
    const fmtAmount = new Intl.NumberFormat('fr-FR').format(Math.round(params.totalAmount))

    const bodyHtml = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:#1a1a1a;padding:28px 32px;text-align:center">
      <span style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#fff">
        L<span style="color:#c9a227">&</span>Lui Signature
      </span>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:20px;color:#1a1a1a">
        Demande de règlement de commissions
      </h2>
      <p style="margin:0 0 20px;color:#555;line-height:1.6">
        Bonjour <strong>${params.partnerName}</strong>,<br><br>
        Veuillez trouver ci-joint votre demande de règlement des commissions L&amp;Lui Signature
        pour le mois de <strong>${monthName} ${params.year}</strong>.
      </p>
      <div style="background:#f5f0eb;border-radius:10px;padding:16px 20px;margin-bottom:20px">
        <p style="margin:0 0 4px;font-size:13px;color:#888">Montant dû</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#c9a227">${fmtAmount} FCFA</p>
        <p style="margin:4px 0 0;font-size:12px;color:#aaa">Référence : ${params.ref}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 24px">
        <tr style="border-bottom:1px solid #e8e0d5">
          <td style="padding:8px 0;color:#666">Date limite de paiement</td>
          <td style="padding:8px 0;font-weight:600;color:#1a1a1a">${params.limitDate}</td>
        </tr>
      </table>
      <p style="font-size:14px;color:#555;font-weight:600;margin:0 0 8px">Modes de paiement acceptés :</p>
      <p style="margin:0 0 4px;font-size:13px;color:#333">📱 Orange Money : <strong>${params.omNumber}</strong></p>
      <p style="margin:0 0 20px;font-size:13px;color:#333">💳 Revolut : <a href="${params.revolutLink}" style="color:#c9a227">${params.revolutLink}</a></p>
      <p style="font-size:13px;color:#888;font-style:italic">
        Le document officiel de demande de paiement est joint à cet email en pièce jointe PDF.
      </p>
    </div>
    <div style="background:#f5f0eb;padding:16px 32px;text-align:center;font-size:12px;color:#999">
      © L&amp;Lui Signature — Kribi, Cameroun
    </div>
  </div>
</body>
</html>`

    await resend.emails.send({
      from,
      to: params.partnerEmail,
      subject: `Demande de règlement commissions ${monthName} ${params.year} — L&Lui Signature`,
      html: bodyHtml,
      attachments: [
        {
          filename: `Demande_Commission_${params.partnerName.replace(/\s+/g, '_')}_${monthName}_${params.year}.pdf`,
          content: Buffer.from(params.pdfBase64, 'base64'),
        },
      ],
    })

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
