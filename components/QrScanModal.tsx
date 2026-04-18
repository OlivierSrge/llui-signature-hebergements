'use client'
// components/QrScanModal.tsx — Modal QR scan Stars (client-initiated)
// Si partenaire_id_preselect fourni → saute la caméra, va directement à la saisie montant.

import { useState, useEffect, useRef, useCallback } from 'react'
import { createQrScanRequest } from '@/actions/qr-scan'
import type { QrScanRequest } from '@/actions/qr-scan'

const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://llui-signature-hebergements.vercel.app'

type Step = 'scan' | 'montant' | 'pending' | 'done' | 'error'

interface Props {
  client_uid: string
  client_tel: string
  partenaire_id_preselect?: string | null
  partenaire_nom_preselect?: string | null
  onClose: () => void
}

function formatFr(n: number) { return n.toLocaleString('fr-FR') }

export default function QrScanModal({ client_uid, client_tel, partenaire_id_preselect, partenaire_nom_preselect, onClose }: Props) {
  const [step, setStep] = useState<Step>(partenaire_id_preselect ? 'montant' : 'scan')
  const [qrData, setQrData] = useState(
    partenaire_id_preselect ? `${APP_URL}/promo/${partenaire_id_preselect}` : ''
  )
  const [partenaireName, setPartenaireName] = useState(partenaire_nom_preselect ?? '')
  const [montantStr, setMontantStr] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [request, setRequest] = useState<QrScanRequest | null>(null)
  const [countdown, setCountdown] = useState(120)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scannerRef = useRef<NodeJS.Timeout | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const cdRef = useRef<NodeJS.Timeout | null>(null)

  // Camera
  const stopCamera = useCallback(() => {
    if (scannerRef.current) { clearInterval(scannerRef.current); scannerRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }

      const jsQR = (await import('jsqr')).default
      scannerRef.current = setInterval(() => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || video.readyState < 2) return
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(video, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code?.data) {
          stopCamera()
          const match = code.data.match(/\/promo\/([^/?#]+)/)
          if (!match) { setErrorMsg('QR code non reconnu. Scannez le QR L&Lui d\'un partenaire.'); return }
          setQrData(code.data)
          setStep('montant')
        }
      }, 200)
    } catch {
      setErrorMsg('Impossible d\'accéder à la caméra.')
    }
  }, [stopCamera])

  useEffect(() => {
    if (step === 'scan') startCamera()
    else stopCamera()
    return stopCamera
  }, [step, startCamera, stopCamera])

  // Countdown + polling quand pending
  useEffect(() => {
    if (cdRef.current) clearInterval(cdRef.current)
    if (step !== 'pending' || !request) return
    const update = () => {
      const rem = Math.max(0, Math.floor((new Date(request.expires_at).getTime() - Date.now()) / 1000))
      setCountdown(rem)
      if (rem === 0) { clearInterval(cdRef.current!); setStep('error'); setErrorMsg('Délai expiré. Réessayez.') }
    }
    update()
    cdRef.current = setInterval(update, 1000)
    return () => { if (cdRef.current) clearInterval(cdRef.current) }
  }, [step, request])

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (step !== 'pending') return
    const poll = async () => {
      try {
        const res = await fetch(`/api/stars/qr-scan/poll?client_tel=${encodeURIComponent(client_tel)}`)
        const data = await res.json() as { success: boolean; request?: { status: string; stars_a_crediter: number } }
        if (data.success && data.request) {
          const s = data.request.status
          if (s === 'validated') { clearInterval(pollRef.current!); if (cdRef.current) clearInterval(cdRef.current); setStep('done') }
          if (s === 'rejected') { clearInterval(pollRef.current!); if (cdRef.current) clearInterval(cdRef.current); setStep('error'); setErrorMsg('Le partenaire a refusé la demande.') }
        }
      } catch { /* non bloquant */ }
    }
    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [step, client_tel])

  async function handleSubmit() {
    const montant = parseFloat(montantStr.replace(/\s/g, '').replace(',', '.'))
    if (!(montant > 0)) { setErrorMsg('Montant invalide.'); return }
    setLoading(true)
    setErrorMsg('')
    const result = await createQrScanRequest(client_tel, qrData, montant)
    setLoading(false)
    if (!result.success) { setErrorMsg(result.error); return }
    setRequest(result.request)
    setPartenaireName(result.request.partenaire_nom)
    setCountdown(120)
    setStep('pending')
  }

  function reset() {
    setStep(partenaire_id_preselect ? 'montant' : 'scan')
    setMontantStr('')
    setErrorMsg('')
    setRequest(null)
    setCountdown(120)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F5F0E8]">
          <p className="text-sm font-bold text-[#1A1A1A]">⭐ Gagner des Stars</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-[#F5F0E8] text-[#1A1A1A]/50 flex items-center justify-center text-sm hover:bg-[#E8E0D0] transition-colors">✕</button>
        </div>

        <div className="p-5 space-y-4">

          {/* ── Scan caméra ── */}
          {step === 'scan' && (
            <div className="space-y-3">
              <div className="relative aspect-square bg-black rounded-xl overflow-hidden">
                <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-44 h-44 border-2 border-[#C9A84C] rounded-2xl opacity-80" />
                </div>
              </div>
              {errorMsg && <p className="text-xs text-red-500 text-center">{errorMsg}</p>}
              <p className="text-xs text-center text-[#1A1A1A]/50">Pointez la caméra vers le QR code du partenaire.</p>
            </div>
          )}

          {/* ── Saisie montant ── */}
          {step === 'montant' && (
            <div className="space-y-4">
              {partenaireName && (
                <div className="bg-[#F5F0E8]/60 rounded-xl px-4 py-2 text-center">
                  <p className="text-xs text-[#1A1A1A]/50">Chez</p>
                  <p className="text-sm font-bold text-[#1A1A1A]">{partenaireName}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1A1A1A]/70">Montant réglé (FCFA)</label>
                <input
                  type="number"
                  value={montantStr}
                  onChange={(e) => setMontantStr(e.target.value)}
                  placeholder="Ex : 15 000"
                  min={0}
                  autoFocus
                  className="w-full border border-[#F5F0E8] rounded-xl px-3 py-3 text-center text-xl font-bold focus:outline-none focus:border-[#C9A84C]"
                />
              </div>
              {errorMsg && <p className="text-xs text-red-500 text-center">{errorMsg}</p>}
              <div className="flex gap-2">
                {!partenaire_id_preselect && (
                  <button onClick={() => { setStep('scan'); setErrorMsg('') }}
                    className="flex-1 py-2.5 border border-[#1A1A1A]/10 text-[#1A1A1A]/50 text-sm rounded-xl">
                    ← Rescanner
                  </button>
                )}
                <button onClick={handleSubmit} disabled={loading || !montantStr}
                  className="flex-2 flex-grow py-2.5 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                  {loading ? 'Envoi...' : '⭐ Demander des Stars'}
                </button>
              </div>
            </div>
          )}

          {/* ── En attente ── */}
          {step === 'pending' && request && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-[3px] border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" />
              <div>
                <p className="text-base font-bold text-[#1A1A1A]">En attente de validation</p>
                <p className="text-xs text-[#1A1A1A]/50 mt-1">Chez <strong>{partenaireName}</strong></p>
              </div>
              <div className="bg-[#F5F0E8]/60 rounded-xl p-3 space-y-1.5 text-xs text-left">
                <div className="flex justify-between">
                  <span className="text-[#1A1A1A]/60">Montant</span>
                  <span className="font-semibold">{formatFr(request.montant_fcfa)} FCFA</span>
                </div>
                <div className="flex justify-between border-t border-[#C9A84C]/30 pt-1.5">
                  <span className="text-[#1A1A1A]/70 font-bold">Stars à recevoir</span>
                  <span className="font-bold text-[#C9A84C]">+{formatFr(request.stars_a_crediter)} ⭐</span>
                </div>
              </div>
              <span className={`inline-block text-xs font-mono px-3 py-1 rounded-full ${countdown > 60 ? 'bg-green-100 text-green-700' : countdown > 20 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                Expire dans {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
              </span>
              <p className="text-[10px] text-[#1A1A1A]/40">Montrez cet écran au partenaire pour validation.</p>
            </div>
          )}

          {/* ── Validé ── */}
          {step === 'done' && request && (
            <div className="text-center space-y-4">
              <div className="text-5xl animate-bounce">⭐</div>
              <div>
                <p className="text-2xl font-bold text-[#C9A84C]">+{formatFr(request.stars_a_crediter)} Stars</p>
                <p className="text-sm text-[#1A1A1A]/70 mt-1">crédités sur votre compte !</p>
              </div>
              <button onClick={onClose} className="w-full py-3 bg-[#1A1A1A] text-white text-sm font-semibold rounded-xl">Fermer</button>
            </div>
          )}

          {/* ── Erreur ── */}
          {step === 'error' && (
            <div className="text-center space-y-4">
              <div className="text-4xl">❌</div>
              <div>
                <p className="text-base font-bold text-[#1A1A1A]">Demande refusée</p>
                <p className="text-xs text-[#1A1A1A]/50 mt-1">{errorMsg}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={reset} className="flex-1 py-2.5 bg-[#F5F0E8] text-[#1A1A1A] text-sm font-semibold rounded-xl">Réessayer</button>
                <button onClick={onClose} className="flex-1 py-2.5 border border-[#1A1A1A]/10 text-[#1A1A1A]/50 text-sm rounded-xl">Fermer</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
