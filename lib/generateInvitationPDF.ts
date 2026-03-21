// lib/generateInvitationPDF.ts — PDF A5 invitation mariage personnalisé avec QR code

import { jsPDF } from 'jspdf'
import { getMagicLinkUrl } from '@/lib/generateMagicLink'

export interface InviteForPDF {
  id: string
  nom: string
  magic_link_slug: string
}

export interface MariageForPDF {
  noms_maries: string
  date_evenement: string | null   // ISO string
  lieu: string
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export async function generateInvitationPDF(
  invite: InviteForPDF,
  mariage: MariageForPDF
): Promise<void> {
  // jsPDF A5 : 148 × 210 mm, portrait
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
  const W = 148; const H = 210
  const or = '#C9A84C'; const noir = '#1A1A1A'; const gris = '#666666'

  // Fond blanc
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, H, 'F')

  // Bordure dorée
  doc.setDrawColor(201, 168, 76)
  doc.setLineWidth(1.2)
  doc.rect(6, 6, W - 12, H - 12, 'S')
  doc.setLineWidth(0.3)
  doc.rect(8, 8, W - 16, H - 16, 'S')

  // En-tête — Logo
  doc.setFontSize(14)
  doc.setTextColor(201, 168, 76)
  doc.setFont('helvetica', 'bolditalic')
  doc.text('L&Lui Signature', W / 2, 20, { align: 'center' })

  // Séparateur fin
  doc.setDrawColor(201, 168, 76); doc.setLineWidth(0.4)
  doc.line(25, 24, W - 25, 24)

  // Titre Invitation
  doc.setFontSize(22)
  doc.setTextColor(26, 26, 26)
  doc.setFont('helvetica', 'bold')
  doc.text('Invitation', W / 2, 38, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(102, 102, 102)
  doc.text('au mariage de', W / 2, 46, { align: 'center' })

  // Noms mariés
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bolditalic')
  doc.setTextColor(201, 168, 76)
  doc.text(mariage.noms_maries, W / 2, 58, { align: 'center' })

  // Séparateur
  doc.setDrawColor(201, 168, 76); doc.setLineWidth(0.3)
  doc.line(35, 63, W - 35, 63)

  // Date & lieu
  if (mariage.date_evenement) {
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 26)
    doc.text(`Le ${fmtDate(mariage.date_evenement)}`, W / 2, 72, { align: 'center' })
  }
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(102, 102, 102)
  doc.text(`${mariage.lieu || 'Kribi'} — Cameroun`, W / 2, 79, { align: 'center' })

  // Séparateur
  doc.setDrawColor(220, 210, 180); doc.setLineWidth(0.2)
  doc.line(20, 85, W - 20, 85)

  // Destinataire
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 26)
  doc.text(invite.nom, W / 2, 96, { align: 'center' })
  doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(102, 102, 102)
  doc.text('vous êtes cordialement invité(e)', W / 2, 104, { align: 'center' })

  // QR code via API externe
  const magicUrl = getMagicLinkUrl(invite.magic_link_slug)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(magicUrl)}&margin=4&color=1A1A1A`
  try {
    const resp = await fetch(qrUrl)
    const blob = await resp.blob()
    const dataUrl = await new Promise<string>((res) => {
      const reader = new FileReader()
      reader.onload = () => res(reader.result as string)
      reader.readAsDataURL(blob)
    })
    doc.addImage(dataUrl, 'PNG', W / 2 - 18, 112, 36, 36)
  } catch { /* QR non disponible */ }

  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 140, 110)
  doc.text('Votre espace privilégié', W / 2, 152, { align: 'center' })

  // Pied de page
  doc.setDrawColor(201, 168, 76); doc.setLineWidth(0.3)
  doc.line(20, 162, W - 20, 162)
  doc.setFontSize(7); doc.setTextColor(102, 102, 102)
  doc.text('L&Lui Signature · +237 693 407 964', W / 2, 170, { align: 'center' })
  doc.text('letlui-signature.netlify.app', W / 2, 177, { align: 'center' })

  doc.save(`invitation-${invite.nom.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}
