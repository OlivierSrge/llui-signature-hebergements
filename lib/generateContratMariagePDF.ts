// lib/generateContratMariagePDF.ts
// Génère le contrat de mariage L&Lui en PDF (jsPDF) pour un couple

import jsPDF from 'jspdf'

// ─── Sanitizer ────────────────────────────────────────────
function s(text: string): string {
  return (text || '')
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[\u2600-\u27BF]/g, '')
    .replace(/•/g, '-')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .trim()
}

// ─── Colors ───────────────────────────────────────────────
const DARK: [number, number, number] = [26, 26, 46]
const GOLD: [number, number, number] = [201, 168, 76]
const BEIGE: [number, number, number] = [245, 240, 232]
const WHITE: [number, number, number] = [255, 255, 255]
const GRAY: [number, number, number] = [120, 120, 130]
const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 20

function drawHeader(doc: jsPDF, ref: string) {
  doc.setFillColor(...DARK)
  doc.rect(0, 0, PAGE_W, 16, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...GOLD)
  doc.text('L&Lui Signature', MARGIN, 10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...WHITE)
  doc.text('Organisation de mariages haut de gamme - Kribi, Cameroun', PAGE_W / 2, 10, { align: 'center' })
  doc.text(`Contrat N° ${ref}`, PAGE_W - MARGIN, 10, { align: 'right' })
}

function drawFooter(doc: jsPDF, pageNum: number, total: number) {
  doc.setFillColor(...BEIGE)
  doc.rect(0, PAGE_H - 12, PAGE_W, 12, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('L&Lui Signature | Kribi, Cameroun | contact@llui-signature.com', MARGIN, PAGE_H - 4)
  doc.text(`Page ${pageNum} / ${total}`, PAGE_W - MARGIN, PAGE_H - 4, { align: 'right' })
}

function sectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFillColor(...GOLD)
  doc.rect(MARGIN, y, PAGE_W - 2 * MARGIN, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...WHITE)
  doc.text(s(title), MARGIN + 3, y + 5)
  return y + 12
}

function wrapText(doc: jsPDF, text: string, x: number, y: number, maxW: number, lh: number): number {
  const lines: string[] = doc.splitTextToSize(s(text), maxW)
  lines.forEach((line) => {
    doc.text(line, x, y)
    y += lh
  })
  return y
}

export interface ContratMariageData {
  contrat_id: string
  marie_uid: string
  noms_maries: string
  whatsapp: string
  date_mariage: string     // ISO string
  lieu: string
  pack_nom: string
  montant_total: number    // FCFA
  acompte_verse: number    // FCFA déjà versé
  date_generation: string  // ISO string
  clauses_supplementaires?: string
}

