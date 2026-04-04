'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, QrCode, CheckCircle2, XCircle, Loader2, Wallet, ArrowRight } from 'lucide-react'
import { creerSessionResidence, scannerQrClient, demanderRetrait } from '@/actions/prescripteurs'

type Step = 'accueil' | 'scan_residence' | 'scan_client' | 'success' | 'error' | 'retrait'

interface SessionInfo {
  uid: string
  nom: string
  type: string
}

interface ScanResult {
  commission_fcfa?: number
  nouveau_solde?: number
  client_nom?: string
  hebergement_nom?: string
  error?: string
}

export default function AccueilClient() {
  const router = useRouter()
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [solde, setSolde] = useState(0)
  const [step, setStep] = useState<Step>('accueil')
  const [residenceSessionId, setResidenceSessionId] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scannerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [retraitMontant, setRetraitMontant] = useState('')
  const [retraitMethode, setRetraitMethode] = useState('mtn_momo')
  const [retraitNumero, setRetraitNumero] = useState('')
  const [retraitError, setRetraitError] = useState('')
  const [retraitSuccess, setRetraitSuccess] = useState(false)

  useEffect(() => {
    const uid = sessionStorage.getItem('prescripteur_uid')
    const nom = sessionStorage.getItem('prescripteur_nom')
    const type = sessionStorage.getItem('prescripteur_type')
    if (!uid || !nom) {
      router.replace('/prescripteur')
      return
    }
    setSession({ uid, nom, type: type ?? '' })
    // Load solde from sessionStorage if stored
    const storedSolde = sessionStorage.getItem('prescripteur_solde')
    if (storedSolde) setSolde(parseInt(storedSolde, 10))
  }, [router])

  const handleLogout = () => {
    sessionStorage.clear()
    router.replace('/prescripteur')
  }

  // ── QR Camera ──────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (scannerRef.current) {
      clearInterval(scannerRef.current)
      scannerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const startCamera = useCallback(async (onScan: (data: string) => void) => {
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
          onScan(code.data)
        }
      }, 200)
    } catch (err) {
      console.error('[Camera]', err)
    }
  }, [stopCamera])

  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  // ── Step handlers ──────────────────────────────────────────────

  const handleScanResidence = () => {
    setStep('scan_residence')
    setTimeout(() => {
      startCamera(async (data) => {
        setIsProcessing(true)
        try {
          const parsed = JSON.parse(data)
          if (parsed.type !== 'residence' || !parsed.residence_id) {
            setScanResult({ error: 'QR invalide — ce n\'est pas un QR résidence L&Lui.' })
            setStep('error')
            return
          }
          const res = await creerSessionResidence(session!.uid, parsed.residence_id)
          if (!res.success) {
            setScanResult({ error: res.error ?? 'Erreur lors de la création de session' })
            setStep('error')
            return
          }
          setResidenceSessionId(res.session_id!)
          setStep('scan_client')
          setTimeout(() => {
            startCamera(handleScanClient)
          }, 300)
        } catch {
          setScanResult({ error: 'QR non reconnu. Réessayez.' })
          setStep('error')
        } finally {
          setIsProcessing(false)
        }
      })
    }, 300)
  }

  const handleScanClient = useCallback(async (data: string) => {
    setIsProcessing(true)
    try {
      const parsed = JSON.parse(data)
      if (parsed.type !== 'reservation' || !parsed.reservation_id) {
        setScanResult({ error: 'QR invalide — ce n\'est pas un QR client L&Lui.' })
        setStep('error')
        return
      }
      const res = await scannerQrClient(session!.uid, parsed.reservation_id, residenceSessionId)
      if (!res.success) {
        setScanResult({ error: res.error ?? 'Erreur lors du scan' })
        setStep('error')
        return
      }
      setScanResult(res)
      if (res.nouveau_solde !== undefined) {
        setSolde(res.nouveau_solde)
        sessionStorage.setItem('prescripteur_solde', String(res.nouveau_solde))
      }
      setStep('success')
    } catch {
      setScanResult({ error: 'QR non reconnu. Réessayez.' })
      setStep('error')
    } finally {
      setIsProcessing(false)
    }
  }, [session, residenceSessionId])

  const handleDemanderRetrait = async () => {
    setRetraitError('')
    const montant = parseInt(retraitMontant, 10)
    if (!montant || montant < 1000) { setRetraitError('Montant minimum : 1 000 FCFA'); return }
    if (montant > solde) { setRetraitError('Montant supérieur à votre solde'); return }
    if (!retraitNumero.trim()) { setRetraitError('Numéro mobile money requis'); return }

    setIsProcessing(true)
    try {
      const res = await demanderRetrait({
        prescripteur_id: session!.uid,
        montant_fcfa: montant,
        methode: retraitMethode,
        numero_mobile_money: retraitNumero.trim(),
      })
      if (!res.success) {
        setRetraitError(res.error ?? 'Erreur')
      } else {
        setRetraitSuccess(true)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <Loader2 className="text-gold-400 animate-spin" size={32} />
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div>
          <h1 className="font-serif text-lg font-semibold">
            L<span className="text-gold-400">&</span>Lui
          </h1>
          <p className="text-white/50 text-xs">{session.nom}</p>
        </div>
        <button onClick={handleLogout} className="text-white/40 hover:text-white/70 transition-colors p-2">
          <LogOut size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-5 py-6 gap-5">

        {/* Solde card */}
        <div className="rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-600/10 border border-gold-400/30 p-5">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Votre solde</p>
          <p className="font-serif text-4xl font-semibold text-gold-300">
            {solde.toLocaleString('fr-FR')} <span className="text-2xl text-gold-400/70">FCFA</span>
          </p>
          {solde > 0 && step === 'accueil' && (
            <button
              onClick={() => { setRetraitSuccess(false); setRetraitError(''); setStep('retrait') }}
              className="mt-3 flex items-center gap-2 text-sm text-gold-400 hover:text-gold-300 transition-colors"
            >
              <Wallet size={14} /> Demander un retrait
            </button>
          )}
        </div>

        {/* Steps — Accueil */}
        {step === 'accueil' && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-white/60 text-sm text-center">
              Pour enregistrer un client, scannez d'abord le QR de la résidence, puis le QR du client.
            </p>
            <button
              onClick={handleScanResidence}
              className="w-full py-5 rounded-2xl bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-base flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              <QrCode size={22} /> Scanner une résidence
            </button>
            <button
              onClick={() => router.push('/prescripteur/disponibilites')}
              className="w-full py-4 rounded-2xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 font-medium text-sm flex items-center justify-center gap-2 transition-all"
            >
              <ArrowRight size={16} /> Voir les disponibilités
            </button>
          </div>
        )}

        {/* Scanner camera */}
        {(step === 'scan_residence' || step === 'scan_client') && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-center text-white/60 text-sm">
              {step === 'scan_residence' ? '📍 Scannez le QR code de la résidence' : '👤 Scannez le QR code du client'}
            </p>
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-sm mx-auto w-full">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-gold-400 rounded-2xl opacity-70" />
              </div>
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 size={32} className="text-gold-400 animate-spin" />
                </div>
              )}
            </div>
            <button
              onClick={() => { stopCamera(); setStep('accueil') }}
              className="text-white/40 hover:text-white/70 text-sm text-center underline"
            >
              Annuler
            </button>
          </div>
        )}

        {/* Success */}
        {step === 'success' && scanResult && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-green-400" />
            </div>
            <div>
              <p className="text-xl font-semibold text-white">Client enregistré !</p>
              <p className="text-white/50 text-sm mt-1">{scanResult.client_nom}</p>
              <p className="text-white/40 text-xs">{scanResult.hebergement_nom}</p>
            </div>
            <div className="rounded-2xl bg-green-500/10 border border-green-400/30 p-5 w-full max-w-xs">
              <p className="text-green-300 text-sm">Commission créditée</p>
              <p className="font-serif text-3xl font-semibold text-green-300 mt-1">
                +{scanResult.commission_fcfa?.toLocaleString('fr-FR')} FCFA
              </p>
              <p className="text-white/40 text-xs mt-2">
                Nouveau solde : {scanResult.nouveau_solde?.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <button
              onClick={() => { setScanResult(null); setResidenceSessionId(''); setStep('accueil') }}
              className="w-full max-w-xs py-4 rounded-2xl bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-sm transition-all active:scale-95"
            >
              Enregistrer un autre client
            </button>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle size={40} className="text-red-400" />
            </div>
            <div>
              <p className="text-xl font-semibold text-white">Erreur</p>
              <p className="text-red-300 text-sm mt-2 max-w-xs">{scanResult?.error}</p>
            </div>
            <button
              onClick={() => { setScanResult(null); setResidenceSessionId(''); setStep('accueil') }}
              className="w-full max-w-xs py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Retrait */}
        {step === 'retrait' && (
          <div className="flex-1 flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Demande de retrait</h2>
            {retraitSuccess ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-green-400" />
                </div>
                <p className="text-green-300 font-semibold">Demande envoyée !</p>
                <p className="text-white/50 text-sm">L'équipe L&Lui traitera votre retrait sous 24h.</p>
                <button
                  onClick={() => { setRetraitSuccess(false); setRetraitMontant(''); setStep('accueil') }}
                  className="mt-4 py-3 px-8 rounded-2xl bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-sm"
                >
                  Retour
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Montant (FCFA)</label>
                  <input
                    type="number"
                    value={retraitMontant}
                    onChange={(e) => setRetraitMontant(e.target.value)}
                    min={1000}
                    max={solde}
                    step={500}
                    placeholder="ex: 5000"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400"
                  />
                  <p className="text-white/30 text-xs mt-1">Solde disponible : {solde.toLocaleString('fr-FR')} FCFA</p>
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Méthode</label>
                  <select
                    value={retraitMethode}
                    onChange={(e) => setRetraitMethode(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-400"
                  >
                    <option value="mtn_momo" className="bg-dark">MTN Mobile Money</option>
                    <option value="orange_money" className="bg-dark">Orange Money</option>
                  </select>
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Numéro Mobile Money</label>
                  <input
                    type="tel"
                    value={retraitNumero}
                    onChange={(e) => setRetraitNumero(e.target.value)}
                    placeholder="+237 6XX XXX XXX"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400"
                  />
                </div>
                {retraitError && <p className="text-red-400 text-sm">{retraitError}</p>}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleDemanderRetrait}
                    disabled={isProcessing}
                    className="flex-1 py-4 rounded-2xl bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                    Demander le retrait
                  </button>
                  <button
                    onClick={() => setStep('accueil')}
                    className="px-5 py-4 rounded-2xl border border-white/20 text-white/60 text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
