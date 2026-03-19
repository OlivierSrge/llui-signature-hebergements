// lib/generateDevisPDF.ts
// Génère une proposition commerciale A4 (6 pages) en jsPDF
// L&Lui Signature — Module Mariages & Devis

import {
  PACKS,
  CATALOGUE,
  LLUI_CONFIG,
  INTRODUCTIONS,
  calculerTotaux,
  formatFCFA,
  getCdcTraiteur,
  getCdcDecoration,
} from '@/lib/devisDefaults'
import type { DevisFormData } from '@/lib/devisDefaults'

// ─── Sanitizer : supprime les emojis non supportés par jsPDF ──
function sanitizeForPDF(text: string): string {
  return text
    .replace(/[\uD800-\uDFFF]/g, '')   // Paires de substitution (emoji > U+FFFF)
    .replace(/[\u2600-\u27BF]/g, '')   // Symboles divers & Dingbats (BMP)
    .replace(/•/g, '-')
    .trim()
}

// ─── Colors ─────────────────────────────────────────────────
const DARK = [26, 26, 46] as [number, number, number]
const GOLD = [201, 168, 76] as [number, number, number]
const BEIGE_LIGHT = [245, 240, 232] as [number, number, number]
const WHITE = [255, 255, 255] as [number, number, number]
const GRAY = [120, 120, 130] as [number, number, number]
const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 20

// ─── Helper to wrap long text ────────────────────────────────
function wrapText(doc: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines: string[] = doc.splitTextToSize(text, maxWidth)
  lines.forEach((line: string) => {
    doc.text(line, x, y)
    y += lineHeight
  })
  return y
}

// ─── Header / footer helpers ─────────────────────────────────
function drawHeader(doc: any, ref: string) {
  doc.setFillColor(...DARK)
  doc.rect(0, 0, PAGE_W, 14, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...GOLD)
  doc.text('L&Lui Signature', MARGIN, 9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...WHITE)
  doc.text('Organisation de mariages haut de gamme', PAGE_W / 2, 9, { align: 'center' })
  doc.text(`Ref : ${ref}`, PAGE_W - MARGIN, 9, { align: 'right' })
}

