'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, QrCode, CheckCircle2, XCircle, Loader2, Wallet, FileText, Users, WifiOff, Home, Timer } from 'lucide-react'
import { creerSessionPartenaire, getSessionActivePartenaire, scannerQrReservation, envoyerAlerte15Min } from '@/actions/prescripteurs'
import { useFCM } from '@/lib/hooks/useFCM'
import {
  ajouterAlaFile,
  getActionsNonSynchronisees,
  marquerCommeSynchronise,
  viderFileSynchronisee,
} from '@/lib/offlineQueue'

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
  const [noteMoyenne, setNoteMoyenne] = useState(0)
  const [totalNotes, setTotalNotes] = useState(0)
  const [badgeConfiance, setBadgeConfiance] = useState(false)
  const [step, setStep] = useState<Step>('accueil')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [nomPartenaire, setNomPartenaire] = useState('')
  const [sessionPartenaire, setSessionPartenaire] = useState<{ session_id: string; nom_partenaire: string; expire_at: string } | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(10)
  const [minutesRestantes, setMinutesRestantes] = useState<number | null>(null)
  const alerteEnvoyeeRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scannerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sessionRef = useRef<SessionInfo | null>(null)

  // Synchronise les actions en attente dès le retour réseau
  const synchroniserFile = useCallback(async (uid: string) => {
    const actions = await getActionsNonSynchronisees()
    if (actions.length === 0) return
    setSyncMessage('Synchronisation en cours...')
    let synced = 0
    for (const action of actions) {
      try {
        if (action.type === 'scan_partenaire') {
          const d = action.data as { partenaire_id: string; nom: string }
          const res = await creerSessionPartenaire(uid, d.partenaire_id, d.nom ?? '')
          if (res.success) {
            await marquerCommeSynchronise(action.id!)
            synced++
          }
        } else if (action.type === 'scan_reservation') {
          const d = action.data as { reservation_id: string }
          const res = await scannerQrReservation(uid, d.reservation_id)
          if (res.success) {
            await marquerCommeSynchronise(action.id!)
            synced++
            if (res.nouveau_solde !== undefined) {
              setSolde(res.nouveau_solde)
              sessionStorage.setItem('prescripteur_solde', String(res.nouveau_solde))
            }
          }
        }
      } catch {
        // On réessaie la prochaine fois
      }
    }
    await viderFileSynchronisee()
    if (synced > 0) {
      setSyncMessage(`${synced} scan${synced > 1 ? 's' : ''} synchronisé${synced > 1 ? 's' : ''} !`)
      setTimeout(() => setSyncMessage(null), 4000)
    } else {
      setSyncMessage(null)
    }
  }, [])

  useEffect(() => {
    const uid = sessionStorage.getItem('prescripteur_uid')
    const nom = sessionStorage.getItem('prescripteur_nom')
    const type = sessionStorage.getItem('prescripteur_type')
    if (!uid || !nom) { router.replace('/prescripteur'); return }
    const info = { uid, nom, type: type ?? '' }
    setSession(info)
    sessionRef.current = info
    setSolde(parseInt(sessionStorage.getItem('prescripteur_solde') ?? '0', 10))
    setNoteMoyenne(parseFloat(sessionStorage.getItem('prescripteur_note_moyenne') ?? '0'))
    setTotalNotes(parseInt(sessionStorage.getItem('prescripteur_total_notes') ?? '0', 10))
    setBadgeConfiance(sessionStorage.getItem('prescripteur_badge_confiance') === '1')
  }, [router])

  // Enregistrement FCM au premier accès
  useFCM(session?.uid ?? null)

  // Vérifier session partenaire active au chargement
  useEffect(() => {
    if (!session?.uid) return
    getSessionActivePartenaire(session.uid)
      .then((s) => { if (s) setSessionPartenaire(s) })
      .catch(() => {})
  }, [session?.uid])

  // Détection réseau + sync auto
  useEffect(() => {
    setIsOffline(!navigator.onLine)

    const handleOnline = () => {
      setIsOffline(false)
      const uid = sessionRef.current?.uid
      if (uid) synchroniserFile(uid)
    }
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [synchroniserFile])

  // ── Barre session : countdown + alerte 15 min ──────────────
  useEffect(() => {
    if (!sessionPartenaire?.expire_at) { setMinutesRestantes(null); return }

    const calculer = () => {
      const diff = new Date(sessionPartenaire.expire_at).getTime() - Date.now()
      if (diff <= 0) {
        setMinutesRestantes(0)
        setSessionPartenaire(null)
        alerteEnvoyeeRef.current = false
        // Notification expiration
        try {
          if (Notification.permission === 'granted') {
            new Notification('Session expiree', { body: 'Rescannez le QR du partenaire si le client est encore la.' })
          }
        } catch {}
        return
      }
      const mins = Math.ceil(diff / 60000)
      setMinutesRestantes(mins)
      // Alerte 15 min (une seule fois)
      if (mins <= 15 && !alerteEnvoyeeRef.current) {
        alerteEnvoyeeRef.current = true
        try { navigator.vibrate?.([500]) } catch {}
        try {
          if (Notification.permission === 'granted') {
            new Notification("Session expire dans 15 minutes !", { body: "Scannez le QR du client rapidement." })
          }
        } catch {}
        // Push FCM server-side
        const uid = sessionRef.current?.uid
        if (uid) envoyerAlerte15Min(uid).catch(() => {})
      }
    }

    calculer()
    const interval = setInterval(calculer, 30000)
    return () => clearInterval(interval)
  }, [sessionPartenaire?.expire_at])

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

          // Hors-ligne : stocker en file d'attente
          if (!navigator.onLine) {
            await ajouterAlaFile({
              type: 'scan_partenaire',
              data: { partenaire_id: parsed.partenaire_id, nom: parsed.nom ?? '' },
              timestamp: Date.now(),
              synced: false,
            })
            const nom = parsed.nom ?? 'Partenaire'
            setNomPartenaire(nom)
            setSessionPartenaire({ session_id: 'offline', nom_partenaire: nom, expire_at: '' })
            setScanResult({ error: '' })
            setStep('confirme_partenaire')
            setSyncMessage("Scan enregistre hors-ligne. Sera synchronise des reconnexion.")
            setTimeout(() => setSyncMessage(null), 5000)
            return
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

      // Hors-ligne : stocker en file d'attente
      if (!navigator.onLine) {
        await ajouterAlaFile({
          type: 'scan_reservation',
          data: { reservation_id: parsed.reservation_id },
          timestamp: Date.now(),
          synced: false,
        })
        setScanResult({
          commission_fcfa: parsed.commission ?? 1500,
          client_nom: parsed.client_nom ?? '',
          hebergement_nom: parsed.hebergement_nom ?? '',
        })
        setSyncMessage("Commission en attente de sync. Vous recevrez votre SMS des reconnexion.")
        setSessionPartenaire(null)
        setStep('success')
        return
      }

      const res = await scannerQrReservation(session!.uid, parsed.reservation_id)
      if (!res.success) { setScanResult({ error: res.error ?? 'Erreur scan' }); setStep('error'); return }
      setScanResult(res)
      if (res.nouveau_solde !== undefined) {
        setSolde(res.nouveau_solde)
        sessionStorage.setItem('prescripteur_solde', String(res.nouveau_solde))
      }
      setSessionPartenaire(null)
      // Vibration et son de confirmation
      try { navigator.vibrate?.([200, 100, 200]) } catch {}
      try {
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = 880; gain.gain.value = 0.1
        osc.start(); osc.stop(ctx.currentTime + 0.15)
      } catch {}
      setCountdown(10)
      setStep('success')
    } catch {
      // Détecter si c'est le QR arrivée client (LLS- ou URL scanner)
      const isQrArrivee = data.includes('LLS-') || data.includes('/partenaire/scanner') || data.includes('/scanner?code=')
      if (isQrArrivee) {
        setScanResult({ error: "Ce QR est le QR d'arrivee du client (LLS-XXXX). Demandez au partenaire le QR prescripteur affiche separement sur son ecran." })
      } else {
        setScanResult({ error: 'QR non reconnu. Reessayez.' })
      }
      setStep('error')
    } finally { setIsProcessing(false) }
  }, [session])

  const handleDemarrerScanReservation = () => {
    setStep('scan_reservation')
    setTimeout(() => { startCamera(handleScanReservation) }, 300)
  }

  // Compte a rebours écran succès
  useEffect(() => {
    if (step !== 'success') return
    if (countdown <= 0) { setScanResult(null); setStep('accueil'); return }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [step, countdown])

  if (!session) return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <Loader2 className="text-gold-400 animate-spin" size={32} />
    </div>
  )

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col">

      {/* Bandeau hors-ligne */}
      {isOffline && (
        <div className="bg-[#1A1A1A] border-b border-white/10 px-5 py-3 flex items-start gap-3">
          <WifiOff size={18} className="text-white/70 mt-0.5 shrink-0" />
          <div>
            <p className="text-white font-medium text-sm">Mode hors-ligne</p>
            <p className="text-white/60 text-xs mt-0.5">
              Vos scans seront synchronises des le retour du reseau
            </p>
          </div>
        </div>
      )}

      {/* Bandeau sync */}
      {syncMessage && (
        <div className="bg-green-600/90 px-5 py-2 text-white text-sm font-medium text-center">
          {syncMessage}
        </div>
      )}

      {/* Barre session active (permanente, visible dans tous les steps) */}
      {sessionPartenaire && minutesRestantes !== null && minutesRestantes > 0 && step !== 'success' && (
        <div className={`px-5 py-3 flex items-center justify-between gap-3 transition-colors ${
          minutesRestantes <= 15
            ? 'bg-[#E24B4A] border-b border-red-600/50'
            : 'bg-[#C9A84C] border-b border-[#b8973f]/50'
        }`}>
          <div className="flex items-center gap-2">
            <Home size={16} className="text-white shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm leading-tight">{sessionPartenaire.nom_partenaire}</p>
              <p className="text-white/80 text-xs">
                {minutesRestantes > 60
                  ? `Expire dans ${Math.floor(minutesRestantes / 60)}h ${minutesRestantes % 60}min`
                  : `Expire dans ${minutesRestantes} min`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-white/80 shrink-0">
            <Timer size={14} />
            <span className="text-xs font-medium">
              {minutesRestantes <= 15 ? 'URGENT' : 'Active'}
            </span>
          </div>
        </div>
      )}

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
          {totalNotes > 0 && (
            <div className="mt-3 pt-3 border-t border-gold-400/20 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[#C9A84C] text-base">⭐</span>
                <span className="text-gold-200 text-sm font-semibold">{noteMoyenne.toFixed(1)}<span className="text-gold-400/60 font-normal">/5</span></span>
                <span className="text-gold-400/50 text-xs">({totalNotes} éval{totalNotes > 1 ? 's' : ''})</span>
              </div>
              {badgeConfiance && (
                <span className="text-xs font-semibold text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-full">
                  🏆 De confiance
                </span>
              )}
            </div>
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
                ? "Vous etes positionne. Scannez le QR reservation du client."
                : "Scannez d'abord le QR du partenaire, puis le QR reservation du client."}
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
              Scanner le QR reservation client
            </button>

            {/* Saisie manuelle (Livrable 2) */}
            <button
              onClick={() => router.push('/prescripteur/saisie-manuelle')}
              disabled={!sessionPartenaire}
              className="text-white/40 text-xs text-center underline disabled:opacity-20 disabled:cursor-not-allowed"
            >
              Pas de camera ? Saisir le code manuellement
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
              <p className="text-xl font-semibold text-white">Vous etes positionne !</p>
              <p className="text-white/50 text-sm mt-1">
                Chez <span className="text-gold-300 font-medium">{nomPartenaire}</span>
              </p>
              <p className="text-white/40 text-xs mt-2">
                Session valide 2h · Attendez la reservation du client
              </p>
              {isOffline && (
                <p className="text-amber-400/80 text-xs mt-2">
                  Scan enregistre hors-ligne — sera synchronise
                </p>
              )}
            </div>
            <button
              onClick={handleDemarrerScanReservation}
              className="w-full max-w-xs py-4 rounded-2xl bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <QrCode size={16} /> Scanner le QR reservation maintenant
            </button>
            <button
              onClick={() => setStep('accueil')}
              className="text-white/40 text-sm underline"
            >
              Retour a l'accueil
            </button>
          </div>
        )}

        {/* ── CAMÉRA SCAN ── */}
        {(step === 'scan_partenaire' || step === 'scan_reservation') && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-center text-white/60 text-sm">
              {step === 'scan_partenaire'
                ? "Scannez le QR code du partenaire hebergeur"
                : `Scannez le QR reservation du client${nomPartenaire ? ` — ${nomPartenaire}` : ''}`}
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

        {/* ── SUCCESS — Écran fort plein écran vert ── */}
        {step === 'success' && scanResult && (
          <div className="fixed inset-0 bg-[#1D9E75] flex flex-col items-center justify-center px-6 gap-6 text-center z-50 overflow-y-auto py-10">
            {/* Check animé */}
            <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center animate-check-appear">
              <CheckCircle2 size={64} className="text-white" strokeWidth={2} />
            </div>

            {/* Titre */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
              <p className="text-white text-2xl font-bold tracking-wide">COMMISSION RECUE !</p>
            </div>

            {/* Montant */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.35s', opacity: 0 }}>
              <p className="font-serif text-6xl font-bold text-white leading-none">
                +{(scanResult.commission_fcfa ?? 1500).toLocaleString('fr-FR')}
              </p>
              <p className="text-white/80 text-2xl font-semibold mt-1">FCFA</p>
            </div>

            {/* Détails */}
            <div className="rounded-2xl bg-white/20 border border-white/30 p-5 w-full max-w-xs text-left animate-fade-in-up" style={{ animationDelay: '0.5s', opacity: 0 }}>
              {scanResult.nouveau_solde !== undefined && (
                <div className="flex justify-between mb-3 pb-3 border-b border-white/20">
                  <span className="text-white/70 text-sm">Nouveau solde</span>
                  <span className="text-white font-bold text-sm">{scanResult.nouveau_solde.toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              {scanResult.client_nom && (
                <div className="flex justify-between mb-2">
                  <span className="text-white/70 text-sm">Client</span>
                  <span className="text-white text-sm font-medium">{scanResult.client_nom}</span>
                </div>
              )}
              {scanResult.hebergement_nom && (
                <div className="flex justify-between mb-2">
                  <span className="text-white/70 text-sm">Chez</span>
                  <span className="text-white text-sm font-medium">{scanResult.hebergement_nom}</span>
                </div>
              )}
              <div className="flex justify-between mt-2">
                <span className="text-white/70 text-sm">Date</span>
                <span className="text-white text-sm">{new Date().toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
              </div>
            </div>

            {/* SMS envoyé */}
            <p className="text-white/80 text-sm animate-fade-in-up" style={{ animationDelay: '0.65s', opacity: 0 }}>
              SMS de confirmation envoye ✓
            </p>

            {isOffline && (
              <p className="text-white/70 text-xs bg-white/10 rounded-xl px-4 py-2">
                Commission en attente de synchronisation
              </p>
            )}

            {/* Bouton retour + compte a rebours */}
            <div className="w-full max-w-xs animate-fade-in-up" style={{ animationDelay: '0.8s', opacity: 0 }}>
              <button
                onClick={() => { setScanResult(null); setStep('accueil') }}
                className="w-full py-4 rounded-2xl bg-white text-[#1D9E75] font-bold text-base transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Users size={18} /> Vous pouvez partir
              </button>
              <p className="text-white/60 text-xs mt-3 text-center">
                Retour accueil dans {countdown}s...
              </p>
            </div>
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
              Reessayer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
