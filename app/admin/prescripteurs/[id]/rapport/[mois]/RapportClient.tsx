'use client'

import { useCallback, useState } from 'react'
import { Download, MessageCircle, Loader2 } from 'lucide-react'
import type { RapportMensuel } from '@/actions/prescripteurs'

interface Props { rapport: RapportMensuel }

export default function RapportClient({ rapport: r }: Props) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generatePDF = useCallback(async () => {
    setIsGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210
      let y = 0

      // ── Header fond sombre
      doc.setFillColor(26, 26, 26)
      doc.rect(0, 0, W, 38, 'F')
      doc.setTextColor(201, 168, 76)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      doc.text('L&Lui Signature', 15, 16)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Rapport mensuel Prescripteur', 15, 25)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(r.mois_label, 15, 34)
      y = 50

      // ── Infos prescripteur
      doc.setDrawColor(201, 168, 76)
      doc.setFillColor(250, 247, 240)
      doc.roundedRect(15, y, W - 30, 40, 3, 3, 'FD')
      doc.setTextColor(26, 26, 26)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const labelX = 22, valX = 70
      const rows = [
        ['NOM', r.prescripteur.nom_complet],
        ['TYPE', r.prescripteur.type?.toUpperCase() ?? '—'],
        ['CODE', r.prescripteur.code_promo],
        ['PERIODE', `01/${r.mois.split('-')[1]}/${r.mois.split('-')[0]} → ${new Date(parseInt(r.mois.split('-')[0]), parseInt(r.mois.split('-')[1]), 0).getDate()}/${r.mois.split('-')[1]}/${r.mois.split('-')[0]}`],
      ]
      rows.forEach(([label, val], i) => {
        const rowY = y + 8 + i * 8
        doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 100, 60)
        doc.text(label + ' :', labelX, rowY)
        doc.setFont('helvetica', 'normal'); doc.setTextColor(26, 26, 26)
        doc.text(val, valX, rowY)
      })
      y += 50

      // ── Résumé
      doc.setFillColor(26, 26, 26)
      doc.roundedRect(15, y, W - 30, 8, 2, 2, 'F')
      doc.setTextColor(201, 168, 76); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
      doc.text('RESUME DU MOIS', 20, y + 5.5)
      y += 12

      const kpis = [
        ['Clients amenes', String(r.clients_amenes)],
        ['Commissions gagnees', `${r.commissions_gagnees.toLocaleString('fr-FR')} FCFA`],
        ['Retraits effectues', `${r.retraits_effectues.toLocaleString('fr-FR')} FCFA`],
        ['Solde restant', `${r.solde_restant.toLocaleString('fr-FR')} FCFA`],
      ]
      kpis.forEach(([label, val], i) => {
        const bg = i % 2 === 0 ? [250, 247, 240] as const : [255, 255, 255] as const
        doc.setFillColor(bg[0], bg[1], bg[2])
        doc.rect(15, y, W - 30, 8, 'F')
        doc.setTextColor(80, 70, 50); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
        doc.text(label, 22, y + 5.5)
        doc.setTextColor(26, 26, 26); doc.setFont('helvetica', 'bold')
        doc.text(val, W - 20, y + 5.5, { align: 'right' })
        y += 8
      })
      y += 8

      // ── Transactions
      if (r.transactions.length > 0) {
        doc.setFillColor(26, 26, 26)
        doc.roundedRect(15, y, W - 30, 8, 2, 2, 'F')
        doc.setTextColor(201, 168, 76); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
        doc.text('DETAIL DES TRANSACTIONS', 20, y + 5.5)
        y += 12

        // En-têtes colonnes
        doc.setFillColor(240, 235, 220)
        doc.rect(15, y, W - 30, 7, 'F')
        doc.setTextColor(80, 70, 50); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
        doc.text('DATE', 20, y + 5)
        doc.text('CLIENT', 45, y + 5)
        doc.text('HEBERGEMENT', 95, y + 5)
        doc.text('MONTANT', 155, y + 5)
        doc.text('STATUT', 178, y + 5)
        y += 7

        r.transactions.forEach((t, i) => {
          if (y > 265) {
            doc.addPage()
            y = 20
          }
          const bg = i % 2 === 0 ? [255, 255, 255] as const : [250, 247, 240] as const
          doc.setFillColor(bg[0], bg[1], bg[2])
          doc.rect(15, y, W - 30, 7, 'F')
          doc.setTextColor(26, 26, 26); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
          doc.text(t.date, 20, y + 5)
          doc.text(t.client.slice(0, 20), 45, y + 5)
          doc.text(t.hebergement.slice(0, 28), 95, y + 5)
          doc.text(`${t.montant.toLocaleString('fr-FR')} F`, 155, y + 5)
          doc.setTextColor(t.statut === 'Creditee' ? 34 : t.statut === 'Annulee' ? 220 : 180,
            t.statut === 'Creditee' ? 140 : t.statut === 'Annulee' ? 50 : 130,
            t.statut === 'Creditee' ? 34 : 0)
          doc.text(t.statut, 178, y + 5)
          y += 7
        })
        y += 5
      }

      // ── Footer
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p)
        doc.setDrawColor(201, 168, 76)
        doc.setLineWidth(0.5)
        doc.line(15, 285, W - 15, 285)
        doc.setFontSize(8); doc.setTextColor(150, 140, 120); doc.setFont('helvetica', 'normal')
        doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')} — L&Lui Signature Kribi`, 15, 290)
        doc.text(`Page ${p}/${pageCount}`, W - 15, 290, { align: 'right' })
      }

      const filename = `rapport-${r.prescripteur.code_promo ?? r.prescripteur.uid}-${r.mois}.pdf`
      doc.save(filename)
    } finally {
      setIsGenerating(false)
    }
  }, [r])

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={generatePDF}
          disabled={isGenerating}
          className="flex items-center gap-2 px-5 py-2.5 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 transition-colors disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          Télécharger PDF
        </button>
        <a
          href={`https://wa.me/${r.prescripteur.telephone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${r.prescripteur.nom_complet.split(' ')[0]} ! Voici votre rapport ${r.mois_label} sur L&Lui Signature. Clients : ${r.clients_amenes}, Commissions : ${r.commissions_gagnees.toLocaleString('fr-FR')} FCFA, Solde : ${r.solde_restant.toLocaleString('fr-FR')} FCFA.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <MessageCircle size={15} /> Envoyer WhatsApp
        </a>
      </div>

      {/* KPI résumé */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Clients amenés', value: r.clients_amenes, suffix: '' },
          { label: 'Commissions', value: r.commissions_gagnees.toLocaleString('fr-FR'), suffix: ' F' },
          { label: 'Retraits', value: r.retraits_effectues.toLocaleString('fr-FR'), suffix: ' F' },
          { label: 'Solde restant', value: r.solde_restant.toLocaleString('fr-FR'), suffix: ' F' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-beige-200 p-5">
            <p className="text-xs text-dark/40 mb-1">{k.label}</p>
            <p className="text-xl font-semibold text-dark">{k.value}<span className="text-sm text-dark/50">{k.suffix}</span></p>
          </div>
        ))}
      </div>

      {/* Tableau transactions */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-beige-200">
          <h2 className="font-semibold text-dark">Transactions ({r.transactions.length})</h2>
        </div>
        {r.transactions.length === 0 ? (
          <p className="text-center py-8 text-dark/40 text-sm">Aucune transaction ce mois</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-beige-200 bg-beige-50">
                  {['Date', 'Client', 'Hébergement', 'Montant', 'Statut'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-dark/50 font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.transactions.map((t, i) => (
                  <tr key={i} className="border-b border-beige-100 hover:bg-beige-50">
                    <td className="px-4 py-3 text-dark/60 whitespace-nowrap">{t.date}</td>
                    <td className="px-4 py-3 font-medium">{t.client}</td>
                    <td className="px-4 py-3 text-dark/60 max-w-[180px] truncate">{t.hebergement}</td>
                    <td className="px-4 py-3 font-semibold text-gold-600">{t.montant.toLocaleString('fr-FR')} F</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        t.statut === 'Créditée' ? 'bg-green-100 text-green-700' :
                        t.statut === 'Annulée' ? 'bg-red-100 text-red-600' :
                        'bg-amber-100 text-amber-700'
                      }`}>{t.statut}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
