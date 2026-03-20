// app/api/admin/export/pdf-rapport/route.ts
// GET — Rapport PDF mensuel jsPDF (côté serveur via dynamic import)

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA' }
function now() { return new Date() }

export async function GET() {
  try {
    const db = getDb()
    const mois = now()
    mois.setDate(1); mois.setHours(0, 0, 0, 0)
    const moisLabel = now().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

    const [txSnap, usersSnap, fsSnap] = await Promise.all([
      db.collectionGroup('transactions').get(),
      db.collection('portail_users').get(),
      db.collection('fast_start_demandes').where('statut', '==', 'PAYEE').get(),
    ])

    const txAll = txSnap.docs.map(d => d.data())
    const txMois = txAll.filter(t => t.created_at?.toDate?.() >= mois && t.status === 'COMPLETED')
    const caTotal = txMois.reduce((s, t) => s + (t.amount_ht ?? 0), 0)
    const primesMois = fsSnap.docs.filter(d => d.data().paye_at?.toDate?.() >= mois).reduce((s, d) => s + (d.data().montant_prime ?? 0), 0)
    const nouveaux = usersSnap.docs.filter(d => d.data().created_at?.toDate?.() >= mois).length

    const top10 = txMois
      .sort((a, b) => (b.amount_ht ?? 0) - (a.amount_ht ?? 0))
      .slice(0, 10)
      .map(t => ({ source: t.source ?? '—', type: t.type ?? '—', montant: t.amount_ht ?? 0, date: t.created_at?.toDate?.().toLocaleDateString('fr-FR') ?? '' }))

    // Import dynamique jsPDF (client lib, mais fonctionne côté serveur aussi)
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const or = [201, 168, 76] as [number, number, number]
    const noir = [26, 26, 26] as [number, number, number]

    // Page 1 — Couverture
    doc.setFillColor(...noir); doc.rect(0, 0, 210, 297, 'F')
    doc.setTextColor(...or); doc.setFontSize(28); doc.setFont('helvetica', 'bold')
    doc.text('L&Lui Signature', 105, 100, { align: 'center' })
    doc.setFontSize(16); doc.setFont('helvetica', 'normal')
    doc.text(`Rapport Mensuel`, 105, 120, { align: 'center' })
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
    doc.text(moisLabel.charAt(0).toUpperCase() + moisLabel.slice(1), 105, 140, { align: 'center' })
    doc.setFontSize(10); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'normal')
    doc.text(`Généré le ${now().toLocaleDateString('fr-FR')} à ${now().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 105, 270, { align: 'center' })

    // Page 2 — Résumé exécutif
    doc.addPage()
    doc.setFillColor(245, 240, 232); doc.rect(0, 0, 210, 297, 'F')
    doc.setTextColor(...noir); doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('Résumé exécutif', 20, 30)
    doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
    const kpis = [
      ['CA total du mois', fmt(caTotal)],
      ['Nombre de transactions', String(txMois.length)],
      ['Nouveaux inscrits', String(nouveaux)],
      ['Primes Fast Start payées', fmt(primesMois)],
    ]
    kpis.forEach(([label, val], i) => {
      const y = 55 + i * 22
      doc.setFillColor(255, 255, 255); doc.roundedRect(15, y - 8, 180, 18, 3, 3, 'F')
      doc.setTextColor(100, 100, 100); doc.setFontSize(10); doc.text(label, 22, y)
      doc.setTextColor(...or); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
      doc.text(val, 195, y, { align: 'right' })
      doc.setFont('helvetica', 'normal')
    })

    // Page 3 — Top 10 transactions
    doc.addPage()
    doc.setFillColor(245, 240, 232); doc.rect(0, 0, 210, 297, 'F')
    doc.setTextColor(...noir); doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text('Top 10 transactions du mois', 20, 25)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
    doc.text('Date', 20, 40); doc.text('Source', 55, 40); doc.text('Type', 120, 40); doc.text('Montant', 175, 40)
    doc.setDrawColor(201, 168, 76); doc.line(15, 43, 195, 43)
    top10.forEach((t, i) => {
      const y = 52 + i * 12
      if (i % 2 === 0) { doc.setFillColor(250, 246, 238); doc.rect(15, y - 5, 180, 11, 'F') }
      doc.setTextColor(...noir)
      doc.text(t.date, 20, y); doc.text(String(t.source).slice(0, 30), 55, y)
      doc.text(t.type, 120, y)
      doc.setTextColor(...or); doc.setFont('helvetica', 'bold')
      doc.text(fmt(t.montant), 195, y, { align: 'right' })
      doc.setFont('helvetica', 'normal')
    })

    const pdfBytes = doc.output('arraybuffer')
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="llui-rapport-${now().toISOString().slice(0, 7)}.pdf"`,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur génération PDF' }, { status: 500 })
  }
}
