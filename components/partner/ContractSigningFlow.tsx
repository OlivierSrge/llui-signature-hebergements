'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import {
  CheckCircle, Download, Loader2, ChevronRight,
  FileText, User, MessageCircle, Shield,
} from 'lucide-react'
import { generateAndSendOtp, verifyOtp, finalizeSignature } from '@/actions/contract'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  partnerId: string
  partnerName: string
  partnerWhatsapp: string
  partnerPlan: string
  contractText: string
  commissionClause: string
  contractMeta: { version: string; effectiveDate: string }
  existingContract: {
    status: string
    contractId: string
    signedAt?: string
    signatoryName?: string
    pdfUrl?: string
  }
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function replaceContractVars(
  text: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (acc, [key, val]) => acc.replaceAll(key, val),
    text
  )
}

function formatPhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

function generateContractIdLocal(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = 'LLUI-CTR-'
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

// ─── Barre de progression ────────────────────────────────────────────────────

const STEPS = ['Lecture', 'Identification', 'Validation OTP', 'Contrat signé']

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-between mb-8 relative">
      <div className="absolute left-0 right-0 top-4 h-0.5 bg-beige-200 -z-10" />
      {STEPS.map((label, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              i < current
                ? 'bg-green-500 border-green-500 text-white'
                : i === current
                  ? 'bg-dark border-dark text-white'
                  : 'bg-white border-beige-300 text-dark/30'
            }`}
          >
            {i < current ? '✓' : i + 1}
          </div>
          <span
            className={`text-[10px] text-center font-medium leading-tight ${
              i === current ? 'text-dark' : i < current ? 'text-green-600' : 'text-dark/30'
            }`}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── ÉTAPE 1 — Lecture ───────────────────────────────────────────────────────

function Step1Reading({
  contractText,
  contractId,
  onNext,
}: {
  contractText: string
  contractId: string
  onNext: () => void
}) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const canContinue = scrollProgress >= 99

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const max = scrollHeight - clientHeight
    if (max <= 0) {
      setScrollProgress(100)
      return
    }
    setScrollProgress(Math.round((scrollTop / max) * 100))
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true })
      handleScroll()
      return () => el.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  const handleDownloadRaw = () => {
    const blob = new Blob([contractText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contrat-${contractId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-dark text-lg">Lecture du contrat</h2>
          <p className="text-sm text-dark/50">Faites défiler jusqu&apos;en bas pour continuer.</p>
        </div>
        <button
          onClick={handleDownloadRaw}
          className="flex items-center gap-2 text-xs px-3 py-2 border border-beige-300 text-dark/50 rounded-xl hover:bg-beige-50 transition-colors"
        >
          <Download size={13} /> Télécharger PDF brut
        </button>
      </div>

      {/* Contenu du contrat */}
      <div
        ref={scrollRef}
        className="bg-white border border-beige-200 rounded-xl overflow-y-auto max-h-[55vh] p-5"
        style={{ scrollBehavior: 'smooth' }}
      >
        <pre className="whitespace-pre-wrap font-sans text-sm text-dark/80 leading-relaxed">
          {contractText}
        </pre>
      </div>

      {/* Barre de progression scroll */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-dark/50">
          <span>Progression de lecture</span>
          <span>{scrollProgress}%</span>
        </div>
        <div className="h-2 bg-beige-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-500 rounded-full transition-all duration-300"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!canContinue}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-dark text-white rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-dark/80"
      >
        Continuer <ChevronRight size={16} />
      </button>
      {!canContinue && (
        <p className="text-xs text-center text-dark/40">
          Lisez l&apos;intégralité du contrat pour continuer ({100 - scrollProgress}% restant)
        </p>
      )}
    </div>
  )
}

// ─── ÉTAPE 2 — Identification ────────────────────────────────────────────────

const ROLES = [
  'Gérant', 'Directeur', 'Propriétaire', 'Administrateur', 'Représentant légal',
]

function Step2Identification({
  partnerName,
  partnerWhatsapp,
  onNext,
}: {
  partnerName: string
  partnerWhatsapp: string
  onNext: (name: string, role: string) => void
}) {
  const [name, setName] = useState(partnerName)
  const [role, setRole] = useState(ROLES[0])
  const [accepted1, setAccepted1] = useState(false)
  const [accepted2, setAccepted2] = useState(false)
  const [loading, setLoading] = useState(false)

  const canSubmit = name.trim().length > 2 && accepted1 && accepted2 && !loading

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    await onNext(name.trim(), role)
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-dark text-lg">Identification du signataire</h2>
        <p className="text-sm text-dark/50">Vérifiez vos informations avant de signer.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">Nom complet du signataire <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Prénom Nom"
          />
        </div>

        <div>
          <label className="label">Qualité / Fonction <span className="text-red-500">*</span></label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Numéro WhatsApp</label>
          <div className="flex items-center gap-2 px-4 py-3 bg-beige-50 border border-beige-200 rounded-xl text-sm text-dark/60">
            <MessageCircle size={15} className="text-green-500" />
            <span>{partnerWhatsapp || 'Non renseigné'}</span>
            <span className="ml-auto text-xs text-dark/30">Non modifiable</span>
          </div>
          <p className="text-xs text-dark/40 mt-1">
            Le code OTP sera envoyé sur ce numéro WhatsApp.
          </p>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3 p-4 bg-beige-50 border border-beige-200 rounded-xl">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted1}
            onChange={(e) => setAccepted1(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-beige-300 text-gold-500 focus:ring-gold-400 flex-shrink-0"
          />
          <span className="text-sm text-dark/70">
            Je confirme avoir lu et compris l&apos;intégralité du contrat de partenariat L&Lui Signature.
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted2}
            onChange={(e) => setAccepted2(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-beige-300 text-gold-500 focus:ring-gold-400 flex-shrink-0"
          />
          <span className="text-sm text-dark/70">
            J&apos;accepte les conditions du contrat et je consens à sa signature électronique conformément à la loi camerounaise n°2010/012.
          </span>
        </label>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-dark text-white rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-dark/80"
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> Envoi du code…</>
        ) : (
          <><MessageCircle size={16} /> Recevoir code OTP par WhatsApp</>
        )}
      </button>
    </div>
  )
}

// ─── ÉTAPE 3 — OTP ──────────────────────────────────────────────────────────

function Step3OTP({
  partnerWhatsapp,
  onVerified,
  onResend,
}: {
  partnerWhatsapp: string
  onVerified: () => void
  onResend: () => Promise<void>
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(30 * 60)
  const [resendCooldown, setResendCooldown] = useState(120)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [resending, setResending] = useState(false)

  // Countdown 30 minutes
  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(t); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Resend cooldown 2 minutes
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(t); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const handleDigit = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[i] = val
    setDigits(next)
    setError('')
    if (val && i < 5) inputRefs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setDigits(text.split(''))
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerify = async () => {
    const code = digits.join('')
    if (code.length < 6) {
      setError('Entrez les 6 chiffres du code.')
      return
    }
    setLoading(true)
    setError('')

    const partnerId = (window as any).__partnerId
    const res = await verifyOtp(partnerId, code)
    setLoading(false)

    if (res.success) {
      onVerified()
    } else {
      setError(res.error || 'Code incorrect')
      setDigits(Array(6).fill(''))
      inputRefs.current[0]?.focus()
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setResending(true)
    await onResend()
    setResending(false)
    setResendCooldown(120)
    setTimeLeft(30 * 60)
    setDigits(Array(6).fill(''))
    setError('')
    toast.success('Nouveau code envoyé via WhatsApp')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-dark text-lg">Validation OTP</h2>
        <p className="text-sm text-dark/50">
          Un code à 6 chiffres a été envoyé sur WhatsApp : <strong>{partnerWhatsapp}</strong>
        </p>
      </div>

      {/* Compteur */}
      <div className="flex items-center justify-center gap-2 p-3 bg-beige-50 border border-beige-200 rounded-xl">
        <Shield size={15} className="text-gold-500" />
        <span className="text-sm text-dark/70">
          Code valide encore : <strong className={timeLeft < 60 ? 'text-red-500' : 'text-dark'}>{formatTime(timeLeft)}</strong>
        </span>
      </div>

      {/* 6 cases */}
      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-11 h-14 text-center text-2xl font-bold border-2 rounded-xl bg-white focus:outline-none transition-colors ${
              error ? 'border-red-400' : d ? 'border-gold-400' : 'border-beige-300 focus:border-gold-400'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-center text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>
      )}

      <button
        onClick={handleVerify}
        disabled={loading || digits.join('').length < 6}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-dark text-white rounded-xl font-medium transition-all disabled:opacity-40 hover:bg-dark/80"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
        {loading ? 'Vérification…' : 'Valider le code'}
      </button>

      {/* Renvoi */}
      <p className="text-center text-sm text-dark/50">
        Vous n&apos;avez pas reçu le code ?{' '}
        {resendCooldown > 0 ? (
          <span className="text-dark/30">Renvoi possible dans {formatTime(resendCooldown)}</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-gold-600 font-medium hover:underline disabled:opacity-50"
          >
            {resending ? 'Envoi…' : 'Renvoyer'}
          </button>
        )}
      </p>
    </div>
  )
}

// ─── ÉTAPE 4 — Succès ────────────────────────────────────────────────────────

function Step4Success({
  contractId,
  signatoryName,
  pdfUrl,
  signedAt,
}: {
  contractId: string
  signatoryName: string
  pdfUrl: string
  signedAt: string
}) {
  const date = new Date(signedAt)
  return (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={40} className="text-green-500" />
        </div>
      </div>

      <div>
        <h2 className="font-serif text-2xl font-semibold text-dark mb-2">Contrat signé !</h2>
        <p className="text-dark/60">
          Votre contrat de partenariat a été signé avec succès.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-left space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-dark/50">Numéro de contrat</span>
          <span className="font-mono font-semibold text-dark">{contractId}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-dark/50">Signataire</span>
          <span className="font-medium text-dark">{signatoryName}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-dark/50">Date de signature</span>
          <span className="text-dark">
            {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-dark/50">Validation</span>
          <span className="text-green-600 font-medium">✅ OTP WhatsApp confirmé</span>
        </div>
      </div>

      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-dark text-white rounded-xl font-medium hover:bg-dark/80 transition-colors"
        >
          <Download size={16} /> Télécharger le contrat signé (PDF)
        </a>
      )}

      <a
        href="/partenaire/dashboard"
        className="flex items-center justify-center gap-2 w-full py-3 border border-beige-300 text-dark/60 rounded-xl hover:bg-beige-50 transition-colors text-sm"
      >
        Retour au dashboard
      </a>
    </div>
  )
}

// ═══════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════

export default function ContractSigningFlow({
  partnerId,
  partnerName,
  partnerWhatsapp,
  partnerPlan,
  contractText: rawContractText,
  commissionClause,
  contractMeta,
  existingContract,
}: Props) {
  // Injecter partnerId pour l'OTP (accès depuis les sous-composants)
  if (typeof window !== 'undefined') {
    (window as any).__partnerId = partnerId
  }

  // Si déjà signé, afficher directement l'étape 4
  const alreadySigned = existingContract.status === 'signed'

  const [step, setStep] = useState(alreadySigned ? 3 : 0)
  const [signatoryName, setSignatoryName] = useState(existingContract.signatoryName || partnerName)
  const [signatoryRole, setSignatoryRole] = useState('')
  const [contractId] = useState(
    existingContract.contractId || `LLUI-CTR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
  )
  const [otpCode, setOtpCode] = useState('')
  const [signedAt, setSignedAt] = useState(existingContract.signedAt || '')
  const [pdfUrl, setPdfUrl] = useState(existingContract.pdfUrl || '')
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Remplacer les variables dans le texte du contrat
  const contractText = replaceContractVars(rawContractText, {
    '{{NOM_PARTENAIRE}}': signatoryName || partnerName,
    '{{PLAN_ABONNEMENT}}': partnerPlan || 'Essentiel',
    '{{PRIX_ABONNEMENT}}': '',
    '{{TAUX_COMMISSION}}': 'selon les conditions convenues entre les parties',
    '{{NOMBRE_LOGEMENTS}}': '',
    '{{DATE_SIGNATURE}}': new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    '{{DATE_DEBUT}}': new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    '{{DELAI_VERSEMENT}}': '5',
    '{{VILLE}}': 'Kribi',
    '{{ANNEE}}': new Date().getFullYear().toString(),
    '{{QUALITE_SIGNATAIRE}}': signatoryRole || 'Gérant',
    '{{NUMERO_CONTRAT}}': contractId,
    '{{CLAUSE_COMMISSION}}': commissionClause,
  })

  // ── Étape 2 → 3 : Générer OTP ─────────────────────────────────────────────
  const handleIdentified = async (name: string, role: string) => {
    setSignatoryName(name)
    setSignatoryRole(role)

    const res = await generateAndSendOtp(partnerId, name, role)
    if (!res.success) {
      toast.error(res.error || 'Erreur lors de la génération OTP')
      return
    }

    const code = res.otpCode!
    setOtpCode(code)

    // Ouvrir WhatsApp avec le code
    const phone = formatPhone(partnerWhatsapp)
    const msg = `L&Lui Signature — Code de validation OTP\n\nVotre code de signature : *${code}*\n\nCe code est valable 30 minutes.\nNe le partagez pas.\n\nContrat : ${contractId}`
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    window.open(waUrl, '_blank')

    setStep(2)
  }

  // ── Renvoi OTP ─────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    const res = await generateAndSendOtp(partnerId, signatoryName, signatoryRole)
    if (!res.success) {
      toast.error(res.error || 'Erreur renvoi OTP')
      return
    }
    const code = res.otpCode!
    setOtpCode(code)
    const phone = formatPhone(partnerWhatsapp)
    const msg = `L&Lui Signature — Code de validation OTP\n\nVotre nouveau code de signature : *${code}*\n\nCe code est valable 30 minutes.\nNe le partagez pas.\n\nContrat : ${contractId}`
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    window.open(waUrl, '_blank')
  }

  // ── Étape 3 → 4 : Générer PDF + finaliser ─────────────────────────────────
  const handleOtpVerified = async () => {
    setGeneratingPdf(true)
    toast.loading('Génération du contrat PDF…', { id: 'pdf-gen' })

    try {
      // Import dynamique de jsPDF
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const marginL = 20
      const marginR = 20
      const marginT = 25
      const marginB = 25
      const contentW = pageW - marginL - marginR
      let currentPage = 1
      const pages: number[] = []

      const addHeader = () => {
        doc.setFontSize(8)
        doc.setTextColor(150, 130, 90)
        doc.text(`L&Lui Signature — ${contractId}`, marginL, 10)
        doc.line(marginL, 13, pageW - marginR, 13)
      }

      const addFooter = (page: number, total: number) => {
        doc.setFontSize(8)
        doc.setTextColor(150, 130, 90)
        doc.line(marginL, pageH - 15, pageW - marginR, pageH - 15)
        doc.text(`Page ${page}/${total} — Confidentiel`, marginL, pageH - 10)
        doc.text('L&Lui Signature — Kribi, Cameroun', pageW / 2, pageH - 10, { align: 'center' })
      }

      // ── Page de garde ─────────────────────────────────────────────────────
      addHeader()

      doc.setFontSize(24)
      doc.setTextColor(26, 26, 26)
      doc.setFont('helvetica', 'bold')
      doc.text('CONTRAT DE PARTENARIAT', pageW / 2, 60, { align: 'center' })

      doc.setFontSize(14)
      doc.setTextColor(201, 168, 76)
      doc.text('L&Lui Signature Hebergements', pageW / 2, 72, { align: 'center' })

      doc.setFontSize(11)
      doc.setTextColor(26, 26, 26)
      doc.setFont('helvetica', 'normal')
      doc.text(`Numero de contrat : ${contractId}`, pageW / 2, 90, { align: 'center' })

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(signatoryName, pageW / 2, 110, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(signatoryRole, pageW / 2, 118, { align: 'center' })

      doc.setFontSize(10)
      doc.text(`Plan : ${partnerPlan}`, pageW / 2, 135, { align: 'center' })
      doc.text(
        `Date de signature : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        pageW / 2, 143, { align: 'center' }
      )
      doc.text(`Version : ${contractMeta.version}`, pageW / 2, 151, { align: 'center' })

      // Bordure décorative
      doc.setDrawColor(201, 168, 76)
      doc.setLineWidth(0.5)
      doc.rect(15, 15, pageW - 30, pageH - 30)

      pages.push(1)

      // ── Pages contrat ─────────────────────────────────────────────────────
      doc.addPage()
      currentPage = 2
      addHeader()

      doc.setFontSize(9)
      doc.setTextColor(50, 50, 50)
      doc.setFont('helvetica', 'normal')

      const lines = doc.splitTextToSize(contractText, contentW)
      let y = marginT + 5

      for (const line of lines) {
        if (y > pageH - marginB - 10) {
          addFooter(currentPage, 999)
          doc.addPage()
          currentPage++
          addHeader()
          y = marginT + 5
        }

        // Détecter les titres (lignes avec ═══)
        if (line.includes('═══') || line.startsWith('ARTICLE') || line.startsWith('ENTRE') || line.startsWith('IL A ETE') || line.startsWith('CONTRAT')) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          doc.setTextColor(26, 26, 26)
        } else {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(60, 60, 60)
        }

        doc.text(line, marginL, y)
        y += 5.5
      }
      addFooter(currentPage, 999)

      // ── Page de certification ─────────────────────────────────────────────
      doc.addPage()
      const certPage = currentPage + 1
      addHeader()

      const cx = pageW / 2
      let cy = 35

      doc.setDrawColor(201, 168, 76)
      doc.setLineWidth(1)
      doc.line(marginL, cy, pageW - marginR, cy)
      cy += 10

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(26, 26, 26)
      doc.text('CERTIFICATION DE SIGNATURE', cx, cy, { align: 'center' })
      cy += 7
      doc.setFontSize(12)
      doc.text('ELECTRONIQUE L&LUI SIGNATURE', cx, cy, { align: 'center' })
      cy += 8

      doc.setLineWidth(1)
      doc.line(marginL, cy, pageW - marginR, cy)
      cy += 12

      const certLines: [string, string][] = [
        ['Signe par', signatoryName],
        ['Qualite', signatoryRole],
        ['Date', new Date(new Date().toISOString()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })],
        ['Heure', new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })],
        ['Numero contrat', contractId],
        ['WhatsApp', partnerWhatsapp],
        ['Validation OTP', 'Code confirme via WhatsApp'],
        ['Version', contractMeta.version],
      ]

      doc.setFontSize(10)
      certLines.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 80, 30)
        doc.text(`${label} :`, marginL + 10, cy)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(26, 26, 26)
        doc.text(value, marginL + 55, cy)
        cy += 8
      })

      cy += 5
      doc.setLineWidth(0.5)
      doc.setDrawColor(201, 168, 76)
      doc.line(marginL, cy, pageW - marginR, cy)
      cy += 8

      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.setFont('helvetica', 'italic')
      doc.text('Valide - Loi camerounaise n°2010/012 du 21 decembre 2010', cx, cy, { align: 'center' })
      cy += 7

      doc.setLineWidth(1)
      doc.setDrawColor(201, 168, 76)
      doc.line(marginL, cy, pageW - marginR, cy)
      cy += 10

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text("L&Lui Signature — Kribi, Cameroun", cx, cy, { align: 'center' })
      cy += 6
      doc.text('llui-signature-hebergements.vercel.app', cx, cy, { align: 'center' })
      cy += 6
      doc.text('+237 693 407 964', cx, cy, { align: 'center' })
      cy += 10

      doc.setLineWidth(0.5)
      doc.line(marginL, cy, pageW - marginR, cy)

      addFooter(certPage, certPage)

      // Corriger les numéros de page en retournant en arrière
      const totalPages = certPage
      for (let p = 2; p <= totalPages; p++) {
        doc.setPage(p)
        const pageStr = `Page ${p}/${totalPages} — Confidentiel`
        doc.setFontSize(8)
        doc.setTextColor(150, 130, 90)
        doc.text(pageStr, marginL, pageH - 10)
      }

      // Générer le base64
      const pdfBase64 = doc.output('datauristring').split(',')[1]

      toast.dismiss('pdf-gen')

      // Upload du PDF
      toast.loading('Sauvegarde du contrat…', { id: 'pdf-upload' })
      const uploadRes = await fetch('/api/upload-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64, contractId, partnerId }),
      })

      let uploadedUrl = ''
      if (uploadRes.ok) {
        const data = await uploadRes.json()
        uploadedUrl = data.url || ''
      }

      toast.dismiss('pdf-upload')

      // Finaliser la signature en Firestore
      const now = new Date().toISOString()
      const finalRes = await finalizeSignature(partnerId, {
        pdfUrl: uploadedUrl,
        userAgent: navigator.userAgent,
        version: contractMeta.version,
        contractId,
      })

      if (!finalRes.success) {
        toast.error(finalRes.error || 'Erreur lors de la finalisation')
        setGeneratingPdf(false)
        return
      }

      setSignedAt(now)
      setPdfUrl(uploadedUrl)

      // Notification WhatsApp partenaire
      const phone = formatPhone(partnerWhatsapp)
      if (phone) {
        const msg = `L&Lui Signature — Confirmation de signature\n\nBonjour ${signatoryName},\n\nVotre contrat de partenariat a ete signe avec succes.\n\nNumero de contrat : ${contractId}\nDate : ${new Date(now).toLocaleDateString('fr-FR')}\n\nMerci de votre confiance.\nL&Lui Signature`
        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
        setTimeout(() => window.open(waUrl, '_blank'), 1000)
      }

      setStep(3)
      toast.success('Contrat signé avec succès !')
    } catch (err: any) {
      toast.dismiss('pdf-gen')
      toast.dismiss('pdf-upload')
      console.error('PDF error:', err)
      toast.error('Erreur lors de la génération du PDF : ' + err.message)
    }

    setGeneratingPdf(false)
  }

  // Déjà signé
  if (alreadySigned && step === 3) {
    return (
      <div className="space-y-4">
        <StepBar current={3} />
        <Step4Success
          contractId={existingContract.contractId}
          signatoryName={existingContract.signatoryName || partnerName}
          pdfUrl={existingContract.pdfUrl || ''}
          signedAt={existingContract.signedAt || new Date().toISOString()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <StepBar current={step} />

      {step === 0 && (
        <Step1Reading
          contractText={contractText}
          contractId={contractId}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <Step2Identification
          partnerName={partnerName}
          partnerWhatsapp={partnerWhatsapp}
          onNext={handleIdentified}
        />
      )}

      {step === 2 && (
        <>
          {generatingPdf ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={32} className="animate-spin text-gold-500" />
              <p className="text-dark/60 text-sm">Génération du contrat PDF en cours…</p>
            </div>
          ) : (
            <Step3OTP
              partnerWhatsapp={partnerWhatsapp}
              onVerified={handleOtpVerified}
              onResend={handleResendOtp}
            />
          )}
        </>
      )}

      {step === 3 && (
        <Step4Success
          contractId={contractId}
          signatoryName={signatoryName}
          pdfUrl={pdfUrl}
          signedAt={signedAt}
        />
      )}
    </div>
  )
}
