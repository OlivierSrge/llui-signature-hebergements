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
  const [confirmingArrival, setConfirmingArrival] = useState(false)
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
    const isPaid = r.payment_status === 'paye'
    const nights = r.check_in && r.check_out
      ? Math.ceil((new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 86400000)
      : '?'

    const handleConfirmArrival = async () => {
      setConfirmingArrival(true)
      const res = await confirmCheckIn(r.confirmation_code, partnerAccessCode)
      setConfirmingArrival(false)
      if (res.success) {
        setScanResult({ status: 'confirmed', reservation: res.reservation!, alreadyConfirmed: true })
        toast.success('Arrivée confirmée !')
      } else {
        toast.error(res.error ?? 'Erreur lors de la confirmation')
      }
    }

    return (
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        {/* Alerte paiement non reçu */}
        {!isPaid && (
          <div className="bg-red-50 border-b border-red-200 p-4 flex flex-col gap-2">
            <p className="font-semibold text-red-700 text-sm">⚠️ Paiement non reçu</p>
            <p className="text-red-600 text-xs">Contacter L&amp;Lui avant d&apos;accueillir le client</p>
            <a
              href={`https://wa.me/237693407964?text=Bonjour%2C%20le%20client%20se%20pr%C3%A9sente%20mais%20le%20paiement%20n%27a%20pas%20%C3%A9t%C3%A9%20re%C3%A7u%20pour%20la%20r%C3%A9servation%20${encodeURIComponent(r.confirmation_code ?? '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors self-start"
            >
              WhatsApp L&amp;Lui
            </a>
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* En-tête avec check */}
          <div className="flex items-center gap-3">
            <CheckCircle2
              size={36}
              className={`flex-shrink-0 ${scanResult.alreadyConfirmed ? 'text-blue-400' : 'text-green-500'}`}
            />
            <h2 className="font-serif text-lg font-semibold text-dark">
              {scanResult.alreadyConfirmed ? 'Arrivée déjà confirmée' : 'Réservation valide'}
            </h2>
          </div>

          {/* Nom client très grand */}
          <p className="text-3xl font-bold text-dark">
            {r.guest_first_name} {r.guest_last_name}
          </p>

          {/* Cards d'infos */}
          <div className="grid grid-cols-1 gap-3">
            {/* Logement */}
            <div className="bg-beige-50 rounded-xl p-3 text-sm">
              <p className="text-dark/50 text-xs mb-0.5">Logement</p>
              <p className="font-semibold text-dark">{r.accommodation?.name ?? r.accommodation_id}</p>
              {r.confirmation_code && (
                <p className="text-xs font-mono text-dark/40 mt-0.5">{r.confirmation_code}</p>
              )}
            </div>

            {/* Dates */}
            <div className="bg-beige-50 rounded-xl p-3 text-sm">
              <p className="text-dark/50 text-xs mb-0.5">Séjour</p>
              <p className="font-semibold text-dark">{r.check_in} → {r.check_out}</p>
              <p className="text-xs text-dark/50 mt-0.5">{nights} nuit{nights !== 1 ? 's' : ''}</p>
            </div>

            {/* Personnes + paiement */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-beige-50 rounded-xl p-3 text-sm">
                <p className="text-dark/50 text-xs mb-0.5">Voyageurs</p>
                <p className="font-semibold text-dark">{r.guests}</p>
              </div>
              <div className="bg-beige-50 rounded-xl p-3 text-sm flex flex-col">
                <p className="text-dark/50 text-xs mb-0.5">Paiement</p>
                {isPaid ? (
                  <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-bold self-start">
                    PAYÉ
                  </span>
                ) : (
                  <span className="inline-block px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-bold self-start">
                    EN ATTENTE
                  </span>
                )}
              </div>
            </div>

            {/* Téléphone */}
            {r.guest_phone && (
              <div className="bg-beige-50 rounded-xl p-3 text-sm">
                <p className="text-dark/50 text-xs mb-0.5">Téléphone client</p>
                <a
                  href={`tel:${r.guest_phone}`}
                  className="font-semibold text-dark underline"
                >
                  {r.guest_phone}
                </a>
              </div>
            )}

            {/* Notes */}
            {r.notes && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm">
                <p className="text-orange-700 text-xs font-semibold mb-0.5">Notes</p>
                <p className="text-orange-800">{r.notes}</p>
              </div>
            )}
          </div>

          {/* Bouton confirmer arrivée */}
          {!r.check_in_confirmed ? (
            <button
              onClick={handleConfirmArrival}
              disabled={confirmingArrival}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {confirmingArrival ? <Loader2 size={16} className="animate-spin" /> : null}
              ✅ Confirmer l&apos;arrivée
            </button>
          ) : (
            <div className="text-center text-sm text-green-700 bg-green-50 rounded-xl p-3">
              Arrivée confirmée le {r.check_in_confirmed_at ? new Date(r.check_in_confirmed_at).toLocaleDateString('fr-FR') : '—'}
            </div>
          )}

          {/* Scanner autre client */}
          <button onClick={reset} className="btn-secondary w-full">
            Scanner un autre client
          </button>
        </div>
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
