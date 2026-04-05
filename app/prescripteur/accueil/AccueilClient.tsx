'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, QrCode, CheckCircle2, XCircle, Loader2, Wallet, CalendarDays, FileText, Users } from 'lucide-react'
import { creerSessionPartenaire, getSessionActivePartenaire, scannerQrReservation } from '@/actions/prescripteurs'
import { useFCM } from '@/lib/hooks/useFCM'

type Step = 'accueil' | 'scan_partenaire' | 'confirme_partenaire' | 'scan_reservation' | 'success' | 'error'

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
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [nomPartenaire, setNomPartenaire] = useState('')
  const [sessionPartenaire, setSessionPartenaire] = useState<{ session_id: string; nom_partenaire: string; expire_at: string } | null>(null)
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

  // Vérifier session partenaire active au chargement
  useEffect(() => {
    if (!session?.uid) return
    getSessionActivePartenaire(session.uid)
      .then((s) => {
        if (s) setSessionPartenaire(s)
      })
      .catch(() => {})
  }, [session?.uid])

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

  // SCAN 1 — QR partenaire
  const handleScanPartenaire = () => {
    setStep('scan_partenaire')
    setTimeout(() => {
      startCamera(async (data) => {
        setIsProcessing(true)
        try {
          const parsed = JSON.parse(data)
          if (parsed.type !== 'partenaire' || !parsed.partenaire_id) {
            setScanResult({ error: "QR invalide — ce n'est pas un QR partenaire L&Lui." })
            setStep('error'); return
          }
          const res = await creerSessionPartenaire(session!.uid, parsed.partenaire_id, parsed.nom ?? '')
          if (!res.success) { setScanResult({ error: res.error ?? 'Erreur session' }); setStep('error'); return }
          const nom = res.nom_partenaire ?? parsed.nom ?? 'Partenaire'
          setNomPartenaire(nom)
          setSessionPartenaire({ session_id: res.session_id!, nom_partenaire: nom, expire_at: '' })
          setStep('confirme_partenaire')
        } catch {
          setScanResult({ error: 'QR non reconnu. Réessayez.' }); setStep('error')
        } finally { setIsProcessing(false) }
      })
    }, 300)
  }

  // SCAN 2 — QR réservation client
  const handleScanReservation = useCallback(async (data: string) => {
    setIsProcessing(true)
    try {
      const parsed = JSON.parse(data)
      if (parsed.type !== 'reservation' || !parsed.reservation_id) {
        setScanResult({ error: "QR invalide — ce n'est pas un QR réservation L&Lui." })
        setStep('error'); return
      }
      const res = await scannerQrReservation(session!.uid, parsed.reservation_id)
      if (!res.success) { setScanResult({ error: res.error ?? 'Erreur scan' }); setStep('error'); return }
      setScanResult(res)
      if (res.nouveau_solde !== undefined) {
        setSolde(res.nouveau_solde)
        sessionStorage.setItem('prescripteur_solde', String(res.nouveau_solde))
      }
      // La session partenaire est maintenant "utilisée" → vider le state local
      setSessionPartenaire(null)
      setStep('success')
    } catch {
      setScanResult({ error: 'QR non reconnu. Réessayez.' }); setStep('error')
    } finally { setIsProcessing(false) }
  }, [session])

  const handleDemarrerScanReservation = () => {
    setStep('scan_reservation')
    setTimeout(() => { startCamera(handleScanReservation) }, 300)
  }

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

        {/* ── ACCUEIL ── */}
        {step === 'accueil' && (
          <div className="flex-1 flex flex-col gap-3">
            {/* Session partenaire active */}
            {sessionPartenaire && (
              <div className="rounded-2xl bg-green-500/10 border border-green-400/30 px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-green-300 text-xs uppercase tracking-widest">Session active</p>
                  <p className="text-white font-medium text-sm">{sessionPartenaire.nom_partenaire}</p>
                  {sessionPartenaire.expire_at && (
                    <p className="text-green-400/70 text-xs mt-0.5">
                      Expire a {new Date(sessionPartenaire.expire_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              </div>
            )}

            <p className="text-white/60 text-sm text-center mb-1">
              {sessionPartenaire
                ? 'Vous êtes positionné. Scannez le QR réservation du client.'
                : 'Scannez d\'abord le QR du partenaire, puis le QR réservation du client.'}
            </p>

            {/* BOUTON 1 : Scanner le QR du partenaire */}
            <button
              onClick={handleScanPartenaire}
              className="w-full py-5 rounded-2xl bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-base flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              <QrCode size={22} /> {sessionPartenaire ? 'Changer de partenaire' : 'Scanner le QR du partenaire'}
            </button>

            {/* BOUTON 2 : Scanner le QR réservation client */}
            <button
              onClick={handleDemarrerScanReservation}
              disabled={isProcessing || !sessionPartenaire}
              className="w-full py-4 rounded-2xl border-2 border-gold-400/60 text-gold-300 hover:border-gold-400 hover:text-gold-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing
                ? <Loader2 size={16} className="animate-spin" />
                : <QrCode size={16} />
              }
              Scanner le QR réservation client
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
          </div>
        )}

        {/* ── CONFIRMATION PARTENAIRE ── */}
        {step === 'confirme_partenaire' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-green-400" />
            </div>
            <div>
              <p className="text-xl font-semibold text-white">Vous êtes positionné !</p>
              <p className="text-white/50 text-sm mt-1">
                Chez <span className="text-gold-300 font-medium">{nomPartenaire}</span>
              </p>
              <p className="text-white/40 text-xs mt-2">
                Session valide 2h · Attendez la réservation du client
              </p>
            </div>
            <button
              onClick={handleDemarrerScanReservation}
              className="w-full max-w-xs py-4 rounded-2xl bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <QrCode size={16} /> Scanner le QR réservation maintenant
            </button>
            <button
              onClick={() => setStep('accueil')}
              className="text-white/40 text-sm underline"
            >
              Retour à l'accueil
            </button>
          </div>
        )}

        {/* ── CAMÉRA SCAN ── */}
        {(step === 'scan_partenaire' || step === 'scan_reservation') && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-center text-white/60 text-sm">
              {step === 'scan_partenaire'
                ? '🏨 Scannez le QR code du partenaire hébergeur'
                : `🎫 Scannez le QR réservation du client${nomPartenaire ? ` — ${nomPartenaire}` : ''}`}
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
              onClick={() => { stopCamera(); setStep(sessionPartenaire ? 'confirme_partenaire' : 'accueil') }}
              className="text-white/40 hover:text-white/70 text-sm text-center underline"
            >
              Annuler
            </button>
          </div>
        )}

        {/* ── SUCCESS ── */}
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
              onClick={() => { setScanResult(null); setStep('accueil') }}
              className="w-full max-w-xs py-4 rounded-2xl bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-sm transition-all active:scale-95"
            >
              <Users size={16} className="inline mr-2" />
              Enregistrer un autre client
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
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
              onClick={() => { setScanResult(null); setStep('accueil') }}
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
