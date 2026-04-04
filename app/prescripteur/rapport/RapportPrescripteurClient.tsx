'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { getRapportMensuel } from '@/actions/prescripteurs'
import type { RapportMensuel } from '@/actions/prescripteurs'

const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

export default function RapportPrescripteurClient() {
  const router = useRouter()
  const now = new Date()
  const [annee, setAnnee] = useState(now.getFullYear())
  const [moisIdx, setMoisIdx] = useState(now.getMonth()) // 0-11
  const [rapport, setRapport] = useState<RapportMensuel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    const uid = sessionStorage.getItem('prescripteur_uid')
    if (!uid) { router.replace('/prescripteur'); return }
    const moisStr = `${annee}-${String(moisIdx + 1).padStart(2, '0')}`
    setIsLoading(true)
    getRapportMensuel(uid, moisStr)
      .then(setRapport)
      .finally(() => setIsLoading(false))
  }, [router, annee, moisIdx])

  const prevMois = () => {
    if (moisIdx === 0) { setMoisIdx(11); setAnnee((a) => a - 1) }
    else setMoisIdx((m) => m - 1)
  }
  const nextMois = () => {
    const isCurrentMonth = moisIdx === now.getMonth() && annee === now.getFullYear()
    if (isCurrentMonth) return
    if (moisIdx === 11) { setMoisIdx(0); setAnnee((a) => a + 1) }
    else setMoisIdx((m) => m + 1)
  }

  const generatePDF = useCallback(async () => {
    if (!rapport) return
    setIsGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210; let y = 0

      doc.setFillColor(26, 26, 26)
      doc.rect(0, 0, W, 38, 'F')
      doc.setTextColor(201, 168, 76); doc.setFont('helvetica', 'bold'); doc.setFontSize(20)
      doc.text('L&Lui Signature', 15, 16)
      doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont('helvetica', 'normal')
      doc.text('Mon rapport prescripteur', 15, 25)
      doc.setFontSize(13); doc.setFont('helvetica', 'bold')
      doc.text(rapport.mois_label, 15, 34)
      y = 50

      doc.setFillColor(250, 247, 240); doc.setDrawColor(201, 168, 76)
      doc.roundedRect(15, y, W - 30, 40, 3, 3, 'FD')
      doc.setTextColor(26, 26, 26); doc.setFontSize(9)
      const infoRows = [
        ['NOM', rapport.prescripteur.nom_complet],
        ['TYPE', rapport.prescripteur.type?.toUpperCase() ?? '—'],
        ['CODE', rapport.prescripteur.code_promo],
      ]
      infoRows.forEach(([label, val], i) => {
        const rowY = y + 10 + i * 9
        doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 100, 60)
        doc.text(label + ' :', 22, rowY)
        doc.setFont('helvetica', 'normal'); doc.setTextColor(26, 26, 26)
        doc.text(val, 60, rowY)
      })
      y += 50

      const kpis = [
        ['Clients amenes', `${rapport.clients_amenes}`],
        ['Commissions gagnees', `${rapport.commissions_gagnees.toLocaleString('fr-FR')} FCFA`],
        ['Retraits effectues', `${rapport.retraits_effectues.toLocaleString('fr-FR')} FCFA`],
        ['Solde restant', `${rapport.solde_restant.toLocaleString('fr-FR')} FCFA`],
      ]
      doc.setFillColor(26, 26, 26); doc.roundedRect(15, y, W - 30, 8, 2, 2, 'F')
      doc.setTextColor(201, 168, 76); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
      doc.text('RESUME', 20, y + 5.5); y += 12

      kpis.forEach(([label, val], i) => {
        const bg = i % 2 === 0 ? [250, 247, 240] as const : [255, 255, 255] as const
        doc.setFillColor(bg[0], bg[1], bg[2]); doc.rect(15, y, W - 30, 8, 'F')
        doc.setTextColor(80, 70, 50); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
        doc.text(label, 22, y + 5.5)
        doc.setTextColor(26, 26, 26); doc.text(val, W - 20, y + 5.5, { align: 'right' })
        y += 8
      })

      doc.setFontSize(8); doc.setTextColor(150, 140, 120); doc.setFont('helvetica', 'normal')
      doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')} — L&Lui Signature Kribi`, 15, 285)

      const filename = `mon-rapport-${rapport.mois}.pdf`
      doc.save(filename)
    } finally {
      setIsGenerating(false)
    }
  }, [rapport])

  const isFutureMonth = moisIdx === now.getMonth() && annee === now.getFullYear()

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <button onClick={() => router.back()} className="text-white/50 hover:text-white p-1">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-semibold">Mon rapport mensuel</h1>
      </div>

      {/* Sélecteur mois */}
      <div className="flex items-center justify-center gap-4 py-5 border-b border-white/10">
        <button onClick={prevMois} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-white font-semibold text-lg min-w-[160px] text-center">
          {MOIS_FR[moisIdx]} {annee}
        </span>
        <button
          onClick={nextMois}
          disabled={isFutureMonth}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex-1 px-5 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="text-gold-400 animate-spin" />
          </div>
        ) : !rapport ? (
          <p className="text-center text-white/40 py-16">Rapport indisponible</p>
        ) : (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Clients amenés', value: rapport.clients_amenes, suffix: '' },
                { label: 'Commissions', value: `${rapport.commissions_gagnees.toLocaleString('fr-FR')}`, suffix: ' F' },
                { label: 'Retraits', value: `${rapport.retraits_effectues.toLocaleString('fr-FR')}`, suffix: ' F' },
                { label: 'Solde restant', value: `${rapport.solde_restant.toLocaleString('fr-FR')}`, suffix: ' F' },
              ].map((k) => (
                <div key={k.label} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-white/40 text-xs mb-1">{k.label}</p>
                  <p className="text-gold-300 text-xl font-semibold">{k.value}<span className="text-sm text-gold-400/60">{k.suffix}</span></p>
                </div>
              ))}
            </div>

            {/* Liste transactions */}
            {rapport.transactions.length > 0 && (
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                  <p className="text-white/70 text-sm font-semibold">Détail ({rapport.transactions.length} clients)</p>
                </div>
                <div className="divide-y divide-white/5">
                  {rapport.transactions.map((t, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{t.client}</p>
                        <p className="text-xs text-white/40 truncate">{t.hebergement} · {t.date}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-gold-300 font-semibold text-sm">+{t.montant.toLocaleString('fr-FR')} F</p>
                        <p className={`text-xs ${t.statut === 'Créditée' ? 'text-green-400' : t.statut === 'Annulée' ? 'text-red-400' : 'text-amber-400'}`}>
                          {t.statut}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rapport.transactions.length === 0 && (
              <div className="text-center py-8 text-white/30 text-sm">
                Aucune transaction ce mois-ci
              </div>
            )}

            {/* Bouton PDF */}
            <button
              onClick={generatePDF}
              disabled={isGenerating}
              className="w-full py-4 rounded-2xl bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-sm flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              Télécharger mon rapport PDF
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
