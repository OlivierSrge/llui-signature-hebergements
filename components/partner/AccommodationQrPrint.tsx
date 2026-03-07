'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import { X, Download } from 'lucide-react'

interface AccommodationQrPrintProps {
  accommodation: {
    id: string
    name: string
    slug: string
    price_per_night: number
    partner_name?: string
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ')
  let line = ''
  let currentY = y

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' '
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, currentY)
      line = words[i] + ' '
      currentY += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line.trim(), x, currentY)
  return currentY + lineHeight
}

export default function AccommodationQrPrint({ accommodation }: AccommodationQrPrintProps) {
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [filename, setFilename] = useState('')

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const WIDTH = 1748
      const HEIGHT = 2480
      const GOLD = '#C9A84C'
      const DARK = '#1A1A1A'
      const BEIGE_BG = '#F5F0E8'

      const canvas = document.createElement('canvas')
      canvas.width = WIDTH
      canvas.height = HEIGHT
      const ctx = canvas.getContext('2d')!

      ctx.fillStyle = BEIGE_BG
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      ctx.strokeStyle = GOLD
      ctx.lineWidth = 20
      ctx.strokeRect(10, 10, WIDTH - 20, HEIGHT - 20)

      ctx.fillStyle = GOLD
      ctx.font = 'bold 120px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText('L&Lui Signature', WIDTH / 2, 240)

      const sepY = 280
      ctx.strokeStyle = GOLD
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(120, sepY)
      ctx.lineTo(WIDTH - 120, sepY)
      ctx.stroke()

      ctx.fillStyle = DARK + '99'
      ctx.font = '52px Georgia, serif'
      ctx.fillText('Réservez ce logement', WIDTH / 2, 380)

      ctx.fillStyle = DARK
      ctx.font = 'bold 80px Georgia, serif'
      ctx.textAlign = 'center'
      const nameY = wrapText(ctx, accommodation.name, WIDTH / 2, 500, WIDTH - 240, 100)

      const qrCanvas = document.createElement('canvas')
      qrCanvas.width = 400
      qrCanvas.height = 400
      const url = `https://llui-signature-hebergements.vercel.app/hebergements/${accommodation.slug}`
      await QRCode.toCanvas(qrCanvas, url, { width: 400, margin: 0 })

      const qrX = (WIDTH - 400) / 2
      const qrY = Math.max(nameY + 40, 700)
      ctx.drawImage(qrCanvas, qrX, qrY)

      ctx.fillStyle = DARK + '80'
      ctx.font = '44px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText('Scannez pour voir les disponibilités et réserver', WIDTH / 2, qrY + 400 + 70)

      const sep2Y = qrY + 400 + 120
      ctx.strokeStyle = GOLD + '60'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(200, sep2Y)
      ctx.lineTo(WIDTH - 200, sep2Y)
      ctx.stroke()

      ctx.fillStyle = GOLD
      ctx.font = 'bold 72px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        `À partir de ${accommodation.price_per_night.toLocaleString('fr-FR')} FCFA / nuit`,
        WIDTH / 2,
        sep2Y + 100
      )

      let bottomY = sep2Y + 200
      if (accommodation.partner_name) {
        ctx.fillStyle = DARK + 'CC'
        ctx.font = '52px Georgia, serif'
        ctx.textAlign = 'center'
        ctx.fillText(accommodation.partner_name, WIDTH / 2, bottomY)
        bottomY += 80
      }

      ctx.fillStyle = DARK + '60'
      ctx.font = '44px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText('llui-signature-hebergements.vercel.app', WIDTH / 2, HEIGHT - 100)

      const dataUrl = canvas.toDataURL('image/png')
      const partnerSlug = accommodation.partner_name
        ? accommodation.partner_name.toLowerCase().replace(/\s+/g, '-')
        : 'partenaire'
      const fname = `QR-${accommodation.slug}-${partnerSlug}.png`

      // iOS Safari ne supporte pas link.click() sur data URLs → afficher le modal
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
      if (isIOS) {
        setFilename(fname)
        setPreviewUrl(dataUrl)
      } else {
        const link = document.createElement('a')
        link.download = fname
        link.href = dataUrl
        link.click()
      }
    } catch (err) {
      console.error('Erreur génération QR:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 bg-beige-50 border border-gold-200 text-gold-700 rounded-xl text-sm font-medium hover:bg-gold-50 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
            Génération...
          </>
        ) : (
          <>🖨️ Générer QR Code chambre</>
        )}
      </button>

      {/* Modal d'aperçu (iOS & fallback) */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 gap-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-beige-100">
              <p className="text-sm font-semibold text-dark">QR Code prêt</p>
              <button onClick={() => setPreviewUrl(null)} className="p-1 text-dark/40 hover:text-dark">
                <X size={18} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="QR Code" className="w-full" />
            <div className="p-4 space-y-3">
              <p className="text-xs text-center text-dark/50">
                📱 Appuyez longuement sur l&apos;image pour l&apos;enregistrer dans vos photos
              </p>
              <a
                href={previewUrl}
                download={filename}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-gold-500 text-white rounded-xl text-sm font-medium"
              >
                <Download size={15} /> Télécharger
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
