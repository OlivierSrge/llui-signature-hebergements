'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  getGradeFromStars,
  getProgressToNextGrade,
  GRADE_CONFIGS,
} from '@/types/stars-grade'

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

interface StarsQrCardProps {
  clientUid: string
  clientNom: string
  clientTel: string
  totalStars: number
  qrToken: string
  expiresAt: string
  onExpired: () => void
  onRenew: () => void
  passVipActif?: { grade_pass: string; expires_at: string } | null
}

export default function StarsQrCard({
  clientNom,
  clientTel,
  totalStars,
  qrToken,
  expiresAt,
  onExpired,
  onRenew,
  passVipActif,
}: StarsQrCardProps) {
  const [countdown, setCountdown] = useState('5:00')

  const naturalGrade = getGradeFromStars(totalStars)
  const effectiveGrade = passVipActif
    ? (passVipActif.grade_pass as keyof typeof GRADE_CONFIGS)
    : naturalGrade
  const config = GRADE_CONFIGS[effectiveGrade]
  const progress = getProgressToNextGrade(totalStars)
  const joursRestants = passVipActif
    ? Math.max(0, Math.ceil((new Date(passVipActif.expires_at).getTime() - Date.now()) / 86400000))
    : 0

  useEffect(() => {
    if (!expiresAt) return
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
      )
      const min = Math.floor(remaining / 60)
      const sec = remaining % 60
      setCountdown(`${min}:${sec.toString().padStart(2, '0')}`)
      if (remaining === 0) {
        clearInterval(interval)
        onExpired()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpired])

  const countdownCritical = parseInt(countdown.split(':')[0]) === 0 && parseInt(countdown.split(':')[1]) <= 60

  const telechargerCarte = async () => {
    const card = document.getElementById('stars-qr-card')
    if (!card) return
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(card, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `llui-stars-${effectiveGrade.toLowerCase()}-${clientNom || 'membre'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      alert("Faites une capture d'écran pour sauvegarder votre carte Stars")
    }
  }

  const qrUrl = `${APP_URL}/stars/client/${qrToken}`

  return (
    <div
      id="stars-qr-card"
      style={{
        background: config.bgGradient,
        borderColor: config.borderColor,
      }}
      className={`relative rounded-3xl border-2 p-6 shadow-2xl max-w-sm mx-auto overflow-hidden ${config.specialEffect}`}
    >
      {/* Badge Pass VIP */}
      {passVipActif && (
        <div
          className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold z-10"
          style={{ backgroundColor: GRADE_CONFIGS[passVipActif.grade_pass as keyof typeof GRADE_CONFIGS].color, color: '#FFFFFF' }}
        >
          PASS VIP · {joursRestants}j
        </div>
      )}

      {/* Motif décoratif arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-4 -right-4 text-8xl opacity-10">{config.emoji}</div>
        <div className="absolute -bottom-4 -left-4 text-6xl opacity-5">{config.emoji}</div>
      </div>

      {/* Header — Logo + Grade */}
      <div className="relative flex justify-between items-start mb-5">
        <div className="flex-1 min-w-0">
          <p
            style={{ color: config.textSecondary }}
            className="text-xs font-medium tracking-widest uppercase"
          >
            L&Lui ✦ Signature
          </p>
          <p
            style={{ color: config.textColor }}
            className="text-xl font-bold mt-1 truncate max-w-[180px]"
          >
            {clientNom || clientTel}
          </p>
        </div>
        <div
          style={{
            backgroundColor: config.color + '33',
            borderColor: config.borderColor,
            color: config.textColor,
          }}
          className="flex flex-col items-center border rounded-2xl px-3 py-2 shrink-0"
        >
          <span className="text-2xl">{config.emoji}</span>
          <span className="text-xs font-bold mt-1">{config.label}</span>
        </div>
      </div>

      {/* QR Code */}
      <div className="relative flex justify-center my-4">
        <div
          className="rounded-2xl p-3 shadow-xl"
          style={{ backgroundColor: config.qrBgColor }}
        >
          <QRCodeSVG
            value={qrUrl}
            size={160}
            bgColor={config.qrBgColor}
            fgColor={config.qrFgColor}
            level="M"
            includeMargin={false}
          />
        </div>
      </div>

      {/* Message grade */}
      <p
        style={{ color: config.textSecondary }}
        className="text-center text-xs italic mb-1"
      >
        {config.welcomeMessage}
      </p>
      {passVipActif && (
        <p style={{ color: config.textSecondary }} className="text-center text-xs opacity-70 mb-3">
          Grade naturel : {GRADE_CONFIGS[naturalGrade].label}
        </p>
      )}
      {!passVipActif && <div className="mb-4" />}

      {/* Solde + Countdown */}
      <div className="relative flex justify-between items-center mb-4">
        <div>
          <p style={{ color: config.textColor }} className="text-2xl font-bold">
            {totalStars.toLocaleString('fr-FR')} ⭐
          </p>
          <p style={{ color: config.textSecondary }} className="text-xs">
            Stars disponibles
          </p>
        </div>
        <div className="text-right">
          <p
            style={{ color: countdownCritical ? '#FF6B6B' : config.textColor }}
            className="text-xl font-mono font-bold"
          >
            ⏱ {countdown}
          </p>
          <p style={{ color: config.textSecondary }} className="text-xs">
            Usage unique
          </p>
        </div>
      </div>

      {/* Barre progression vers prochain grade */}
      {config.nextGrade && (
        <div className="relative mb-4">
          <div
            className="flex justify-between text-xs mb-1"
            style={{ color: config.textSecondary }}
          >
            <span>{config.label}</span>
            <span>
              {config.nextGrade} → {config.nextThreshold?.toLocaleString('fr-FR')} ⭐
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/20">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: config.textColor, opacity: 0.8 }}
            />
          </div>
          <p className="text-xs mt-1 text-right" style={{ color: config.textSecondary }}>
            {progress}% vers {config.nextGrade}
          </p>
        </div>
      )}

      {/* Boutons */}
      <div className="relative flex gap-2">
        <button
          onClick={onRenew}
          style={{ borderColor: config.textColor + '44', color: config.textColor }}
          className="flex-1 py-2 rounded-xl border text-xs font-medium backdrop-blur-sm bg-white/10 active:bg-white/20"
        >
          🔄 Renouveler
        </button>
        <button
          onClick={telechargerCarte}
          style={{ borderColor: config.textColor + '44', color: config.textColor }}
          className="flex-1 py-2 rounded-xl border text-xs font-medium backdrop-blur-sm bg-white/10 active:bg-white/20"
        >
          📥 Télécharger
        </button>
      </div>
    </div>
  )
}
