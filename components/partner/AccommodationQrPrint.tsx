'use client'

import { useState } from 'react'
import QRCode from 'qrcode'

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

      // Fond beige
      ctx.fillStyle = BEIGE_BG
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      // Bordure or 20px
      ctx.strokeStyle = GOLD
      ctx.lineWidth = 20
      ctx.strokeRect(10, 10, WIDTH - 20, HEIGHT - 20)

      // ---- Logo / titre L&Lui Signature ----
      ctx.fillStyle = GOLD
      ctx.font = 'bold 120px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText('L&Lui Signature', WIDTH / 2, 240)

      // Séparateur or
      const sepY = 280
      ctx.strokeStyle = GOLD
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(120, sepY)
      ctx.lineTo(WIDTH - 120, sepY)
      ctx.stroke()

      // Sous-titre
      ctx.fillStyle = DARK + '99'
      ctx.font = '52px Georgia, serif'
      ctx.fillText('Réservez ce logement', WIDTH / 2, 380)

      // Nom du logement
      ctx.fillStyle = DARK
      ctx.font = 'bold 80px Georgia, serif'
      ctx.textAlign = 'center'
      const nameY = wrapText(ctx, accommodation.name, WIDTH / 2, 500, WIDTH - 240, 100)

      // QR Code
      const qrCanvas = document.createElement('canvas')
      qrCanvas.width = 400
      qrCanvas.height = 400
      const url = `https://llui-signature-hebergements.vercel.app/hebergements/${accommodation.slug}`
      await QRCode.toCanvas(qrCanvas, url, { width: 400, margin: 0 })

      const qrX = (WIDTH - 400) / 2
      const qrY = Math.max(nameY + 40, 700)
      ctx.drawImage(qrCanvas, qrX, qrY)

      // Texte sous QR
      ctx.fillStyle = DARK + '80'
      ctx.font = '44px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText('Scannez pour voir les disponibilités et réserver', WIDTH / 2, qrY + 400 + 70)

      // Séparateur léger
      const sep2Y = qrY + 400 + 120
      ctx.strokeStyle = GOLD + '60'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(200, sep2Y)
      ctx.lineTo(WIDTH - 200, sep2Y)
      ctx.stroke()

      // Prix
      ctx.fillStyle = GOLD
      ctx.font = 'bold 72px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        `À partir de ${accommodation.price_per_night.toLocaleString('fr-FR')} FCFA / nuit`,
        WIDTH / 2,
        sep2Y + 100
      )

      // Nom partenaire
      let bottomY = sep2Y + 200
      if (accommodation.partner_name) {
        ctx.fillStyle = DARK + 'CC'
        ctx.font = '52px Georgia, serif'
        ctx.textAlign = 'center'
        ctx.fillText(accommodation.partner_name, WIDTH / 2, bottomY)
        bottomY += 80
      }

      // Site web tout en bas
      ctx.fillStyle = DARK + '60'
      ctx.font = '44px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText('llui-signature-hebergements.vercel.app', WIDTH / 2, HEIGHT - 100)

      // Téléchargement
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      const partnerSlug = accommodation.partner_name
        ? accommodation.partner_name.toLowerCase().replace(/\s+/g, '-')
        : 'partenaire'
      link.download = `QR-${accommodation.slug}-${partnerSlug}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Erreur génération QR:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
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
        <>
          🖨️ Générer QR Code chambre
        </>
      )}
    </button>
  )
}
