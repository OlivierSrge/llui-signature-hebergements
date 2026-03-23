'use client'
// components/portail/monogramme/MonogrammeCanvas.tsx — #189 Monogramme couple Canvas HTML5

import { useEffect, useRef, useState } from 'react'

const STYLES = [
  { id: 'classic', label: 'Classic Gold', font: 'Georgia, serif', color: '#C9A84C', bg: '#1A1A1A' },
  { id: 'modern', label: 'Modern Dark', font: 'Helvetica, sans-serif', color: '#FFFFFF', bg: '#1A1A1A' },
  { id: 'floral', label: 'Floral Rose', font: 'Georgia, serif', color: '#C96FB0', bg: '#FFF0F5' },
]

function drawMonogramme(
  canvas: HTMLCanvasElement,
  initiale1: string,
  initiale2: string,
  style: typeof STYLES[0],
  date: string
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const H = canvas.height

  // Fond
  ctx.fillStyle = style.bg
  ctx.fillRect(0, 0, W, H)

  const cx = W / 2
  const cy = H / 2

  // Cercle décoratif
  ctx.strokeStyle = style.color + '40'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy - 20, 90, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = style.color + '20'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy - 20, 100, 0, Math.PI * 2)
  ctx.stroke()

  // Initiales
  ctx.fillStyle = style.color
  ctx.font = `bold 96px ${style.font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const i1 = (initiale1 || 'A').toUpperCase()
  const i2 = (initiale2 || 'B').toUpperCase()

  // Initiale gauche (légèrement plus petite)
  ctx.font = `bold 72px ${style.font}`
  ctx.globalAlpha = 0.85
  ctx.fillText(i1, cx - 48, cy - 20)

  // Esperluette
  ctx.font = `italic 36px ${style.font}`
  ctx.globalAlpha = 0.5
  ctx.fillText('&', cx, cy + 8)

  // Initiale droite
  ctx.font = `bold 72px ${style.font}`
  ctx.globalAlpha = 0.85
  ctx.fillText(i2, cx + 48, cy - 20)
  ctx.globalAlpha = 1

  // Ligne décoration
  ctx.strokeStyle = style.color
  ctx.lineWidth = 1
  const lineY = cy + 40
  ctx.beginPath()
  ctx.moveTo(cx - 70, lineY)
  ctx.lineTo(cx - 12, lineY)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx + 12, lineY)
  ctx.lineTo(cx + 70, lineY)
  ctx.stroke()
  // Diamant central
  ctx.fillStyle = style.color
  ctx.font = '10px sans-serif'
  ctx.fillText('♦', cx, lineY + 1)

  // Date
  if (date) {
    ctx.fillStyle = style.color
    ctx.globalAlpha = 0.6
    ctx.font = `13px ${style.font}`
    ctx.fillText(new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), cx, cy + 68)
    ctx.globalAlpha = 1
  }

  // Signature L&Lui
  ctx.fillStyle = style.color
  ctx.globalAlpha = 0.3
  ctx.font = `9px ${style.font}`
  ctx.fillText('L&Lui Signature', cx, H - 18)
  ctx.globalAlpha = 1
}

export default function MonogrammeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [initiale1, setInitiale1] = useState('M')
  const [initiale2, setInitiale2] = useState('J')
  const [date, setDate] = useState('')
  const [styleId, setStyleId] = useState('classic')
  const [downloading, setDownloading] = useState(false)

  const style = STYLES.find(s => s.id === styleId) ?? STYLES[0]

  useEffect(() => {
    if (canvasRef.current) {
      drawMonogramme(canvasRef.current, initiale1, initiale2, style, date)
    }
  }, [initiale1, initiale2, style, date])

  function handleDownloadPNG() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `monogramme-${initiale1}${initiale2}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function handleDownloadPDF() {
    setDownloading(true)
    try {
      const canvas = canvasRef.current
      if (!canvas) return
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ format: 'a5', unit: 'mm', orientation: 'portrait' })
      const imgData = canvas.toDataURL('image/png')
      doc.addImage(imgData, 'PNG', 10, 10, 128, 128)
      doc.save(`monogramme-${initiale1}${initiale2}.pdf`)
    } catch (e) { console.error(e) }
    finally { setDownloading(false) }
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#FAF6EE' }}>
      <div className="max-w-sm mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-[#1A1A1A] mb-1">💍 Monogramme Couple</h1>
          <p className="text-xs text-[#888]">Créez votre monogramme personnalisé</p>
        </div>

        {/* Canvas */}
        <div className="flex justify-center mb-5">
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="rounded-2xl shadow-xl"
            style={{ maxWidth: '100%', border: '1px solid #E8E0D0' }}
          />
        </div>

        {/* Styles */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] mb-4">
          <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Style</p>
          <div className="flex gap-2">
            {STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => setStyleId(s.id)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: styleId === s.id ? '#C9A84C' : '#F5F0E8',
                  color: styleId === s.id ? 'white' : '#888',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Initiales */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] mb-4">
          <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Initiales</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#888] block mb-1">Initiale 1</label>
              <input
                type="text"
                maxLength={1}
                value={initiale1}
                onChange={e => setInitiale1(e.target.value.toUpperCase().slice(0, 1))}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-2xl font-bold text-center focus:outline-none focus:border-[#C9A84C]"
                style={{ color: '#C9A84C' }}
              />
            </div>
            <div>
              <label className="text-[10px] text-[#888] block mb-1">Initiale 2</label>
              <input
                type="text"
                maxLength={1}
                value={initiale2}
                onChange={e => setInitiale2(e.target.value.toUpperCase().slice(0, 1))}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-2xl font-bold text-center focus:outline-none focus:border-[#C9A84C]"
                style={{ color: '#C9A84C' }}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-[10px] text-[#888] block mb-1">Date du mariage (optionnel)</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
            />
          </div>
        </div>

        {/* Export */}
        <div className="flex gap-3">
          <button
            onClick={handleDownloadPNG}
            className="flex-1 py-3 rounded-2xl font-semibold text-white text-sm"
            style={{ background: '#C9A84C' }}
          >
            📸 PNG
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex-1 py-3 rounded-2xl font-semibold text-sm disabled:opacity-50"
            style={{ background: '#1A1A1A', color: 'white' }}
          >
            {downloading ? '…' : '📄 PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
