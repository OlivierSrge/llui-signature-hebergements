'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import { X, Download } from 'lucide-react'

const APP_URL = 'https://llui-signature-hebergements.vercel.app'

interface AccommodationQrPrintProps {
  accommodation: {
    id: string
    name: string
    slug: string
    price_per_night: number
    partner_name?: string
    partner_id?: string
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
    if (ctx.measureText(testLine).width > maxWidth && i > 0) {
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

async function buildQrCanvas(
  title: string,
  subtitle: string,
  url: string,
  price: number,
  brandLine1: string,
  brandLine2: string,
  label: string
): Promise<string> {
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

  // Label type (ex: "QR CODE CHAMBRE")
  ctx.fillStyle = GOLD + '99'
  ctx.font = '36px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText(label.toUpperCase(), WIDTH / 2, 120)

  // Titre principal (nom logement ou partenaire)
  ctx.fillStyle = GOLD
  ctx.font = 'bold 110px Georgia, serif'
  ctx.textAlign = 'center'
  const nameY = wrapText(ctx, title, WIDTH / 2, 200, WIDTH - 200, 130)

  // Séparateur or
  const sepY = nameY + 20
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(120, sepY)
  ctx.lineTo(WIDTH - 120, sepY)
  ctx.stroke()

  // Sous-titre
  ctx.fillStyle = DARK + '99'
  ctx.font = '52px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText(subtitle, WIDTH / 2, sepY + 90)

  // QR Code
  const qrCanvas = document.createElement('canvas')
  qrCanvas.width = 500
  qrCanvas.height = 500
  await QRCode.toCanvas(qrCanvas, url, { width: 500, margin: 0 })
  const qrX = (WIDTH - 500) / 2
  const qrY = sepY + 150
  ctx.drawImage(qrCanvas, qrX, qrY)

  // Texte sous QR
  ctx.fillStyle = DARK + '80'
  ctx.font = '44px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText('Scannez pour voir les disponibilités et réserver', WIDTH / 2, qrY + 500 + 70)

  // Séparateur léger
  const sep2Y = qrY + 500 + 120
  ctx.strokeStyle = GOLD + '60'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(200, sep2Y)
  ctx.lineTo(WIDTH - 200, sep2Y)
  ctx.stroke()

  // Prix
  if (price > 0) {
    ctx.fillStyle = GOLD
    ctx.font = 'bold 72px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText(
      `À partir de ${price.toLocaleString('fr-FR')} FCFA / nuit`,
      WIDTH / 2,
      sep2Y + 100
    )
  }

  // Marque L&Lui Signature
  ctx.fillStyle = DARK + 'CC'
  ctx.font = '52px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText(brandLine1, WIDTH / 2, sep2Y + 200)

  if (brandLine2) {
    ctx.fillStyle = DARK + '80'
    ctx.font = '44px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText(brandLine2, WIDTH / 2, sep2Y + 280)
  }

  ctx.fillStyle = DARK + '60'
  ctx.font = '44px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText('llui-signature-hebergements.vercel.app', WIDTH / 2, HEIGHT - 100)

  return canvas.toDataURL('image/png')
}

function downloadOrPreview(
  dataUrl: string,
  fname: string,
  setPreviewUrl: (u: string) => void,
  setFilename: (f: string) => void
) {
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
}

export default function AccommodationQrPrint({ accommodation }: AccommodationQrPrintProps) {
  const [loadingChambre, setLoadingChambre] = useState(false)
  const [loadingReception, setLoadingReception] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [filename, setFilename] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')

  const handleChambre = async () => {
    setLoadingChambre(true)
    try {
      const url = `${APP_URL}/chambre/${accommodation.slug}`
      const dataUrl = await buildQrCanvas(
        accommodation.name,
        'Réservez ce logement',
        url,
        accommodation.price_per_night,
        'L\u0026Lui Signature',
        accommodation.partner_name ?? '',
        'QR Code chambre'
      )
      const fname = `QR-chambre-${accommodation.slug}.png`
      setPreviewTitle('QR Code chambre')
      downloadOrPreview(dataUrl, fname, setPreviewUrl, setFilename)
    } catch (err) {
      console.error('Erreur QR chambre:', err)
    } finally {
      setLoadingChambre(false)
    }
  }

  const handleReception = async () => {
    if (!accommodation.partner_id) return
    setLoadingReception(true)
    try {
      const url = `${APP_URL}/p/${accommodation.partner_id}`
      const partnerName = accommodation.partner_name ?? 'Partenaire'
      const dataUrl = await buildQrCanvas(
        partnerName,
        'Découvrez tous nos logements',
        url,
        0,
        'L\u0026Lui Signature',
        '',
        'QR Code réception'
      )
      const partnerSlug = partnerName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const fname = `QR-reception-${partnerSlug}.png`
      setPreviewTitle('QR Code réception')
      downloadOrPreview(dataUrl, fname, setPreviewUrl, setFilename)
    } catch (err) {
      console.error('Erreur QR réception:', err)
    } finally {
      setLoadingReception(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* QR Code chambre */}
        <div className="flex flex-col items-end gap-0.5">
          <button
            onClick={handleChambre}
            disabled={loadingChambre}
            className="flex items-center gap-2 px-4 py-2.5 bg-beige-50 border border-gold-200 text-gold-700 rounded-xl text-sm font-medium hover:bg-gold-50 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {loadingChambre ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
                Génération...
              </>
            ) : (
              <>🛏️ QR Code chambre</>
            )}
          </button>
          <p className="text-[10px] text-dark/30 pr-1">À placer dans chaque logement</p>
        </div>

        {/* QR Code réception */}
        {accommodation.partner_id && (
          <div className="flex flex-col items-end gap-0.5">
            <button
              onClick={handleReception}
              disabled={loadingReception}
              className="flex items-center gap-2 px-4 py-2.5 bg-beige-50 border border-gold-200 text-gold-700 rounded-xl text-sm font-medium hover:bg-gold-50 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {loadingReception ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
                  Génération...
                </>
              ) : (
                <>🏨 QR Code réception</>
              )}
            </button>
            <p className="text-[10px] text-dark/30 pr-1">À placer à l&apos;accueil</p>
          </div>
        )}
      </div>

      {/* Modal d'aperçu iOS */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-beige-100">
              <p className="text-sm font-semibold text-dark">{previewTitle} prêt</p>
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
