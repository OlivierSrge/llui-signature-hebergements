'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { Camera, ScanLine, CheckCircle2, XCircle, Loader2, KeyRound } from 'lucide-react'
import { confirmCheckIn } from '@/actions/partner-reservations'

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
  const [scanResult, setScanResult] = useState<ScanResult>({ status: 'idle' })
  const [manualCode, setManualCode] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const processCode = useCallback(async (code: string) => {
    stopCamera()
    setScanResult({ status: 'confirming' })

    const res = await confirmCheckIn(code, partnerAccessCode)
    if (!res.success) {
      setScanResult({ status: 'error', message: res.error ?? 'Erreur inconnue' })
      return
    }
    const already = (res.reservation as any)?.alreadyConfirmed === true
    setScanResult({ status: 'confirmed', reservation: res.reservation!, alreadyConfirmed: already })
    if (!already) toast.success('Arrivée confirmée !')
  }, [partnerAccessCode, stopCamera])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    setScanResult({ status: 'scanning' })

    // Check BarcodeDetector support
    if (!('BarcodeDetector' in window)) {
      setCameraError('Votre navigateur ne supporte pas le scanner QR. Utilisez la saisie manuelle.')
      setScanResult({ status: 'idle' })
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      // @ts-ignore — BarcodeDetector not yet in TS lib
      const detector = new BarcodeDetector({ formats: ['qr_code'] })

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) {
            const raw = barcodes[0].rawValue as string
            // Extract confirmation code from URL or raw value
            let code = raw
            try {
              const url = new URL(raw)
              const param = url.searchParams.get('code')
              if (param) code = param
            } catch { /* not a URL */ }
            await processCode(code.trim().toUpperCase())
          }
        } catch { /* detection error, continue */ }
      }, 500)
    } catch (err: any) {
      setCameraError("Impossible d'accéder à la caméra. Vérifiez les permissions.")
      setScanResult({ status: 'idle' })
    }
  }, [processCode])

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
          className={scanResult.alreadyConfirmed ? 'text-blue-400 mx-auto' : 'text-green-500 mx-auto'}
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
            <video ref={videoRef} className="w-full aspect-square object-cover" playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <ScanLine size={160} className="text-white/80 drop-shadow-lg" strokeWidth={1} />
            </div>
            <button
              onClick={reset}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 text-white rounded-xl text-sm"
            >
              Arrêter
            </button>
          </div>
        ) : (
          <div className="p-8 text-center space-y-4">
            <Camera size={48} className="text-dark/20 mx-auto" />
            <div>
              <p className="font-semibold text-dark">Scanner le QR code</p>
              <p className="text-dark/40 text-sm mt-1">Présentez le QR code du client devant la caméra.</p>
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
            placeholder="ex: LLS-2025-AB3CD"
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
