'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { Camera, ScanLine, CheckCircle2, XCircle, Loader2, KeyRound } from 'lucide-react'
import { confirmCheckIn } from '@/actions/partner-reservations'
import jsQR from 'jsqr'

interface Props {
  partnerAccessCode: string
}

type ScanResult =
  | { status: 'idle' }
  | { status: 'scanning' }
  | { status: 'confirming' }
  | { status: 'confirmed'; reservation: Record<string, unknown>; alreadyConfirmed?: boolean }
  | { status: 'error'; message: string }

export default function QrScanner({ partnerAccessCode }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scanResult, setScanResult] = useState<ScanResult>({ status: 'idle' })
  const [manualCode, setManualCode] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const processingRef = useRef(false)

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const processCode = useCallback(async (code: string) => {
    if (processingRef.current) return
    processingRef.current = true
    stopCamera()
    setScanResult({ status: 'confirming' })

    // Extraire le code de confirmation depuis une URL ou valeur brute
    let confirmCode = code
    try {
      const url = new URL(code)
      const param = url.searchParams.get('code')
      if (param) confirmCode = param
    } catch { /* pas une URL */ }

    const res = await confirmCheckIn(confirmCode.trim().toUpperCase(), partnerAccessCode)
    processingRef.current = false

    if (!res.success) {
      setScanResult({ status: 'error', message: res.error ?? 'Erreur inconnue' })
      return
    }
    const already = (res.reservation as any)?.alreadyConfirmed === true
    setScanResult({ status: 'confirmed', reservation: res.reservation!, alreadyConfirmed: already })
    if (!already) toast.success('Arrivée confirmée !')
  }, [partnerAccessCode, stopCamera])

  /** Boucle de scan : dessine la frame vidéo sur canvas et passe les pixels à jsQR */
  const scanFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2 || processingRef.current) {
      rafRef.current = requestAnimationFrame(scanFrame)
      return
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) { rafRef.current = requestAnimationFrame(scanFrame); return }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })

    if (code?.data) {
      processCode(code.data)
      return
    }

    rafRef.current = requestAnimationFrame(scanFrame)
  }, [processCode])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    setScanResult({ status: 'scanning' })

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      rafRef.current = requestAnimationFrame(scanFrame)
    } catch {
      setCameraError("Impossible d'accéder à la caméra. Vérifiez les permissions.")
      setScanResult({ status: 'idle' })
    }
  }, [scanFrame])

  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    await processCode(manualCode.trim().toUpperCase())
  }

  const reset = () => {
    stopCamera()
    processingRef.current = false
    setManualCode('')
    setScanResult({ status: 'idle' })
  }

  // ─── Confirmed screen ─────────────────────────────────────────────────────
  if (scanResult.status === 'confirmed') {
    const r = scanResult.reservation as any
    return (
      <div className="bg-white rounded-2xl border border-beige-200 p-8 text-center space-y-4">
        <CheckCircle2
          size={56}
          className={`mx-auto ${scanResult.alreadyConfirmed ? 'text-blue-400' : 'text-green-500'}`}
        />
        <div>
          <h2 className="font-serif text-xl font-semibold text-dark">
            {scanResult.alreadyConfirmed ? 'Arrivée déjà confirmée' : 'Arrivée confirmée !'}
          </h2>
          <p className="text-dark/50 text-sm mt-1">
            {r.guest_first_name} {r.guest_last_name}
          </p>
        </div>

        <div className="bg-beige-50 rounded-xl p-4 text-sm text-left space-y-2">
          <div className="flex justify-between">
            <span className="text-dark/50">Code</span>
            <span className="font-mono font-bold text-dark">{r.confirmation_code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dark/50">Hébergement</span>
            <span className="text-dark">{r.accommodation?.name ?? r.accommodation_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dark/50">Arrivée</span>
            <span className="text-dark">{r.check_in}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dark/50">Départ</span>
            <span className="text-dark">{r.check_out}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dark/50">Voyageurs</span>
            <span className="text-dark">{r.guests}</span>
          </div>
        </div>

        <button onClick={reset} className="btn-secondary w-full">
          Scanner un autre client
        </button>
      </div>
    )
  }

  // ─── Error screen ─────────────────────────────────────────────────────────
  if (scanResult.status === 'error') {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-4">
        <XCircle size={48} className="text-red-400 mx-auto" />
        <div>
          <h2 className="font-semibold text-dark">Code introuvable</h2>
          <p className="text-dark/50 text-sm mt-1">{scanResult.message}</p>
        </div>
        <button onClick={reset} className="btn-secondary w-full">Réessayer</button>
      </div>
    )
  }

  // ─── Confirming ──────────────────────────────────────────────────────────
  if (scanResult.status === 'confirming') {
    return (
      <div className="bg-white rounded-2xl border border-beige-200 p-12 text-center">
        <Loader2 size={40} className="animate-spin text-gold-500 mx-auto mb-3" />
        <p className="text-dark/50">Vérification en cours...</p>
      </div>
    )
  }

  // ─── Main scanner UI ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Camera scanner */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        {scanResult.status === 'scanning' ? (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full aspect-square object-cover"
              playsInline
              muted
            />
            {/* Canvas caché utilisé par jsQR pour l'analyse des frames */}
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-52 border-2 border-white/70 rounded-2xl shadow-lg flex items-center justify-center">
                <ScanLine size={40} className="text-white/80" strokeWidth={1.5} />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-4 flex justify-center">
              <button
                onClick={reset}
                className="px-5 py-2 bg-white/20 backdrop-blur text-white rounded-xl text-sm border border-white/30"
              >
                Arrêter
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center space-y-4">
            <Camera size={48} className="text-dark/20 mx-auto" />
            <div>
              <p className="font-semibold text-dark">Scanner le QR code client</p>
              <p className="text-dark/40 text-sm mt-1">
                Fonctionne sur tous les navigateurs (Chrome, Firefox, Safari).
              </p>
            </div>
            {cameraError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-xl p-3">{cameraError}</p>
            )}
            <button onClick={startCamera} className="btn-primary w-full flex items-center justify-center gap-2">
              <Camera size={16} /> Ouvrir la caméra
            </button>
          </div>
        )}
      </div>

      {/* Manual code entry */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
        <h2 className="font-semibold text-dark flex items-center gap-2 text-sm">
          <KeyRound size={15} className="text-gold-500" /> Saisie manuelle du code
        </h2>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder="LLS-2025-AB3CD"
            className="input-field flex-1 font-mono uppercase tracking-widest text-sm"
            maxLength={15}
          />
          <button
            type="submit"
            disabled={!manualCode.trim()}
            className="px-4 py-2.5 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 transition-colors disabled:opacity-50"
          >
            Valider
          </button>
        </form>
      </div>
    </div>
  )
}
