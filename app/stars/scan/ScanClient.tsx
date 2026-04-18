'use client'
// app/stars/scan/ScanClient.tsx — Page client : scanner un QR partenaire pour gagner des Stars

import { useState, useEffect, useRef, useCallback } from 'react'
import { createQrScanRequest } from '@/actions/qr-scan'
import type { QrScanRequest } from '@/actions/qr-scan'

type Step = 'scan' | 'montant' | 'pending' | 'done' | 'error'

interface Props {
  clientTel: string  // already normalized E.164
}

const APP_URL = typeof window !== 'undefined' ? window.location.origin : ''

function formatFr(n: number): string {
  return n.toLocaleString('fr-FR')
}

export default function ScanClient({ clientTel }: Props) {
  const [step, setStep] = useState<Step>('scan')
  const [qrData, setQrData] = useState('')
  const [partenaireName, setPartenaireName] = useState('')
  const [montantStr, setMontantStr] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [request, setRequest] = useState<QrScanRequest | null>(null)
  const [countdown, setCountdown] = useState(120)
  const [pollStatus, setPollStatus] = useState<'pending' | 'validated' | 'rejected' | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scannerRef = useRef<NodeJS.Timeout | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const cdRef = useRef<NodeJS.Timeout | null>(null)

  // ── Camera ────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (scannerRef.current) { clearInterval(scannerRef.current); scannerRef.current = null }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

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
          // Validate QR format: must be ${origin}/promo/${uid}
          const match = code.data.match(/\/promo\/([^/?#]+)/)
          if (!match) {
            setErrorMsg('QR code non reconnu. Scannez le QR code L&Lui d\'un partenaire.')
            setStep('scan')
            return
          }
          setQrData(code.data)
          setStep('montant')
        }
      }, 200)
    } catch {
      setErrorMsg('Impossible d\'accéder à la caméra. Vérifiez les autorisations.')
    }
  }, [stopCamera])

  useEffect(() => {
    if (step === 'scan') {
      startCamera()
    } else {
      stopCamera()
    }
    return stopCamera
  }, [step, startCamera, stopCamera])

  // ── Countdown on pending ──────────────────────────────────────
  useEffect(() => {
    if (cdRef.current) clearInterval(cdRef.current)
    if (step !== 'pending' || !request) return

    const update = () => {
      const remaining = Math.max(0, Math.floor((new Date(request.expires_at).getTime() - Date.now()) / 1000))
      setCountdown(remaining)
      if (remaining === 0) {
        clearInterval(cdRef.current!)
        setPollStatus(null)
        setStep('error')
        setErrorMsg('Délai expiré (2 min). Rescannez le QR code et réessayez.')
      }
    }
    update()
    cdRef.current = setInterval(update, 1000)
    return () => { if (cdRef.current) clearInterval(cdRef.current) }
  }, [step, request])

  // ── Polling status ────────────────────────────────────────────
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (step !== 'pending' || !clientTel) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/stars/qr-scan/poll?client_tel=${encodeURIComponent(clientTel)}`)
        const data = await res.json() as { success: boolean; request?: { status: string; stars_a_crediter: number } }
        if (data.success && data.request) {
          const status = data.request.status as 'pending' | 'validated' | 'rejected'
          setPollStatus(status)
          if (status === 'validated' || status === 'rejected') {
            clearInterval(pollRef.current!)
            if (cdRef.current) clearInterval(cdRef.current)
            setStep(status === 'validated' ? 'done' : 'error')
            if (status === 'rejected') setErrorMsg('Le partenaire a refusé votre demande.')
          }
        }
      } catch { /* non bloquant */ }
    }

    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [step, clientTel])

  // ── Submit request ────────────────────────────────────────────
  async function handleSubmit() {
    const montant = parseFloat(montantStr.replace(/\s/g, '').replace(',', '.'))
    if (!(montant > 0)) { setErrorMsg('Montant invalide.'); return }

    setLoading(true)
    setErrorMsg('')
    const result = await createQrScanRequest(clientTel, qrData, montant)
    setLoading(false)

    if (!result.success) {
      setErrorMsg(result.error)
      return
    }

    setRequest(result.request)
    setPartenaireName(result.request.partenaire_nom)
    setCountdown(120)
    setPollStatus('pending')
    setStep('pending')
  }

  function reset() {
    setStep('scan')
    setQrData('')
    setPartenaireName('')
    setMontantStr('')
    setErrorMsg('')
    setRequest(null)
    setCountdown(120)
    setPollStatus(null)
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-4">

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-serif font-bold text-[#1A1A1A]">⭐ L&amp;Lui Stars</h1>
          <p className="text-xs text-[#1A1A1A]/50">Scannez le QR code de l&apos;établissement pour gagner vos Stars</p>
        </div>

        {/* ── Étape 1 : Scanner ─────────────────────────────── */}
        {step === 'scan' && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm space-y-4">
            <div className="relative aspect-square bg-black">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              {/* Scanner overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-[#C9A84C] rounded-2xl opacity-80" />
              </div>
            </div>
            {errorMsg && (
              <div className="px-4 pb-4">
                <p className="text-xs text-red-500 text-center">{errorMsg}</p>
                <button
                  onClick={() => { setErrorMsg(''); startCamera() }}
                  className="w-full mt-2 py-2.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-xl"
                >
                  Réessayer
                </button>
              </div>
            )}
            {!errorMsg && (
              <p className="text-xs text-center text-[#1A1A1A]/50 pb-4">
                Pointez la caméra vers le QR code affiché chez le partenaire.
              </p>
            )}
          </div>
        )}

        {/* ── Étape 2 : Saisie montant ─────────────────────── */}
        {step === 'montant' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <div className="text-center">
              <p className="text-2xl">🏪</p>
              <p className="text-sm font-semibold text-[#1A1A1A] mt-1">QR code scanné !</p>
              <p className="text-xs text-[#1A1A1A]/50 mt-0.5">Saisissez le montant que vous avez réglé.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#1A1A1A]/70">Montant réglé (FCFA)</label>
              <input
                type="number"
                value={montantStr}
                onChange={(e) => setMontantStr(e.target.value)}
                placeholder="Ex : 15000"
                min={0}
                autoFocus
                className="w-full border border-[#F5F0E8] rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#C9A84C] text-center text-lg font-bold"
              />
            </div>

            {errorMsg && <p className="text-xs text-red-500 text-center">{errorMsg}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => { setStep('scan'); setErrorMsg('') }}
                className="flex-1 py-2.5 border border-[#1A1A1A]/10 text-[#1A1A1A]/50 text-sm rounded-xl"
              >
                ← Rescanner
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !montantStr}
                className="flex-2 flex-grow py-2.5 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl disabled:opacity-50"
              >
                {loading ? 'Envoi...' : '⭐ Envoyer'}
              </button>
            </div>
          </div>
        )}

        {/* ── Étape 3 : En attente de validation ───────────── */}
        {step === 'pending' && request && (
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 text-center">
            <div className="w-14 h-14 border-3 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto border-[3px]" />

            <div className="space-y-1">
              <p className="text-base font-bold text-[#1A1A1A]">Validation en cours...</p>
              <p className="text-xs text-[#1A1A1A]/50">Chez <strong>{partenaireName || 'le partenaire'}</strong></p>
            </div>

            <div className="bg-[#F5F0E8]/60 rounded-xl p-3 space-y-1.5 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-[#1A1A1A]/60">Montant</span>
                <span className="font-semibold">{formatFr(request.montant_fcfa)} FCFA</span>
              </div>
              {request.remise_appliquee > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#1A1A1A]/60">Remise {request.remise_pct}%</span>
                  <span className="font-medium text-green-700">−{formatFr(request.remise_appliquee)} FCFA</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#C9A84C]/30 pt-1.5">
                <span className="text-[#1A1A1A]/70 font-bold">Stars à recevoir</span>
                <span className="font-bold text-[#C9A84C]">+{formatFr(request.stars_a_crediter)} ⭐</span>
              </div>
            </div>

            {/* Countdown */}
            <div>
              <span className={`text-xs font-mono px-3 py-1 rounded-full ${
                countdown > 60 ? 'bg-green-100 text-green-700' :
                countdown > 20 ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                Expire dans {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
              </span>
            </div>

            <p className="text-[10px] text-[#1A1A1A]/40">
              Montrez cet écran au partenaire pour qu&apos;il valide votre demande.
            </p>
          </div>
        )}

        {/* ── Étape 4 : Validé ──────────────────────────────── */}
        {step === 'done' && request && (
          <div className="bg-white rounded-2xl p-8 shadow-sm space-y-4 text-center">
            <div className="text-5xl animate-bounce">⭐</div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-[#C9A84C]">+{formatFr(request.stars_a_crediter)} Stars</p>
              <p className="text-sm font-semibold text-[#1A1A1A]">crédités sur votre compte !</p>
              <p className="text-xs text-[#1A1A1A]/50 mt-2">
                Chez <strong>{partenaireName}</strong> — {formatFr(request.montant_net)} FCFA réglés
              </p>
            </div>
            <button
              onClick={reset}
              className="w-full py-3 bg-[#1A1A1A] text-white text-sm font-semibold rounded-xl"
            >
              Scanner un autre QR
            </button>
          </div>
        )}

        {/* ── Erreur ────────────────────────────────────────── */}
        {step === 'error' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm space-y-4 text-center">
            <div className="text-4xl">❌</div>
            <div className="space-y-1">
              <p className="text-base font-bold text-[#1A1A1A]">Demande refusée</p>
              <p className="text-xs text-[#1A1A1A]/50">{errorMsg}</p>
            </div>
            <button
              onClick={reset}
              className="w-full py-3 bg-[#1A1A1A] text-white text-sm font-semibold rounded-xl"
            >
              Réessayer
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
