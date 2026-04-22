'use client'
// components/PassVipCard.tsx — Carte Pass VIP anonyme avec QR timestamp auto-renouvelé

import { useState, useEffect, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { GRADE_CONFIGS } from '@/types/stars-grade'
import type { PassVipAnonyme } from '@/types/pass-vip'

type Fraicheur = 'vert' | 'orange' | 'rouge'

const FRAICHEUR_CONFIG: Record<Fraicheur, { color: string; label: string }> = {
  vert:   { color: '#22C55E', label: '✅ QR valide' },
  orange: { color: '#F59E0B', label: '⚠️ Bientôt expiré' },
  rouge:  { color: '#EF4444', label: '🔄 Renouvellement...' },
}

export default function PassVipCard({ pass }: { pass: PassVipAnonyme }) {
  const [generatedAt, setGeneratedAt] = useState(() => new Date())
  const [countdown, setCountdown] = useState('5:00')
  const [fraicheur, setFraicheur] = useState<Fraicheur>('vert')

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - generatedAt.getTime()) / 1000)
      const remaining = Math.max(0, 300 - elapsed)
      const min = Math.floor(remaining / 60)
      const sec = remaining % 60
      setCountdown(`${min}:${sec.toString().padStart(2, '0')}`)

      if (remaining > 180) setFraicheur('vert')
      else if (remaining > 30) setFraicheur('orange')
      else setFraicheur('rouge')

      if (remaining === 0) setGeneratedAt(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [generatedAt])

  const grade = pass.grade_pass
  const config = GRADE_CONFIGS[grade]

  const joursRestants = Math.max(
    0,
    Math.ceil((new Date(pass.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  )

  const qrValue = useMemo(
    () =>
      JSON.stringify({
        grade: pass.grade_pass,
        nom: pass.nom_usage,
        generated_at: generatedAt.toISOString(),
        expires_at: new Date(generatedAt.getTime() + 5 * 60 * 1000).toISOString(),
        pass_ref: pass.id.slice(0, 8).toUpperCase(),
      }),
    [generatedAt, pass.grade_pass, pass.nom_usage, pass.id],
  )

  const fc = FRAICHEUR_CONFIG[fraicheur]

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8] p-4">
      <div
        id="pass-card"
        style={{ background: config.bgGradient, borderColor: config.borderColor }}
        className={`relative rounded-3xl border-2 p-6 shadow-2xl w-full max-w-sm overflow-hidden ${config.specialEffect}`}
      >
        {/* Décor arrière-plan */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 text-8xl opacity-10 select-none">
            {config.emoji}
          </div>
        </div>

        {/* Header — Logo + Grade */}
        <div className="relative flex justify-between items-start mb-5">
          <p
            style={{ color: config.textSecondary }}
            className="text-xs font-medium tracking-widest uppercase"
          >
            L&amp;Lui ✦ Signature
          </p>
          <div
            style={{
              backgroundColor: config.color + '33',
              borderColor: config.color,
              color: config.textColor,
            }}
            className="flex items-center gap-1 border rounded-full px-3 py-1"
          >
            <span>{config.emoji}</span>
            <span className="text-xs font-bold">{grade}</span>
          </div>
        </div>

        {/* Nom de famille */}
        <p
          style={{ color: config.textColor }}
          className="relative text-3xl font-bold tracking-widest uppercase mb-6"
        >
          {pass.nom_usage}
        </p>

        {/* QR Code */}
        <div className="relative flex justify-center mb-3">
          <div className="bg-white rounded-2xl p-3 shadow-xl">
            <QRCodeSVG
              value={qrValue}
              size={160}
              bgColor="#FFFFFF"
              fgColor={config.qrFgColor}
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Timestamp visible — élément clé de validation visuelle */}
        <div
          className="relative rounded-xl p-3 mb-4 text-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
        >
          {/* Indicateur fraîcheur */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: fc.color }}
            />
            <span className="text-xs font-medium" style={{ color: fc.color }}>
              {fc.label}
            </span>
          </div>

          {/* Date et heure de génération */}
          <p
            style={{ color: config.textColor }}
            className="text-sm font-mono font-bold"
          >
            🕐{' '}
            {generatedAt.toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}{' '}
            à{' '}
            {generatedAt.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>

          {/* Countdown */}
          <p style={{ color: config.textSecondary }} className="text-xs mt-1">
            Expire dans{' '}
            <span className="font-mono font-bold" style={{ color: fc.color }}>
              {countdown}
            </span>
          </p>
        </div>

        {/* Remise + jours restants */}
        <div className="relative flex justify-between items-center mb-4">
          <div>
            <p style={{ color: config.textColor }} className="text-xl font-bold">
              -{config.remise_min}% garanti
            </p>
            <p style={{ color: config.textSecondary }} className="text-xs">
              Remise chez nos partenaires
            </p>
          </div>
          <div className="text-right">
            <p style={{ color: config.textColor }} className="text-xl font-bold">
              {joursRestants}j
            </p>
            <p style={{ color: config.textSecondary }} className="text-xs">
              restants
            </p>
          </div>
        </div>

        {/* Bouton renouveler manuel */}
        <button
          onClick={() => setGeneratedAt(new Date())}
          style={{ borderColor: config.textColor + '44', color: config.textColor }}
          className="relative w-full py-3 rounded-xl border text-sm font-medium backdrop-blur-sm bg-white/10 active:bg-white/20"
        >
          🔄 Générer un nouveau QR
        </button>

        {/* Référence discrète */}
        <p style={{ color: config.textSecondary }} className="text-center text-xs mt-3 opacity-50">
          Réf. {pass.id.slice(0, 8).toUpperCase()}
        </p>
      </div>
    </div>
  )
}