function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function generateContratMariagePDF(data: ContratMariageData): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const W = PAGE_W - 2 * MARGIN
  const totalPages = 3

  // ───────── PAGE 1 ─────────
  drawHeader(doc, data.contrat_id)
  let y = 26

  // Titre principal
  doc.setFillColor(...BEIGE)
  doc.rect(MARGIN, y, W, 22, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...DARK)
  doc.text('CONTRAT DE PRESTATION DE SERVICES', PAGE_W / 2, y + 9, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...GOLD)
  doc.text('Organisation & Coordination de Mariage', PAGE_W / 2, y + 17, { align: 'center' })
  y += 28

  // Parties
  y = sectionTitle(doc, y, 'ARTICLE 1 — IDENTIFICATION DES PARTIES')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...DARK)

  const leftW = W / 2 - 3

  // Box L&Lui
  doc.setFillColor(...BEIGE)
  doc.rect(MARGIN, y, leftW, 32, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('LE PRESTATAIRE', MARGIN + 3, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(60, 60, 60)
  doc.text('L&Lui Signature', MARGIN + 3, y + 12)
  doc.text('Organisation de mariages haut de gamme', MARGIN + 3, y + 17)
  doc.text('Kribi, Region du Sud, Cameroun', MARGIN + 3, y + 22)
  doc.text('contact@llui-signature.com', MARGIN + 3, y + 27)

  // Box Mariés
  const rx = MARGIN + leftW + 6
  doc.setFillColor(...BEIGE)
  doc.rect(rx, y, leftW, 32, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...DARK)
  doc.text('LE(S) CLIENT(S)', rx + 3, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(60, 60, 60)
  const nomLines: string[] = doc.splitTextToSize(s(data.noms_maries), leftW - 6)
  nomLines.slice(0, 2).forEach((l, i) => doc.text(l, rx + 3, y + 12 + i * 5))
  doc.text(`WhatsApp : ${s(data.whatsapp)}`, rx + 3, y + 22)
  doc.text(`UID : ${s(data.marie_uid)}`, rx + 3, y + 27)
  y += 38

  // Article 2 — Objet
  y = sectionTitle(doc, y, 'ARTICLE 2 — OBJET DU CONTRAT')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  y = wrapText(doc,
    `Le présent contrat a pour objet de définir les conditions dans lesquelles L&Lui Signature s'engage à fournir des prestations d'organisation et de coordination de mariage pour ${s(data.noms_maries)}.`,
    MARGIN, y, W, 5)
  y += 3
  y = wrapText(doc,
    `La cérémonie de mariage est prévue le ${formatDate(data.date_mariage)} à ${s(data.lieu)}, Cameroun.`,
    MARGIN, y, W, 5)
  y += 8

  // Article 3 — Pack
  y = sectionTitle(doc, y, 'ARTICLE 3 — PACK ET PRESTATIONS')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...DARK)
  doc.text(`Pack souscrit : ${s(data.pack_nom || 'Sur mesure')}`, MARGIN, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  const prestations = [
    'Coordination complète Jour J (équipe L&Lui sur place)',
    'Accès plateforme de gestion digitale portail couple',
    'Suivi personnalisé préparatifs (J-12 mois → Jour J)',
    'Gestion prestataires : traiteur, photographe, décoration',
    'Hébergements partenaires L&Lui à tarifs préférentiels',
    'Support WhatsApp dédié 7j/7',
  ]
  prestations.forEach((p) => {
    doc.text(`- ${p}`, MARGIN + 3, y)
    y += 5
  })
  y += 5

  // Article 4 — Montant
  y = sectionTitle(doc, y, 'ARTICLE 4 — MONTANT ET MODALITÉS DE PAIEMENT')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...DARK)
  doc.text(`Montant total des prestations : ${formatFCFA(data.montant_total)}`, MARGIN, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)

  const solde = data.montant_total - data.acompte_verse
  const echeances = [
    { label: 'Acompte à la signature (30%)', montant: data.acompte_verse || Math.round(data.montant_total * 0.3) },
    { label: 'Versement intermédiaire J-6 mois (40%)', montant: Math.round(data.montant_total * 0.4) },
    { label: 'Solde final J-30 (30%)', montant: Math.round(data.montant_total * 0.3) },
  ]
  echeances.forEach((e) => {
    doc.text(`• ${e.label} : ${formatFCFA(e.montant)}`, MARGIN + 3, y)
    y += 5
  })
  if (data.acompte_verse > 0) {
    y += 2
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GOLD)
    doc.text(`Acompte déjà versé : ${formatFCFA(data.acompte_verse)}  |  Reste à régler : ${formatFCFA(solde > 0 ? solde : 0)}`, MARGIN, y)
    y += 6
  }

  drawFooter(doc, 1, totalPages)

  // ───────── PAGE 2 ─────────
  doc.addPage()
  drawHeader(doc, data.contrat_id)
  y = 26

  // Article 5 — Obligations
  y = sectionTitle(doc, y, 'ARTICLE 5 — OBLIGATIONS DE L\'ORGANISATEUR')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  const oblig5 = [
    'Mettre à disposition une équipe qualifiée le Jour J.',
    'Fournir un accès au portail numérique dans les 48h suivant la signature.',
    'Coordonner les prestataires validés par le couple.',
    'Informer le client de tout changement affectant les prestations.',
    'Conserver la confidentialité des informations du couple.',
  ]
  oblig5.forEach((o) => {
    y = wrapText(doc, `• ${o}`, MARGIN + 3, y, W - 6, 5)
    y += 1
  })
  y += 6

  // Article 6 — Obligations client
  y = sectionTitle(doc, y, 'ARTICLE 6 — OBLIGATIONS DU CLIENT')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  const oblig6 = [
    'Régler les échéances aux dates convenues.',
    'Fournir les informations nécessaires (liste invités, programme, etc.) dans les délais demandés.',
    'Valider les propositions prestataires dans un délai de 5 jours ouvrables.',
    'Informer L&Lui de tout changement de programme au moins 30 jours avant.',
  ]
  oblig6.forEach((o) => {
    y = wrapText(doc, `• ${o}`, MARGIN + 3, y, W - 6, 5)
    y += 1
  })
  y += 6

  // Article 7 — Politique annulation
  y = sectionTitle(doc, y, 'ARTICLE 7 — POLITIQUE D\'ANNULATION ET REMBOURSEMENTS')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  const annul = [
    'Annulation avant J-90 : remboursement intégral (100%) des sommes versées.',
    'Annulation entre J-60 et J-90 : remboursement de 70% des sommes versées.',
    'Annulation entre J-30 et J-60 : remboursement de 50% des sommes versées.',
    'Annulation entre J-7 et J-30 : aucun remboursement (0%).',
    'Annulation après J-7 : aucun remboursement (0%). Frais de mobilisation intégralement retenus.',
  ]
  annul.forEach((a) => {
    y = wrapText(doc, `• ${a}`, MARGIN + 3, y, W - 6, 5)
    y += 1
  })
  y += 4
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  y = wrapText(doc,
    'Toute demande d\'annulation doit être notifiée par écrit via WhatsApp ou email. La date de réception de la notification fait foi.',
    MARGIN, y, W, 4.5)
  y += 6

  // Article 8 — Force majeure
  y = sectionTitle(doc, y, 'ARTICLE 8 — FORCE MAJEURE')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  y = wrapText(doc,
    'Ni L&Lui Signature ni le client ne pourront être tenus responsables de l\'inexécution de leurs obligations en cas de force majeure (catastrophe naturelle, épidémie, guerre, décision gouvernementale). Un report de la prestation sera proposé en priorité.',
    MARGIN, y, W, 5)
  y += 8

  // Article 9 — Propriété intellectuelle
  y = sectionTitle(doc, y, 'ARTICLE 9 — PROPRIÉTÉ INTELLECTUELLE ET DONNÉES')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  y = wrapText(doc,
    'Les outils, modèles, check-lists et créations fournis par L&Lui Signature restent sa propriété exclusive. Les données personnelles du couple sont traitées conformément à la réglementation camerounaise en vigueur et ne sont pas cédées à des tiers.',
    MARGIN, y, W, 5)
  y += 8

  // Article 10 — Litiges
  y = sectionTitle(doc, y, 'ARTICLE 10 — RÈGLEMENT DES LITIGES')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  y = wrapText(doc,
    'En cas de litige, les parties conviennent de rechercher une solution amiable dans un délai de 30 jours. À défaut, le litige sera porté devant les juridictions compétentes de Kribi, Cameroun.',
    MARGIN, y, W, 5)

  // Clauses supplémentaires si besoin
  if (data.clauses_supplementaires?.trim()) {
    y += 6
    y = sectionTitle(doc, y, 'ARTICLE 11 — CLAUSES PARTICULIÈRES')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    y = wrapText(doc, data.clauses_supplementaires, MARGIN, y, W, 5)
  }

  drawFooter(doc, 2, totalPages)

  // ───────── PAGE 3 — SIGNATURES ─────────
  doc.addPage()
  drawHeader(doc, data.contrat_id)
  y = 26

  // Récapitulatif
  y = sectionTitle(doc, y, 'RÉCAPITULATIF DU CONTRAT')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)

  const recap = [
    ['Couple', s(data.noms_maries)],
    ['Date du mariage', formatDate(data.date_mariage)],
    ['Lieu', s(data.lieu)],
    ['Pack souscrit', s(data.pack_nom || 'Sur mesure')],
    ['Montant total', formatFCFA(data.montant_total)],
    ['Acompte versé', formatFCFA(data.acompte_verse)],
    ['Reste à régler', formatFCFA(Math.max(0, data.montant_total - data.acompte_verse))],
    ['Date de génération', formatDate(data.date_generation)],
    ['N° Contrat', s(data.contrat_id)],
  ]

  recap.forEach(([label, val]) => {
    doc.setFillColor(...BEIGE)
    doc.rect(MARGIN, y - 4, W, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...DARK)
    doc.text(label + ' :', MARGIN + 3, y + 0.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    doc.text(val, MARGIN + 55, y + 0.5)
    y += 9
  })
  y += 6

  // Bloc signatures
  y = sectionTitle(doc, y, 'SIGNATURES ÉLECTRONIQUES')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(60, 60, 60)
  doc.text('Les parties déclarent avoir lu et approuvé l\'intégralité du présent contrat.', MARGIN, y)
  y += 4
  doc.text('La signature électronique par code OTP WhatsApp a la même valeur juridique qu\'une signature manuscrite.', MARGIN, y)
  y += 10

  const sigW = (W - 10) / 2
  // Box L&Lui
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.5)
  doc.rect(MARGIN, y, sigW, 40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...DARK)
  doc.text('L&Lui Signature', MARGIN + 3, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.text('Pour L&Lui Signature,', MARGIN + 3, y + 13)
  doc.text('Direction Générale', MARGIN + 3, y + 18)
  doc.text('Kribi, Cameroun', MARGIN + 3, y + 23)
  doc.text('Date : ' + formatDate(data.date_generation), MARGIN + 3, y + 34)

  // Box Mariés
  const bx = MARGIN + sigW + 10
  doc.rect(bx, y, sigW, 40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...DARK)
  const shortNames = s(data.noms_maries).slice(0, 30) + (s(data.noms_maries).length > 30 ? '...' : '')
  doc.text(shortNames, bx + 3, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.text('Signature OTP validée via WhatsApp', bx + 3, y + 13)
  doc.text(`N° : ${s(data.whatsapp)}`, bx + 3, y + 18)
  doc.text('Code OTP : ________________', bx + 3, y + 26)
  doc.text('Date : ________________', bx + 3, y + 34)
  y += 48

  // Mention légale
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  y = wrapText(doc,
    'Ce contrat est généré automatiquement par le système L&Lui Signature. Il est archivé sur nos serveurs sécurisés et accessible depuis votre portail couple. Référence unique : ' + s(data.contrat_id),
    MARGIN, y, W, 4)

  drawFooter(doc, 3, totalPages)

  return doc.output('datauristring')
}
