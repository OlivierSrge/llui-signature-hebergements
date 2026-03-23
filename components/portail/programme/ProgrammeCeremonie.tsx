'use client'
// components/portail/programme/ProgrammeCeremonie.tsx — #120 Programme cérémonie auto-généré

import { useState } from 'react'

interface EtapeProgramme {
  heure: string
  titre: string
  description: string
  emoji: string
  duree_min: number
}

interface Programme {
  titre: string
  sous_titre: string
  etapes: EtapeProgramme[]
  mot_des_maries: string
  dress_code: string
  contacts_urgence: Array<{ nom: string; role: string; tel: string }>
  genere_le?: string
}

interface Props {
  marie_uid: string
  noms_maries: string
  date_mariage: string
  programme_initial?: Programme
}

function formatDate(iso: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

export default function ProgrammeCeremonie({ marie_uid, noms_maries, date_mariage, programme_initial }: Props) {
  const [programme, setProgramme] = useState<Programme | null>(programme_initial ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  async function generer() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/portail/generer-programme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marie_uid }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur génération'); return }
      setProgramme(data.programme)
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  async function exporterPDF() {
    if (!programme) return
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ format: 'a5', unit: 'mm' })
      const gold: [number, number, number] = [201, 168, 76]
      const dark: [number, number, number] = [26, 26, 26]
      const grey: [number, number, number] = [100, 100, 100]
      const W = 148
      const H = 210

      // Page de couverture
      doc.setFillColor(...dark)
      doc.rect(0, 0, W, H, 'F')
      doc.setTextColor(...gold)
      doc.setFontSize(9)
      doc.text('L&LUI SIGNATURE', W / 2, 22, { align: 'center' })
      doc.setFontSize(20)
      doc.setFont('times', 'italic')
      doc.text(noms_maries, W / 2, 50, { align: 'center' })
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(200, 200, 200)
      doc.text(formatDate(date_mariage), W / 2, 62, { align: 'center' })
      doc.setFontSize(14)
      doc.setTextColor(...gold)
      doc.setFont('times', 'italic')
      doc.text(programme.titre, W / 2, 85, { align: 'center' })
      doc.setFontSize(10)
      doc.setTextColor(180, 180, 180)
      doc.setFont('helvetica', 'normal')
      const sousTitreLignes = doc.splitTextToSize(programme.sous_titre, W - 30)
      doc.text(sousTitreLignes, W / 2, 98, { align: 'center' })

      // Page programme
      doc.addPage()
      doc.setFillColor(250, 246, 238)
      doc.rect(0, 0, W, H, 'F')
      doc.setTextColor(...gold)
      doc.setFontSize(14)
      doc.setFont('times', 'italic')
      doc.text('Programme', W / 2, 16, { align: 'center' })
      doc.setDrawColor(...gold)
      doc.setLineWidth(0.3)
      doc.line(20, 20, W - 20, 20)

      let y = 28
      doc.setFont('helvetica', 'normal')
      for (const etape of programme.etapes) {
        if (y > H - 20) { doc.addPage(); doc.setFillColor(250, 246, 238); doc.rect(0, 0, W, H, 'F'); y = 18 }
        doc.setFontSize(8)
        doc.setTextColor(...gold)
        doc.text(etape.heure, 14, y)
        doc.setTextColor(...dark)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(`${etape.emoji}  ${etape.titre}`, 35, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...grey)
        doc.setFontSize(8)
        const lignes = doc.splitTextToSize(etape.description, W - 45)
        doc.text(lignes, 35, y + 4)
        y += 10 + (lignes.length - 1) * 4
      }

      // Page mot des mariés
      doc.addPage()
      doc.setFillColor(...dark)
      doc.rect(0, 0, W, H, 'F')
      doc.setTextColor(...gold)
      doc.setFontSize(13)
      doc.setFont('times', 'italic')
      doc.text('Mot des mariés', W / 2, 28, { align: 'center' })
      doc.setTextColor(200, 200, 200)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const motLignes = doc.splitTextToSize(programme.mot_des_maries, W - 30)
      doc.text(motLignes, W / 2, 44, { align: 'center' })
      if (programme.dress_code) {
        doc.setTextColor(...gold)
        doc.setFontSize(9)
        doc.text(`Dress code : ${programme.dress_code}`, W / 2, 90, { align: 'center' })
      }
      doc.setTextColor(120, 120, 120)
      doc.setFontSize(7)
      doc.text('Généré par L&Lui Signature', W / 2, H - 10, { align: 'center' })

      doc.save(`programme-mariage-${noms_maries.replace(/\s+/g, '-').toLowerCase()}.pdf`)
    } catch { /* ignore */ }
    setExporting(false)
  }

  if (!programme) {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: '#FDFAF4', border: '1px solid #E8E0D0' }}>
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #1A1A1A, #2D2D2D)' }}>
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] mb-1">PROGRAMME CÉRÉMONIE</p>
          <h3 className="text-lg font-serif text-white">Auto-généré par IA ✨</h3>
          <p className="text-xs text-[#888] mt-1">Personnalisé selon vos données Firestore</p>
        </div>
        <div className="p-5 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm text-[#666] mb-4">Générez un programme complet personnalisé pour votre mariage en un clic grâce à l'IA.</p>
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          <button
            onClick={generer}
            disabled={loading}
            className="px-6 py-3 rounded-2xl font-bold text-white text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg, #C9A84C, #E8C87A)' }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Génération en cours…
              </span>
            ) : '✨ Générer mon programme'}
          </button>
          <p className="text-[10px] text-[#AAA] mt-2">Utilise Claude Sonnet — environ 10 secondes</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#FDFAF4', border: '1px solid #E8E0D0' }}>
      {/* Header */}
      <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #1A1A1A, #2D2D2D)' }}>
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] mb-1">PROGRAMME CÉRÉMONIE</p>
        <h3 className="text-lg font-serif text-white">{programme.titre}</h3>
        <p className="text-xs text-[#888] mt-0.5">{programme.sous_titre}</p>
        <p className="text-[10px] text-[#555] mt-1">{formatDate(date_mariage)}</p>
      </div>

      {/* Dress code */}
      {programme.dress_code && (
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#C9A84C10', borderBottom: '1px solid #E8E0D0' }}>
          <span className="text-sm">👗</span>
          <p className="text-xs text-[#C9A84C] font-semibold">Dress code : {programme.dress_code}</p>
        </div>
      )}

      {/* Étapes */}
      <div className="p-4 space-y-2">
        {programme.etapes.map((etape, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'white', border: '1px solid #F5F0E8' }}>
            <div className="text-center flex-shrink-0" style={{ minWidth: 44 }}>
              <p className="text-xs font-bold text-[#C9A84C]">{etape.heure}</p>
              {etape.duree_min && <p className="text-[9px] text-[#AAA]">{etape.duree_min}min</p>}
            </div>
            <div className="flex items-start gap-2 flex-1">
              <span className="text-base flex-shrink-0">{etape.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">{etape.titre}</p>
                <p className="text-[11px] text-[#888] mt-0.5 leading-relaxed">{etape.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mot des mariés */}
      {programme.mot_des_maries && (
        <div className="mx-4 mb-3 p-4 rounded-xl" style={{ background: '#C9A84C08', border: '1px solid #C9A84C20' }}>
          <p className="text-xs font-bold text-[#C9A84C] mb-2">💛 Mot des mariés</p>
          <p className="text-xs text-[#666] leading-relaxed italic">{programme.mot_des_maries}</p>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={exporterPDF}
          disabled={exporting}
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all"
          style={{ background: '#C9A84C18', color: '#C9A84C', border: '1px solid #C9A84C30' }}
        >
          {exporting ? 'Export…' : '📄 Exporter PDF premium'}
        </button>
        <button
          onClick={generer}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all"
          style={{ background: '#F5F0E8', color: '#888', border: '1px solid #E8E0D0' }}
        >
          {loading ? 'Génération…' : '🔄 Régénérer'}
        </button>
      </div>
    </div>
  )
}
