'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QrCode, Loader2, XCircle, TrendingUp } from 'lucide-react'

export default function CommercialScanClient() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scannerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState('')

  const stopCamera = useCallback(() => {
    if (scannerRef.current) { clearInterval(scannerRef.current); scannerRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null }
  }, [])

  const startCamera = useCallback(async () => {
    setError('')
    setIsScanning(true)
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
        if (!video || !canvas || video.readyState !== 4) return
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(video, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code?.data) {
          stopCamera()
          try {
            const parsed = JSON.parse(code.data)
            if (parsed.type !== 'commercial' || !parsed.commercial_id || !parsed.partenaire_id) {
              setError("QR invalide — ce n'est pas un QR commercial L&Lui.")
              setIsScanning(false)
              return
            }
            sessionStorage.setItem('commercial_id', parsed.commercial_id)
            sessionStorage.setItem('commercial_partenaire_id', parsed.partenaire_id)
            router.push('/commercial/pin')
          } catch {
            setError('QR non reconnu. Reessayez.')
            setIsScanning(false)
          }
        }
      }, 200)
    } catch {
      setError("Impossible d'acceder a la camera.")
      setIsScanning(false)
    }
  }, [router, stopCamera])

  useEffect(() => () => stopCamera(), [stopCamera])

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col items-center justify-center px-6 gap-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-serif text-2xl font-semibold">
          L<span className="text-gold-400">&</span>Lui
        </h1>
        <p className="text-white/50 text-sm mt-1">Espace Commercial</p>
      </div>

      {!isScanning ? (
        <>
          <div className="w-24 h-24 rounded-full bg-gold-400/10 border-2 border-gold-400/30 flex items-center justify-center">
            <TrendingUp size={44} className="text-gold-400" />
          </div>

          <div className="text-center">
            <p className="text-white font-semibold text-lg">Scannez votre QR commercial</p>
            <p className="text-white/40 text-sm mt-1">
              Le QR vous a ete fourni par votre partenaire L&Lui
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3 w-full max-w-xs">
              <XCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={startCamera}
            className="w-full max-w-xs py-4 rounded-2xl bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-base transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <QrCode size={20} /> Scanner mon QR
          </button>

          <p className="text-white/20 text-xs text-center max-w-xs">
            Chaque reservation via ce QR vous rapporte 50% de la commission
          </p>
        </>
      ) : (
        <div className="w-full max-w-sm flex flex-col gap-4">
          <p className="text-center text-white/60 text-sm">Pointez votre QR commercial</p>
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-gold-400 rounded-2xl opacity-70" />
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); setIsScanning(false) }}
            className="text-white/40 text-sm text-center underline"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}
