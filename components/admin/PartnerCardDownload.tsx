'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import type { Partner } from '@/lib/types'

interface Props {
  partner: Partner
}

const PORTAL_URL = 'https://llui-signature-hebergements.vercel.app/partenaire'

// Colors
const BEIGE   = '#F5F0E8'
const GOLD    = '#C9A84C'
const DARK    = '#1A1A1A'
const GOLD_LIGHT = '#EDD98A'
const WHITE   = '#FFFFFF'

export default function PartnerCardDownload({ partner }: Props) {
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const QRCode = (await import('qrcode')).default

      const W = 800
      const H = 500
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!

      // ── Background beige ──────────────────────────────────────
      ctx.fillStyle = BEIGE
      ctx.fillRect(0, 0, W, H)

      // ── Left gold accent bar ──────────────────────────────────
      ctx.fillStyle = GOLD
      ctx.fillRect(0, 0, 6, H)

      // ── Top gold strip ────────────────────────────────────────
      ctx.fillStyle = GOLD
      ctx.fillRect(0, 0, W, 4)

      // ── Bottom gold strip ─────────────────────────────────────
      ctx.fillStyle = GOLD
      ctx.fillRect(0, H - 4, W, 4)

      // ── Decorative corner circle (top-right) ──────────────────
      ctx.save()
      ctx.globalAlpha = 0.07
      ctx.fillStyle = GOLD
      ctx.beginPath()
      ctx.arc(W, 0, 260, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // ── Decorative circle (bottom-left) ───────────────────────
      ctx.save()
      ctx.globalAlpha = 0.05
      ctx.fillStyle = DARK
      ctx.beginPath()
      ctx.arc(0, H, 200, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // ── Brand name: "L&Lui Signature Kribi" ───────────────────
      ctx.fillStyle = GOLD
      ctx.font = 'bold 13px Georgia, serif'
      ctx.letterSpacing = '3px'
      ctx.fillText('L&LUI SIGNATURE KRIBI', 36, 44)
      ctx.letterSpacing = '0px'

      // ── Thin separator line ───────────────────────────────────
      ctx.strokeStyle = GOLD
      ctx.globalAlpha = 0.4
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(36, 54)
      ctx.lineTo(W - 36, 54)
      ctx.stroke()
      ctx.globalAlpha = 1

      // ── Title: "Espace Partenaire" ────────────────────────────
      ctx.fillStyle = DARK
      ctx.font = 'bold 32px Georgia, serif'
      ctx.fillText('Espace Partenaire', 36, 104)

      // ── Partner name ──────────────────────────────────────────
      ctx.fillStyle = GOLD
      ctx.font = 'bold 22px Georgia, serif'
      ctx.fillText(partner.name, 36, 145)

      // ── Divider ───────────────────────────────────────────────
      ctx.strokeStyle = GOLD
      ctx.globalAlpha = 0.3
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(36, 168)
      ctx.lineTo(360, 168)
      ctx.stroke()
      ctx.globalAlpha = 1

      // ── Helper: label + value block ───────────────────────────
      const drawField = (label: string, value: string, x: number, y: number) => {
        ctx.font = '11px Arial, sans-serif'
        ctx.fillStyle = DARK
        ctx.globalAlpha = 0.45
        ctx.fillText(label.toUpperCase(), x, y)
        ctx.globalAlpha = 1

        // Pill background
        const valW = Math.max(180, ctx.measureText(value).width + 32)
        const pillH = 38
        const pillY = y + 8
        const r = 8

        ctx.fillStyle = WHITE
        ctx.shadowColor = 'rgba(0,0,0,0.06)'
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.moveTo(x + r, pillY)
        ctx.lineTo(x + valW - r, pillY)
        ctx.quadraticCurveTo(x + valW, pillY, x + valW, pillY + r)
        ctx.lineTo(x + valW, pillY + pillH - r)
        ctx.quadraticCurveTo(x + valW, pillY + pillH, x + valW - r, pillY + pillH)
        ctx.lineTo(x + r, pillY + pillH)
        ctx.quadraticCurveTo(x, pillY + pillH, x, pillY + pillH - r)
        ctx.lineTo(x, pillY + r)
        ctx.quadraticCurveTo(x, pillY, x + r, pillY)
        ctx.closePath()
        ctx.fill()
        ctx.shadowBlur = 0

        ctx.fillStyle = DARK
        ctx.font = 'bold 15px monospace'
        ctx.fillText(value, x + 14, pillY + 24)
      }

      drawField('Code d\'accès', partner.access_code, 36, 192)
      drawField('PIN', partner.access_pin ?? '—', 36, 272)

      // ── QR Code (right side) ──────────────────────────────────
      const QR_SIZE = 180
      const QR_X = W - QR_SIZE - 60
      const QR_Y = 80

      // QR white card
      const cardPad = 14
      const cardR = 16
      const cx = QR_X - cardPad
      const cy = QR_Y - cardPad
      const cw = QR_SIZE + cardPad * 2
      const ch = QR_SIZE + cardPad * 2 + 32

      ctx.fillStyle = WHITE
      ctx.shadowColor = 'rgba(0,0,0,0.1)'
      ctx.shadowBlur = 20
      ctx.beginPath()
      ctx.moveTo(cx + cardR, cy)
      ctx.lineTo(cx + cw - cardR, cy)
      ctx.quadraticCurveTo(cx + cw, cy, cx + cw, cy + cardR)
      ctx.lineTo(cx + cw, cy + ch - cardR)
      ctx.quadraticCurveTo(cx + cw, cy + ch, cx + cw - cardR, cy + ch)
      ctx.lineTo(cx + cardR, cy + ch)
      ctx.quadraticCurveTo(cx, cy + ch, cx, cy + ch - cardR)
      ctx.lineTo(cx, cy + cardR)
      ctx.quadraticCurveTo(cx, cy, cx + cardR, cy)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0

      // Gold top border on QR card
      ctx.strokeStyle = GOLD
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.6
      ctx.beginPath()
      ctx.moveTo(cx + cardR, cy)
      ctx.lineTo(cx + cw - cardR, cy)
      ctx.quadraticCurveTo(cx + cw, cy, cx + cw, cy + cardR)
      ctx.stroke()
      ctx.globalAlpha = 1

      // Generate QR onto temp canvas then draw
      const qrCanvas = document.createElement('canvas')
      await QRCode.toCanvas(qrCanvas, PORTAL_URL, {
        width: QR_SIZE,
        margin: 0,
        color: { dark: DARK, light: WHITE },
      })
      ctx.drawImage(qrCanvas, QR_X, QR_Y)

      // "Scanner pour accéder" label
      ctx.fillStyle = DARK
      ctx.globalAlpha = 0.5
      ctx.font = '11px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Scanner pour accéder', cx + cw / 2, cy + ch - 8)
      ctx.textAlign = 'left'
      ctx.globalAlpha = 1

      // ── Bottom URL ────────────────────────────────────────────
      const bottomY = H - 24
      ctx.fillStyle = DARK
      ctx.globalAlpha = 0.35
      ctx.font = '12px Arial, sans-serif'
      ctx.fillText(PORTAL_URL, 36, bottomY)
      ctx.globalAlpha = 1

      // ── Gold dot accent ───────────────────────────────────────
      ctx.fillStyle = GOLD
      ctx.beginPath()
      ctx.arc(W - 20, bottomY - 4, 4, 0, Math.PI * 2)
      ctx.fill()

      // ── Download ──────────────────────────────────────────────
      const link = document.createElement('a')
      link.download = `carte-partenaire-${partner.name.replace(/\s+/g, '-').toLowerCase()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Erreur génération carte:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={generate}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 disabled:opacity-50 transition-colors"
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
      {loading ? 'Génération...' : 'Télécharger la carte partenaire'}
    </button>
  )
}
