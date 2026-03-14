import jsPDF from 'jspdf'
import type { AdminPaymentSettings } from './payment-settings'
import { DEFAULT_ADMIN_PAYMENT_SETTINGS } from './payment-settings'

export interface CommissionReservationDetail {
  code: string
  guestName: string
  accommodationName: string
  checkIn: string
  checkOut: string
  totalPrice: number
  commissionAmount: number
}

export interface CommissionPDFData {
  partnerId: string
  partnerName: string
  partnerPlan?: string
  partnerPhone?: string
  month: number
  year: number
  reservations: CommissionReservationDetail[]
  paymentSettings: AdminPaymentSettings
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

function fmtDate(dateStr: string) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
    })
  } catch { return dateStr.slice(0, 10) }
}

// ── PDF generator ────────────────────────────────────────────────────────────

export function generateCommissionRequestPDF(data: CommissionPDFData): jsPDF {
  const ps = { ...DEFAULT_ADMIN_PAYMENT_SETTINGS, ...data.paymentSettings }

  // ── Palette ──
  const BEIGE: [number, number, number] = [245, 240, 232]
  const GOLD: [number, number, number]  = [201, 168, 76]
  const DARK: [number, number, number]  = [26, 26, 26]
  const WHITE: [number, number, number] = [255, 255, 255]
  const BEIGE_LIGHT: [number, number, number] = [250, 248, 244]

  // ── Dimensions ──
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297
  const ML = 14
  const MR = 14
  const CW = W - ML - MR  // 182mm

  const monthName = MONTH_NAMES_FR[(data.month - 1)] || ''
  const ref = `LLUI-COM-${data.year}-${String(data.month).padStart(2, '0')}-${data.partnerId.slice(0, 5).toUpperCase()}`
  const emissionDate = new Date()
  const limitDate = new Date(emissionDate)
  limitDate.setDate(limitDate.getDate() + 30)
  const totalCommissions = data.reservations.reduce((s, r) => s + r.commissionAmount, 0)

  // ── Header (réutilisé sur chaque page) ──────────────────────────────────
  function drawHeader() {
    doc.setFillColor(...BEIGE)
    doc.rect(0, 0, W, 40, 'F')
    doc.setFillColor(...GOLD)
    doc.rect(0, 0, W, 2, 'F')

    // Logo / titre société
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...DARK)
    doc.text('L&Lui Signature', ML, 14)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(110, 100, 80)
    doc.text('Kribi, Cameroun  ·  +237 693 407 964  ·  llui-signature-hebergements.vercel.app', ML, 20)

    // Type de document (centré)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...GOLD)
    const title = 'DEMANDE DE RÈGLEMENT DE COMMISSIONS'
    doc.text(title, W / 2, 30, { align: 'center' })

    // Référence + date (droite)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(110, 100, 80)
    doc.text(`Réf : ${ref}`, W - MR, 26, { align: 'right' })
    doc.text(`Date d'émission : ${emissionDate.toLocaleDateString('fr-FR')}`, W - MR, 31, { align: 'right' })

    // Ligne séparatrice
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.4)
    doc.line(ML, 38, W - MR, 38)
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  function drawFooter(pageNum: number, totalPages: number) {
    const fy = H - 7
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(6.5)
    doc.setTextColor(160, 150, 130)
    doc.text(`L&Lui Signature — Kribi, Cameroun — ${data.year}`, ML, fy)
    doc.text(`Page ${pageNum} / ${totalPages}`, W - MR, fy, { align: 'right' })
  }

  // ── PAGE 1 ──────────────────────────────────────────────────────────────
  drawHeader()
  let y = 46

  // Bloc destinataire
  doc.setFillColor(...BEIGE_LIGHT)
  doc.roundedRect(ML, y, CW * 0.55, 26, 2, 2, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(130, 120, 100)
  doc.text('À l\'attention de :', ML + 4, y + 7)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...DARK)
  doc.text(data.partnerName, ML + 4, y + 15)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(110, 100, 80)
  if (data.partnerPlan) {
    doc.text(`Plan d'abonnement : ${data.partnerPlan}`, ML + 4, y + 21)
  }
  if (data.partnerPhone) {
    const phoneY = data.partnerPlan ? y + 26 : y + 21
    if (phoneY < y + 27) doc.text(`WhatsApp : ${data.partnerPhone}`, ML + 4, phoneY)
  }

  y += 34

  // Objet
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...DARK)
  doc.text(`Objet : Règlement des commissions dues pour le mois de ${monthName} ${data.year}`, ML, y)

  y += 10

  // ── Tableau réservations ──────────────────────────────────────────────

  // Colonnes : N° | Code | Client | Logement | Dates | Montant | Commission
  const colW = [8, 26, 34, 34, 28, 26, 26]
  const colX: number[] = []
  colW.reduce((acc, w, i) => { colX[i] = acc; return acc + w }, ML)

  const rowH = 7
  const hdrH = 7

  // En-tête tableau
  doc.setFillColor(...DARK)
  doc.rect(ML, y, CW, hdrH, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...GOLD)

  const headers = ['N°', 'Code', 'Client', 'Logement', 'Dates séjour', 'Montant', 'Commission']
  headers.forEach((h, i) => {
    const isRight = i >= 5
    if (isRight) {
      doc.text(h, colX[i] + colW[i] - 1, y + 5, { align: 'right' })
    } else {
      doc.text(h, colX[i] + 1, y + 5)
    }
  })

  y += hdrH

  // Lignes
  data.reservations.forEach((r, idx) => {
    // Nouvelle page si nécessaire
    if (y + rowH > H - 55) {
      doc.addPage()
      drawHeader()
      y = 46

      // Ré-afficher l'en-tête tableau
      doc.setFillColor(...DARK)
      doc.rect(ML, y, CW, hdrH, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...GOLD)
      headers.forEach((h, i) => {
        if (i >= 5) doc.text(h, colX[i] + colW[i] - 1, y + 5, { align: 'right' })
        else doc.text(h, colX[i] + 1, y + 5)
      })
      y += hdrH
    }

    if (idx % 2 === 1) {
      doc.setFillColor(...BEIGE)
      doc.rect(ML, y, CW, rowH, 'F')
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...DARK)

    const dateStr = r.checkIn && r.checkOut ? `${fmtDate(r.checkIn)} → ${fmtDate(r.checkOut)}` : '—'
    const cells = [
      String(idx + 1),
      r.code.slice(0, 15),
      r.guestName.slice(0, 18),
      (r.accommodationName || '—').slice(0, 18),
      dateStr,
      fmt(r.totalPrice),
      fmt(r.commissionAmount),
    ]

    cells.forEach((cell, i) => {
      if (i >= 5) {
        doc.text(cell, colX[i] + colW[i] - 1, y + 5, { align: 'right' })
      } else {
        doc.text(cell, colX[i] + 1, y + 5)
      }
    })

    y += rowH
  })

  // Ligne TOTAL
  doc.setFillColor(...GOLD)
  doc.rect(ML, y, CW, rowH + 1, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...WHITE)
  doc.text('TOTAL COMMISSIONS DUES', ML + 2, y + 5.5)
  doc.text(fmt(totalCommissions), W - MR - 1, y + 5.5, { align: 'right' })

  y += rowH + 10

  // ── Coordonnées de règlement ──────────────────────────────────────────

  if (y > H - 80) {
    doc.addPage()
    drawHeader()
    y = 46
  }

  // Titre section
  doc.setFillColor(...BEIGE)
  doc.rect(ML, y, CW, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...DARK)
  doc.text('COORDONNÉES DE RÈGLEMENT', ML + 3, y + 5)
  y += 12

  // Option 1 — Orange Money
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GOLD)
  doc.text('Option 1 — Orange Money', ML, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...DARK)
  doc.text(`Numéro : ${ps.orange_money_number || '693407964'}`, ML + 5, y)
  y += 4.5
  if (ps.orange_money_holder) {
    doc.text(`Titulaire : ${ps.orange_money_holder}`, ML + 5, y)
    y += 4.5
  }
  y += 4

  // Option 2 — Revolut
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GOLD)
  doc.text('Option 2 — Carte bancaire / Virement Revolut', ML, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...DARK)
  doc.text(`Lien : ${ps.revolut_link || 'https://revolut.me/olivieqf4i'}`, ML + 5, y)
  y += 4.5
  if (ps.revolut_message) {
    doc.setFontSize(7)
    doc.setTextColor(120, 110, 90)
    doc.text(ps.revolut_message.slice(0, 90), ML + 5, y)
    y += 4
  }
  y += 4

  // Option 3 — Virement bancaire (si configuré)
  if (ps.bank_name || ps.bank_account) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...GOLD)
    doc.text('Option 3 — Virement bancaire', ML, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...DARK)
    if (ps.bank_name)    { doc.text(`Banque : ${ps.bank_name}`, ML + 5, y); y += 4.5 }
    if (ps.bank_account) { doc.text(`Compte : ${ps.bank_account}`, ML + 5, y); y += 4.5 }
    if (ps.bank_holder)  { doc.text(`Titulaire : ${ps.bank_holder}`, ML + 5, y); y += 4.5 }
    y += 4
  }

  // Ligne séparatrice
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.3)
  doc.line(ML, y, W - MR, y)
  y += 8

  // ── Pied de page légal ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(80, 70, 50)
  doc.text(`Délai de règlement : 30 jours à compter de la date d'émission`, ML, y)
  y += 5
  doc.text(`Date limite de paiement : ${limitDate.toLocaleDateString('fr-FR')}`, ML, y)
  y += 8

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(130, 120, 100)
  doc.text('En cas de question, contactez L&Lui Signature : WhatsApp +237 693 407 964', ML, y)
  y += 4.5
  doc.text('Document généré automatiquement par la plateforme L&Lui Signature', ML, y)
  y += 4
  doc.text('Ce document tient lieu de demande officielle de règlement.', ML, y)

  // ── Numéros de page ──────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(p, totalPages)
  }

  return doc
}
