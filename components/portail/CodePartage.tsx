'use client'
// components/portail/CodePartage.tsx — QR Code + envoi groupé invités + stats partage

import { useState, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'

interface Props {
  code: string
  uid: string
}

interface Invite {
  id: string
  nom: string
  telephone: string
  prenom?: string
  lien_envoye?: boolean
  invitation_envoyee?: boolean
  converted?: boolean
}

const BOUTIQUE_BASE = 'https://l-et-lui-signature.com'

export default function CodePartage({ code, uid }: Props) {
  const [showQR, setShowQR] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [downloaded, setDownloaded] = useState(false)

  const url = `${BOUTIQUE_BASE}?code=${encodeURIComponent(code)}`

  // Génère le QR à l'ouverture de la modale
  useEffect(() => {
    if (!showQR) return
    QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      color: { dark: '#1A1A1A', light: '#FFFFFF' },
    }).then(setQrDataUrl).catch(console.error)
  }, [showQR, url])

  function downloadQR() {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.download = `qr-code-${code}.png`
    link.href = qrDataUrl
    link.click()
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2000)
  }

  if (!code) return null

  return (
    <>
      {/* Bouton QR Code */}
      <button
        onClick={() => setShowQR(true)}
        className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-[#F5F0E8]/10 border border-[#F5F0E8]/20 text-[#F5F0E8] text-sm font-semibold rounded-xl hover:bg-[#F5F0E8]/20 transition-colors"
      >
        <span>📷</span>
        <span>QR Code</span>
      </button>

      {/* Modale QR Code */}
      {showQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowQR(false) }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1A1A1A] text-base">Mon QR Code</h3>
              <button
                onClick={() => setShowQR(false)}
                className="text-[#888] hover:text-[#1A1A1A] text-xl font-bold"
              >
                ×
              </button>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${code}`}
                  width={256}
                  height={256}
                  className="rounded-xl border border-[#F5F0E8]"
                  style={{ background: '#FFFFFF' }}
                />
              ) : (
                <div className="w-64 h-64 bg-[#F5F0E8] rounded-xl flex items-center justify-center">
                  <span className="text-[#888] text-sm">Génération…</span>
                </div>
              )}
            </div>

            {/* Code affiché sous le QR */}
            <p className="text-center text-[#C9A84C] font-bold text-lg tracking-widest mb-2">{code}</p>

            {/* Instruction */}
            <p className="text-center text-xs text-[#888] mb-4 leading-relaxed">
              Imprimez ce QR code sur vos faire-part ou décorations de table
            </p>

            {/* Bouton télécharger */}
            <button
              onClick={downloadQR}
              disabled={!qrDataUrl}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: '#C9A84C' }}
            >
              {downloaded ? '✓ Téléchargé !' : '⬇ Télécharger en PNG'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
