'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, QrCode, CheckCircle2, XCircle, Loader2, Wallet, CalendarDays, FileText } from 'lucide-react'
import { creerSessionResidence, scannerQrClient, getSessionActiveResidence, getResidencesPrescripteur } from '@/actions/prescripteurs'
import type { ResidencePrescripteur } from '@/actions/prescripteurs'
import { useFCM } from '@/lib/hooks/useFCM'

type Step = 'accueil' | 'scan_residence' | 'scan_client' | 'success' | 'error' | 'warn_no_session'

interface SessionInfo { uid: string; nom: string; type: string }
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
  const [nomResidenceActive, setNomResidenceActive] = useState('')
  const [residences, setResidences] = useState<ResidencePrescripteur[]>([])
  const [residencesLoaded, setResidencesLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scannerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const uid = sessionStorage.getItem('prescripteur_uid')
    const nom = sessionStorage.getItem('prescripteur_nom')
    const type = sessionStorage.getItem('prescripteur_type')
    if (!uid || !nom) { router.replace('/prescripteur'); return }
    setSession({ uid, nom, type: type ?? '' })
    setSolde(parseInt(sessionStorage.getItem('prescripteur_solde') ?? '0', 10))
  }, [router])

  // Enregistrement FCM au premier accès
  useFCM(session?.uid ?? null)

  // Charger les résidences assignées avec disponibilité du jour
  useEffect(() => {
    if (!session?.uid || residencesLoaded) return
    setResidencesLoaded(true)
    getResidencesPrescripteur(session.uid)
      .then(setResidences)
      .catch(() => {})
  }, [session?.uid, residencesLoaded])

  const handleLogout = () => { sessionStorage.clear(); router.replace('/prescripteur') }

  const stopCamera = useCallback(() => {
    if (scannerRef.current) { clearInterval(scannerRef.current); scannerRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null }
  }, [])

  const startCamera = useCallback(async (onScan: (data: string) => void) => {
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
        if (!video || !canvas || video.readyState !== 4) return
        canvas.width = video.videoWidth; canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(video, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code?.data) { stopCamera(); onScan(code.data) }
      }, 200)
    } catch (err) { console.error('[Camera]', err) }
  }, [stopCamera])

  useEffect(() => () => { stopCamera() }, [stopCamera])

  // Scanner une résidence directement par ID (depuis la liste "Mes résidences")
  const handleScannerResidenceDirecte = async (residenceId: string, nomResidence: string) => {
    if (!session) return
    setIsProcessing(true)
    try {
      const res = await creerSessionResidence(session.uid, residenceId)
      if (!res.success) { setScanResult({ error: res.error ?? 'Erreur session' }); setStep('error'); return }
      setResidenceSessionId(res.session_id!)
      setNomResidenceActive(res.nom_residence ?? nomResidence)
      setStep('scan_client')
      setTimeout(() => { startCamera(handleScanClient) }, 300)
    } catch {
      setScanResult({ error: 'Erreur réseau. Réessayez.' }); setStep('error')
    } finally { setIsProcessing(false) }
  }

  // Bouton 2 : scanner QR client, vérifie d'abord qu'une session résidence existe
  const handleScanClientOnly = async () => {
    if (!session) return
    setIsProcessing(true)
    try {
      const activeSession = await getSessionActiveResidence(session.uid)
      if (!activeSession) {
        setStep('warn_no_session')
        return
      }
      setResidenceSessionId(activeSession.session_id)
      setNomResidenceActive('')
      setStep('scan_client')
      setTimeout(() => { startCamera(handleScanClient) }, 300)
    } catch {
      setStep('warn_no_session')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleScanResidence = () => {
    setStep('scan_residence')
    setTimeout(() => {
      startCamera(async (data) => {
        setIsProcessing(true)
        try {
          const parsed = JSON.parse(data)
          if (parsed.type !== 'residence' || !parsed.residence_id) {
            setScanResult({ error: "QR invalide — ce n'est pas un QR résidence L&Lui." })
            setStep('error'); return
          }
          const res = await creerSessionResidence(session!.uid, parsed.residence_id)
          if (!res.success) { setScanResult({ error: res.error ?? 'Erreur session' }); setStep('error'); return }
          setResidenceSessionId(res.session_id!)
          setNomResidenceActive(res.nom_residence ?? parsed.nom ?? 'Résidence')
          setStep('scan_client')
          setTimeout(() => { startCamera(handleScanClient) }, 300)
        } catch {
          setScanResult({ error: 'QR non reconnu. Réessayez.' }); setStep('error')
        } finally { setIsProcessing(false) }
      })
    }, 300)
  }

  const handleScanClient = useCallback(async (data: string) => {
    setIsProcessing(true)
    try {
      const parsed = JSON.parse(data)
      if (parsed.type !== 'reservation' || !parsed.reservation_id) {
        setScanResult({ error: "QR invalide — ce n'est pas un QR client L&Lui." })
        setStep('error'); return
      }
      const res = await scannerQrClient(session!.uid, parsed.reservation_id, residenceSessionId)
      if (!res.success) { setScanResult({ error: res.error ?? 'Erreur scan' }); setStep('error'); return }
      setScanResult(res)
      if (res.nouveau_solde !== undefined) {
        setSolde(res.nouveau_solde)
        sessionStorage.setItem('prescripteur_solde', String(res.nouveau_solde))
      }
      setStep('success')
    } catch {
      setScanResult({ error: 'QR non reconnu. Réessayez.' }); setStep('error')
    } finally { setIsProcessing(false) }
  }, [session, residenceSessionId])

  if (!session) return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <Loader2 className="text-gold-400 animate-spin" size={32} />
    </div>
  )

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div>
          <h1 className="font-serif text-lg font-semibold">L<span className="text-gold-400">&</span>Lui</h1>
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
              onClick={() => router.push('/prescripteur/retrait')}
              className="mt-3 flex items-center gap-2 text-sm text-gold-400 hover:text-gold-300 transition-colors"
            >
              <Wallet size={14} /> Demander un retrait
            </button>
          )}
        </div>

        {/* Accueil */}
        {step === 'accueil' && (
          <div className="flex-1 flex flex-col gap-3">
            <p className="text-white/60 text-sm text-center mb-1">
              Scannez d&apos;abord le QR de la résidence, puis le QR du client.
            </p>
            {/* BOUTON 1 : Scanner la résidence */}
            <button
              onClick={handleScanResidence}
              className="w-full py-5 rounded-2xl bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-base flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              <QrCode size={22} /> Scanner une résidence
            </button>
            {/* BOUTON 2 : Scanner le QR du client (requiert session active) */}
            <button
              onClick={handleScanClientOnly}
              disabled={isProcessing}
              className="w-full py-4 rounded-2xl border-2 border-gold-400/60 text-gold-300 hover:border-gold-400 hover:text-gold-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isProcessing
                ? <Loader2 size={16} className="animate-spin" />
                : <QrCode size={16} />
              }
              Scanner le QR du client
            </button>
            <button
              onClick={() => router.push('/prescripteur/disponibilites')}
              className="w-full py-4 rounded-2xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 font-medium text-sm flex items-center justify-center gap-2 transition-all"
            >
              <CalendarDays size={16} /> Disponibilités (14 jours)
            </button>
            <button
              onClick={() => router.push('/prescripteur/rapport')}
              className="w-full py-4 rounded-2xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 font-medium text-sm flex items-center justify-center gap-2 transition-all"
            >
              <FileText size={16} /> Mon rapport du mois
            </button>

            {/* ── Mes résidences ── */}
            {residences.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-white/40 text-xs uppercase tracking-widest text-center">Mes résidences</p>
                {residences.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">🏠</span>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{r.nom}</p>
                        <p className={`text-xs flex items-center gap-1 ${r.disponible ? 'text-green-400' : 'text-red-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full inline-block ${r.disponible ? 'bg-green-400' : 'bg-red-400'}`} />
                          {r.disponible ? 'Disponible aujourd\'hui' : 'Occupée aujourd\'hui'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleScannerResidenceDirecte(r.id, r.nom)}
                      disabled={isProcessing}
                      className="shrink-0 px-3 py-1.5 rounded-xl bg-gold-500/80 hover:bg-gold-500 text-dark text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <QrCode size={12} /> Scanner
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Avertissement : aucune session active */}
        {step === 'warn_no_session' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-4xl">⚠️</span>
            </div>
            <div>
              <p className="text-xl font-semibold text-white">Résidence non scannée</p>
              <p className="text-amber-300 text-sm mt-2 max-w-xs">
                Scannez d&apos;abord le QR code de la résidence avant de scanner le QR du client.
              </p>
            </div>
            <button
              onClick={() => { setStep('accueil'); handleScanResidence() }}
              className="w-full max-w-xs py-4 rounded-2xl bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-sm transition-all"
            >
              <QrCode size={16} className="inline mr-2" />
              Scanner une résidence
            </button>
            <button
              onClick={() => setStep('accueil')}
              className="text-white/40 text-sm underline"
            >
              Annuler
            </button>
          </div>
        )}

        {/* Scanner camera */}
        {(step === 'scan_residence' || step === 'scan_client') && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-center text-white/60 text-sm">
              {step === 'scan_residence'
              ? '📍 Scannez le QR code de la résidence'
              : `👤 Scannez le QR du client${nomResidenceActive ? ` — ${nomResidenceActive}` : ''}`
            }
            </p>
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-sm mx-auto w-full">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
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
      </div>
    </div>
  )
}