function drawFooter(doc: any, pageNum: number, totalPages: number) {
  doc.setFillColor(...DARK)
  doc.rect(0, PAGE_H - 12, PAGE_W, 12, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GOLD)
  doc.text('L&Lui Signature — Kribi, Cameroun', MARGIN, PAGE_H - 4.5)
  doc.setTextColor(...WHITE)
  doc.text(`contact@l-et-lui.com  |  +237 693 407 964`, PAGE_W / 2, PAGE_H - 4.5, { align: 'center' })
  doc.text(`${pageNum} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 4.5, { align: 'right' })
}

function newPage(doc: any, ref: string, pageNum: number, totalPages: number) {
  doc.addPage()
  drawHeader(doc, ref)
  drawFooter(doc, pageNum, totalPages)
}

// ─── Main export ────────────────────────────────────────────
export async function generateDevisPDF(
  form: DevisFormData,
  totaux: ReturnType<typeof calculerTotaux>,
  ref: string
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pack = form.pack ? PACKS[form.pack] : null
  const packKey = form.pack || 'PERLE'
  const intro = INTRODUCTIONS[packKey] || ''
  const clientName = `${form.prenomMarie} ${form.nomMarie} & ${form.prenomMariee} ${form.nomMariee}`
  const dateStr = form.dateEvenement
    ? new Date(form.dateEvenement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const TOTAL_PAGES = 6

  // ════════════════════════════════════════
  // PAGE 1 — COUVERTURE
  // ════════════════════════════════════════
  doc.setFillColor(...DARK)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')

  doc.setFillColor(...GOLD)
  doc.rect(0, 0, PAGE_W, 3, 'F')
  doc.rect(0, PAGE_H - 3, PAGE_W, 3, 'F')

  // Logo / enseigne
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(...GOLD)
  doc.text('L&Lui Signature', PAGE_W / 2, 55, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...BEIGE_LIGHT)
  doc.text('Organisation de mariages haut de gamme', PAGE_W / 2, 63, { align: 'center' })

  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.5)
  doc.line(MARGIN + 30, 70, PAGE_W - MARGIN - 30, 70)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...WHITE)
  doc.text('PROPOSITION COMMERCIALE', PAGE_W / 2, 82, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...BEIGE_LIGHT)
  doc.text('Mariage & Evenementiel', PAGE_W / 2, 89, { align: 'center' })

  // Encadré client
  doc.setFillColor(...WHITE)
  doc.roundedRect(MARGIN, 100, PAGE_W - MARGIN * 2, 70, 3, 3, 'F')

  // Pack label (sans emoji)
  if (pack) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GOLD)
    doc.text(`Pack ${pack.nom}`, PAGE_W / 2, 116, { align: 'center' })
  }

  // Noms
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...DARK)
  doc.text(clientName, PAGE_W / 2, 126, { align: 'center' })

  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.8)
  doc.line(MARGIN + 25, 129, PAGE_W - MARGIN - 25, 129)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...GRAY)
  if (pack) {
    doc.text(`Pack ${pack.nom} — ${form.nombreInvites} invites`, PAGE_W / 2, 138, { align: 'center' })
  }
  if (dateStr) doc.text(dateStr, PAGE_W / 2, 146, { align: 'center' })
  if (form.ville) doc.text(sanitizeForPDF(form.ville), PAGE_W / 2, 153, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...GOLD)
  doc.text(`Ref : ${ref}`, PAGE_W / 2, 163, { align: 'center' })

  // Total indicatif
  doc.setFillColor(...GOLD)
  doc.roundedRect(MARGIN + 30, 190, PAGE_W - (MARGIN + 30) * 2, 22, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...DARK)
  doc.text('TOTAL ESTIME TTC', PAGE_W / 2, 200, { align: 'center' })
  doc.setFontSize(15)
  doc.text(formatFCFA(totaux.totalTTC), PAGE_W / 2, 208, { align: 'center' })

  const validUntil = new Date()
  validUntil.setDate(validUntil.getDate() + 30)
  const validStr = validUntil.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...BEIGE_LIGHT)
  doc.text(`Proposition valable jusqu'au ${validStr}`, PAGE_W / 2, 240, { align: 'center' })
  doc.text('Document confidentiel — reserve aux maries', PAGE_W / 2, 247, { align: 'center' })

  doc.setFillColor(...GOLD)
  doc.rect(0, PAGE_H - 3, PAGE_W, 3, 'F')

  // ════════════════════════════════════════
  // PAGE 2 — INTRODUCTION ÉMOTIONNELLE
  // ════════════════════════════════════════
  newPage(doc, ref, 2, TOTAL_PAGES)
  let y = 30

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...DARK)
  doc.text('Notre engagement envers vous', MARGIN, y)
  y += 6

  doc.setDrawColor(...GOLD)
  doc.setLineWidth(1)
  doc.line(MARGIN, y, MARGIN + 50, y)
  y += 10

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10.5)
  doc.setTextColor(...DARK)
  const introLines = sanitizeForPDF(intro).split('\n')
  introLines.forEach((line) => {
    if (line.trim() === '') {
      y += 4
    } else {
      y = wrapText(doc, line, MARGIN, y, PAGE_W - MARGIN * 2, 6)
    }
    if (y > PAGE_H - 30) y = PAGE_H - 30
  })

  y += 10

  // Encadré pack inclus
  if (pack) {
    doc.setFillColor(...BEIGE_LIGHT)
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 8 + pack.services.length * 6, 3, 3, 'F')
    y += 7

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...DARK)
    doc.text(`Pack ${pack.nom} — Prestations incluses`, MARGIN + 5, y)
    y += 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    pack.services.forEach((service) => {
      doc.setTextColor(...GOLD)
      doc.text('v', MARGIN + 5, y)
      doc.setTextColor(60, 60, 70)
      doc.text(sanitizeForPDF(service), MARGIN + 12, y)
      y += 6
    })
  }

  // ════════════════════════════════════════
  // PAGE 3 — RÉCAPITULATIF BUDGÉTAIRE
  // ════════════════════════════════════════
  newPage(doc, ref, 3, TOTAL_PAGES)
  y = 30

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...DARK)
  doc.text('Recapitulatif Budgetaire', MARGIN, y)
  y += 6
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(1)
  doc.line(MARGIN, y, MARGIN + 55, y)
  y += 12

  const categories = [
    { label: 'Restauration & Traiteur', value: pack ? Math.round(pack.prixBase * 0.40) : 0 },
    { label: 'Decoration & Scenographie', value: pack ? Math.round(pack.prixBase * 0.30) : 0 },
    { label: 'Image & Beaute', value: pack ? Math.round(pack.prixBase * 0.15) : 0 },
    { label: 'Logistique & Coordination', value: pack ? Math.round(pack.prixBase * 0.15) : 0 },
  ]

  if (totaux.totalLieux > 0) {
    categories.push({ label: 'Lieux (ceremonie + reception)', value: totaux.totalLieux })
  }

  doc.setFillColor(...DARK)
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...WHITE)
  doc.text('Poste budgetaire', MARGIN + 5, y + 5.5)
  doc.text('Montant estime', PAGE_W - MARGIN - 5, y + 5.5, { align: 'right' })
  y += 8

  categories.forEach((cat, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 248 : 244, idx % 2 === 0 ? 244 : 240)
    doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 8, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    doc.text(cat.label, MARGIN + 5, y + 5.5)
    doc.text(formatFCFA(cat.value), PAGE_W - MARGIN - 5, y + 5.5, { align: 'right' })
    y += 8
  })

  if (form.optionsSelectionnees.length > 0) {
    CATALOGUE.optionsALaCarte
      .filter((o) => form.optionsSelectionnees.includes(o.nom))
      .forEach((opt) => {
        doc.setFillColor(240, 245, 252)
        doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 8, 'F')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(60, 90, 160)
        doc.text(`+ ${sanitizeForPDF(opt.nom)}`, MARGIN + 5, y + 5.5)
        doc.text(formatFCFA(opt.prix), PAGE_W - MARGIN - 5, y + 5.5, { align: 'right' })
        y += 8
      })
  }

  y += 5

  doc.setDrawColor(...BEIGE_LIGHT)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)
  y += 6

  const summaryRows = [
    { label: 'Sous-total prestations', value: totaux.sousTotalPrestations, bold: false },
    { label: `Honoraires L&Lui Signature (${Math.round(LLUI_CONFIG.honoraires * 100)}%)`, value: totaux.honoraires, bold: false },
  ]
  summaryRows.forEach((row) => {
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...GRAY)
    doc.text(row.label, MARGIN + 5, y)
    doc.setTextColor(...DARK)
    doc.text(formatFCFA(row.value), PAGE_W - MARGIN - 5, y, { align: 'right' })
    y += 7
  })

  y += 2
  doc.setFillColor(...GOLD)
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 12, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...DARK)
  doc.text('TOTAL TTC', MARGIN + 5, y + 8.5)
  doc.text(formatFCFA(totaux.totalTTC), PAGE_W - MARGIN - 5, y + 8.5, { align: 'right' })
  y += 18

  if (totaux.totalBoutique > 0) {
    doc.setFillColor(255, 250, 230)
    const boutiqueItems = CATALOGUE.optionsBoutique.filter((o) =>
      form.optionsBoutiqueSelectionnees.includes(o.nom)
    )
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 14 + boutiqueItems.length * 7, 3, 3, 'F')
    y += 7
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(160, 100, 0)
    doc.text('OPTIONS BOUTIQUE (hors total TTC - facturation distincte)', MARGIN + 5, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    boutiqueItems.forEach((opt) => {
      doc.text(`- ${sanitizeForPDF(opt.nom)}`, MARGIN + 7, y)
      doc.text(formatFCFA(opt.prix), PAGE_W - MARGIN - 5, y, { align: 'right' })
      y += 7
    })
    y += 3
  }

  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...DARK)
  doc.text('Echeancier de paiement', MARGIN, y)
  y += 7

  totaux.echeancier.forEach((e, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 248 : 244, idx % 2 === 0 ? 244 : 240)
    doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 9, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    doc.text(`${e.pourcentage}% — ${sanitizeForPDF(e.label)}`, MARGIN + 5, y + 6)
    doc.setFont('helvetica', 'bold')
    doc.text(formatFCFA(e.montant), PAGE_W - MARGIN - 5, y + 6, { align: 'right' })
    y += 9
  })

  // ════════════════════════════════════════
  // PAGE 4 — CAHIER DES CHARGES
  // ════════════════════════════════════════
  newPage(doc, ref, 4, TOTAL_PAGES)
  y = 30

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...DARK)
  doc.text('Cahier des Charges Detaille', MARGIN, y)
  y += 6
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(1)
  doc.line(MARGIN, y, MARGIN + 65, y)
  y += 12

  if (pack) {
    doc.setFillColor(...DARK)
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 8, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...GOLD)
    doc.text('Traiteur & Restauration', MARGIN + 5, y + 5.5)
    y += 12

    const cdcTraiteur = getCdcTraiteur(pack.traiteur)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    y = wrapText(doc, sanitizeForPDF(cdcTraiteur || `Niveau ${pack.traiteur} — Service de qualite`), MARGIN + 3, y, PAGE_W - MARGIN * 2 - 6, 5.5)

    y += 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text('Gamme de produits disponibles :', MARGIN + 3, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    CATALOGUE.traiteur.produits.forEach((p) => {
      doc.setTextColor(...GOLD)
      doc.text('->', MARGIN + 5, y)
      doc.setTextColor(...DARK)
      doc.text(`${sanitizeForPDF(p.nom)} — ${formatFCFA(p.prix_kg)} / kg`, MARGIN + 12, y)
      y += 5
    })
    y += 5

    doc.setFillColor(...DARK)
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 8, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...GOLD)
    doc.text('Decoration & Scenographie', MARGIN + 5, y + 5.5)
    y += 12

    const cdcDeco = getCdcDecoration(pack.decoration)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    y = wrapText(doc, sanitizeForPDF(cdcDeco || `Niveau ${pack.decoration} — Decoration soignee`), MARGIN + 3, y, PAGE_W - MARGIN * 2 - 6, 5.5)

    y += 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text('Nuances & themes :', MARGIN + 3, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    CATALOGUE.decoration.nuances.forEach((n) => {
      doc.setTextColor(...GOLD)
      doc.text('~', MARGIN + 5, y)
      doc.setTextColor(...DARK)
      doc.text(sanitizeForPDF(n.nom), MARGIN + 12, y)
      y += 5
    })
    y += 8
  }

  if (form.lieuCeremonie || form.lieuReception) {
    doc.setFillColor(...DARK)
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 8, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...GOLD)
    doc.text('Lieux de l\'evenement', MARGIN + 5, y + 5.5)
    y += 12
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    if (form.lieuCeremonie) {
      doc.text(`Lieu de ceremonie : ${sanitizeForPDF(form.lieuCeremonie)}${form.prixLieuCeremonie ? ' — ' + formatFCFA(form.prixLieuCeremonie) : ''}`, MARGIN + 5, y)
      y += 6
    }
    if (form.lieuReception) {
      doc.text(`Lieu de reception : ${sanitizeForPDF(form.lieuReception)}${form.prixLieuReception ? ' — ' + formatFCFA(form.prixLieuReception) : ''}`, MARGIN + 5, y)
      y += 6
    }
    y += 4
  }

  if (form.notes) {
    doc.setFillColor(...BEIGE_LIGHT)
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 8, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...DARK)
    doc.text('Notes & demandes speciales', MARGIN + 5, y + 5.5)
    y += 12
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    y = wrapText(doc, sanitizeForPDF(form.notes), MARGIN + 3, y, PAGE_W - MARGIN * 2 - 6, 5.5)
  }

  // ════════════════════════════════════════
  // PAGE 5 — CONDITIONS FINANCIÈRES
  // ════════════════════════════════════════
  newPage(doc, ref, 5, TOTAL_PAGES)
  y = 30

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...DARK)
  doc.text('Conditions Financieres & Paiement', MARGIN, y)
  y += 6
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(1)
  doc.line(MARGIN, y, MARGIN + 80, y)
  y += 12

  const sections = [
    {
      title: 'Virement bancaire (Cameroun)',
      rows: [
        ['Banque', LLUI_CONFIG.paiement.cameroun.banque],
        ['IBAN / RIB', LLUI_CONFIG.paiement.cameroun.iban],
        ['Beneficiaire', LLUI_CONFIG.enseigne],
        ['Reference', ref],
      ],
    },
    {
      title: 'Virement bancaire (France/Europe)',
      rows: [
        ['Banque', LLUI_CONFIG.paiement.france.banque],
        ['IBAN', LLUI_CONFIG.paiement.france.iban],
        ['Beneficiaire', LLUI_CONFIG.enseigne],
      ],
    },
    {
      title: 'Paiement mobile',
      rows: [
        ['Orange Money', LLUI_CONFIG.paiement.om],
        ['Revolut', LLUI_CONFIG.paiement.revolut],
      ],
    },
  ]

  sections.forEach((section) => {
    doc.setFillColor(...DARK)
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 8, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...GOLD)
    doc.text(section.title, MARGIN + 5, y + 5.5)
    y += 11
    section.rows.forEach((row, idx) => {
      doc.setFillColor(idx % 2 === 0 ? 252 : 248, idx % 2 === 0 ? 250 : 246, idx % 2 === 0 ? 248 : 244)
      doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 7, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      doc.text(row[0], MARGIN + 4, y + 4.8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...DARK)
      doc.text(sanitizeForPDF(row[1]), MARGIN + 55, y + 4.8)
      y += 7
    })
    y += 6
  })

  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...DARK)
  doc.text('Conditions generales', MARGIN, y)
  y += 7

  const conditions = [
    '- Cette proposition est valable 30 jours a compter de sa date d\'emission.',
    '- Tout acompte verse est non remboursable en cas d\'annulation du client.',
    '- L&Lui Signature se reserve le droit de substituer un prestataire en cas d\'indisponibilite.',
    '- Les prix sont exprimes en Francs CFA (FCFA) et sont fermes pour la duree de validite.',
    '- Les options boutique (alcools) sont soumises a reglementation locale.',
    '- Un contrat definitif sera etabli lors de la signature et du versement de l\'acompte.',
  ]

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY)
  conditions.forEach((cond) => {
    y = wrapText(doc, cond, MARGIN, y, PAGE_W - MARGIN * 2, 5.5)
    y += 1
  })

  // ════════════════════════════════════════
  // PAGE 6 — CONCLUSION & SIGNATURE
  // ════════════════════════════════════════
  newPage(doc, ref, 6, TOTAL_PAGES)

  doc.setFillColor(...BEIGE_LIGHT)
  doc.rect(0, 14, PAGE_W, PAGE_H - 26, 'F')

  y = 45

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(13)
  doc.setTextColor(...DARK)
  doc.text('"Votre mariage merite l\'excellence.', PAGE_W / 2, y, { align: 'center' })
  doc.text('Nous sommes la pour en faire une realite."', PAGE_W / 2, y + 9, { align: 'center' })
  y += 22

  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.8)
  doc.line(MARGIN + 30, y, PAGE_W - MARGIN - 30, y)
  y += 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 90)
  const merci = `Nous vous remercions de votre confiance et vous assurons de notre engagement total pour faire de votre mariage un moment inoubliable. Notre equipe est disponible pour repondre a toutes vos questions et affiner cette proposition selon vos souhaits.`
  y = wrapText(doc, merci, MARGIN, y, PAGE_W - MARGIN * 2, 6)
  y += 10

  doc.setFillColor(...DARK)
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 32, 4, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...GOLD)
  doc.text('Contactez-nous', PAGE_W / 2, y + 10, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...WHITE)
  doc.text(`Tel : ${LLUI_CONFIG.telephone}`, PAGE_W / 2, y + 18, { align: 'center' })
  doc.text(`Email : ${LLUI_CONFIG.email}`, PAGE_W / 2, y + 24, { align: 'center' })
  doc.text(`Web : ${LLUI_CONFIG.site}`, PAGE_W / 2, y + 30, { align: 'center' })
  y += 42

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...DARK)
  doc.text('Bon pour accord — Signature du client :', MARGIN, y)
  y += 6

  doc.setDrawColor(200, 200, 210)
  doc.setLineWidth(0.3)
  doc.rect(MARGIN, y, (PAGE_W - MARGIN * 2) / 2 - 5, 25)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('Signature precedee de "Lu et approuve"', MARGIN + 3, y + 5)
  doc.text(`${form.prenomMarie} ${form.nomMarie}`, MARGIN + 3, y + 12)
  doc.text('Date : _______________', MARGIN + 3, y + 20)

  const col2 = PAGE_W / 2 + 5
  doc.rect(col2, y, (PAGE_W - MARGIN * 2) / 2 - 5, 25)
  doc.text('Signature precedee de "Lu et approuve"', col2 + 3, y + 5)
  doc.text(`${form.prenomMariee} ${form.nomMariee}`, col2 + 3, y + 12)
  doc.text('Date : _______________', col2 + 3, y + 20)

  y += 35

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.text(`NIU : ${LLUI_CONFIG.niu}  |  RCCM : ${LLUI_CONFIG.rccm}`, PAGE_W / 2, y, { align: 'center' })
  doc.text(`${LLUI_CONFIG.adresse}  |  ${LLUI_CONFIG.enseigne}`, PAGE_W / 2, y + 5, { align: 'center' })

  const fileName = `LLUI-Devis-${ref}-${form.prenomMarie}-${form.prenomMariee}.pdf`.replace(/\s/g, '_')
  doc.save(fileName)
}
