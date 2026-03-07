'use client'

import { useRef } from 'react'
import { CreditCard } from 'lucide-react'
import type { LoyaltyClient } from '@/lib/types'
import { NIVEAUX } from '@/lib/loyalty'

interface Props {
  client: LoyaltyClient
}

// Génère le QR code en canvas via l'API qrcode (chargée dynamiquement côté client)
async function renderQrToCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number
): Promise<void> {
  const QRCode = (await import('qrcode')).default
  const qrCanvas = document.createElement('canvas')
  await QRCode.toCanvas(qrCanvas, text, {
    width: size,
    margin: 1,
    color: { dark: '#1a1209', light: '#FFFBF0' },
  })
  ctx.drawImage(qrCanvas, x, y, size, size)
}

export default function MonCompteMemberCard({ client }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const niveau = NIVEAUX[client.niveau || 'novice']

  // Couleurs de la carte par niveau
  const cardTheme: Record<string, { bg1: string; bg2: string; accent: string; text: string }> = {
    novice: { bg1: '#F5F0E8', bg2: '#E8DCC8', accent: '#8B7355', text: '#3D2B1A' },
    explorateur: { bg1: '#F0F8F0', bg2: '#D4EDD4', accent: '#2E7D32', text: '#1B3D1B' },
    ambassadeur: { bg1: '#F0F4FF', bg2: '#CCDAF8', accent: '#1565C0', text: '#0D2A5C' },
    excellence: { bg1: '#FFFBF0', bg2: '#F4E5A0', accent: '#B8860B', text: '#5A3E00' },
  }

  const theme = cardTheme[client.niveau || 'novice']

  async function generateCard() {
    const canvas = canvasRef.current
    if (!canvas) return

    const W = 856
    const H = 540
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // ── Fond dégradé ──
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, theme.bg1)
    grad.addColorStop(1, theme.bg2)
    ctx.fillStyle = grad
    ctx.beginPath()
    roundRect(ctx, 0, 0, W, H, 28)
    ctx.fill()

    // ── Motif décoratif (cercles superposés) ──
    ctx.globalAlpha = 0.07
    ctx.fillStyle = theme.accent
    ctx.beginPath()
    ctx.arc(W - 100, -60, 220, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(W - 30, 120, 140, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.04
    ctx.beginPath()
    ctx.arc(-60, H + 30, 200, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // ── Ligne dorée horizontale ──
    ctx.strokeStyle = theme.accent
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.moveTo(50, 180)
    ctx.lineTo(W - 50, 180)
    ctx.stroke()
    ctx.globalAlpha = 1

    // ── Logo / Nom de la marque ──
    ctx.font = `bold 32px Georgia, serif`
    ctx.fillStyle = theme.accent
    ctx.fillText('L', 52, 100)
    ctx.fillStyle = theme.text
    ctx.fillText('&Lui Signature', 68, 100)

    ctx.font = `13px Arial, sans-serif`
    ctx.fillStyle = theme.accent
    ctx.globalAlpha = 0.6
    ctx.fillText('L&LUI STARS — CARTE MEMBRE', 52, 122)
    ctx.globalAlpha = 1

    // ── Niveau ──
    const niveauText = `${niveau.emoji}  ${niveau.label.toUpperCase()}`
    ctx.font = `bold 18px Arial, sans-serif`
    ctx.fillStyle = theme.accent
    ctx.fillText(niveauText, 52, 158)

    // ── Nom du client ──
    ctx.font = `bold 36px Georgia, serif`
    ctx.fillStyle = theme.text
    ctx.fillText(`${client.firstName} ${client.lastName}`.toUpperCase(), 52, 250)

    // ── Code membre ──
    ctx.font = `bold 20px "Courier New", monospace`
    ctx.fillStyle = theme.accent
    ctx.fillText(client.memberCode, 52, 295)

    // ── Date d'adhésion ──
    const joinDate = client.joinedAt
      ? new Date(client.joinedAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : '—'
    ctx.font = `13px Arial, sans-serif`
    ctx.fillStyle = theme.text
    ctx.globalAlpha = 0.55
    ctx.fillText(`Membre depuis ${joinDate}`, 52, 330)
    ctx.globalAlpha = 1

    // ── Avantages résumés ──
    ctx.font = `12px Arial, sans-serif`
    ctx.fillStyle = theme.text
    ctx.globalAlpha = 0.65
    const summary = [
      `Hébergements : -${niveau.hebergementDiscount}%`,
      `Boutique : -${niveau.boutiqueDiscount}%`,
      `Code boutique : ${client.boutiquePromoCode}`,
    ]
    summary.forEach((line, i) => {
      ctx.fillText(`• ${line}`, 52, 380 + i * 22)
    })
    ctx.globalAlpha = 1

    // ── Séparateur vertical ──
    ctx.strokeStyle = theme.accent
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.3
    ctx.beginPath()
    ctx.moveTo(W - 220, 200)
    ctx.lineTo(W - 220, H - 80)
    ctx.stroke()
    ctx.globalAlpha = 1

    // ── QR Code ──
    const qrUrl = `https://llui-signature-hebergements.vercel.app/mon-compte?code=${client.memberCode}`
    try {
      await renderQrToCanvas(ctx, qrUrl, W - 205, 210, 150)
    } catch {
      ctx.font = `11px Arial, sans-serif`
      ctx.fillStyle = theme.accent
      ctx.globalAlpha = 0.5
      ctx.fillText('QR Code', W - 165, 285)
      ctx.globalAlpha = 1
    }

    ctx.font = `10px Arial, sans-serif`
    ctx.fillStyle = theme.accent
    ctx.globalAlpha = 0.45
    ctx.textAlign = 'center'
    ctx.fillText('Scanner pour accéder', W - 130, 375)
    ctx.fillText('aux avantages', W - 130, 388)
    ctx.globalAlpha = 1
    ctx.textAlign = 'left'

    // ── Pied de carte ──
    ctx.fillStyle = theme.accent
    ctx.globalAlpha = 0.12
    ctx.beginPath()
    roundRect(ctx, 0, H - 70, W, 70, { bl: 28, br: 28, tl: 0, tr: 0 })
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.font = `11px Arial, sans-serif`
    ctx.fillStyle = theme.accent
    ctx.globalAlpha = 0.6
    ctx.fillText('llui-signature-hebergements.vercel.app', 52, H - 40)
    ctx.textAlign = 'right'
    ctx.fillText('letlui-signature.netlify.app', W - 52, H - 40)
    ctx.textAlign = 'left'
    ctx.globalAlpha = 1

    // ── Téléchargement ──
    const link = document.createElement('a')
    link.download = `carte-membre-llui-${client.memberCode}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <button
        onClick={generateCard}
        className="flex items-center gap-2 px-4 py-2.5 border-2 rounded-xl text-sm font-semibold transition-all hover:bg-dark hover:text-white hover:border-dark"
        style={{ borderColor: niveau.color, color: niveau.color }}
      >
        <CreditCard size={14} /> Télécharger ma carte
      </button>
    </>
  )
}

// Utilitaire roundRect compatible tous navigateurs
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number | { tl?: number; tr?: number; br?: number; bl?: number }
) {
  const r = typeof radius === 'number'
    ? { tl: radius, tr: radius, br: radius, bl: radius }
    : { tl: 0, tr: 0, br: 0, bl: 0, ...radius }

  ctx.moveTo(x + r.tl, y)
  ctx.lineTo(x + w - r.tr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr)
  ctx.lineTo(x + w, y + h - r.br)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h)
  ctx.lineTo(x + r.bl, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl)
  ctx.lineTo(x, y + r.tl)
  ctx.quadraticCurveTo(x, y, x + r.tl, y)
  ctx.closePath()
}
