'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { CodeSession } from '@/actions/codes-sessions'
import type { ParametresPlateforme } from '@/actions/parametres'
import type { ClientFidelite, TransactionFidelite, StarsMode } from '@/actions/stars'
import { requestOtp, verifyOtpAndLinkClient, getPendingTransaction, spendPointsRequest } from '@/actions/stars'
import { generateStarsQrToken } from '@/actions/stars-qr-token'
import ElectronicPass from '@/components/ElectronicPass'
import Link from 'next/link'
import Image from 'next/image'
import type { PartenaireAvecLocation } from '@/types/geolocation'

const PartenairesMap = dynamic(
  () => import('@/components/PartenairesMap'),
  { ssr: false, loading: () => (
    <div className="h-64 bg-[#F5F0E8] rounded-2xl animate-pulse flex items-center justify-center text-[#1A1A1A]/30 text-sm">
      Chargement de la carte...
    </div>
  )}
)

const QrScanModal = dynamic(() => import('@/components/QrScanModal'), { ssr: false })
const StarsQrCard = dynamic(() => import('@/components/StarsQrCard'), { ssr: false })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
const BOUTIQUE_URL = process.env.NEXT_PUBLIC_BOUTIQUE_URL ?? 'https://l-et-lui-signature.com'

/** Durée d'affichage par défaut si le partenaire n'a pas configuré la sienne (ms). */
const CAROUSEL_INTERVAL_DEFAULT_MS = 6000

interface Props {
  session: CodeSession
  plateformeParams: ParametresPlateforme
  partenaires?: PartenaireAvecLocation[]
}

type LoyaltyStep = 'idle' | 'phone' | 'otp_sent' | 'verified'

function formatCode(code: string) {
  return code.slice(0, 3) + ' ' + code.slice(3)
}

function normalizeTel(t: string): string {
  t = t.replace(/[\s\-().]/g, '')
  if (t.startsWith('00')) t = '+' + t.slice(2)
  if (/^237\d{8,9}$/.test(t)) t = '+' + t
  if (!t.startsWith('+')) t = '+237' + t
  return t
}

function getBarreColor(heures: number) {
  if (heures > 24) return 'bg-green-500'
  if (heures > 6) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function SejourClient({ session, plateformeParams, partenaires = [] }: Props) {
  const expireAt = new Date(session.expire_at)
  const [maintenant, setMaintenant] = useState(new Date())

  // ── Tous les hooks ici, avant tout return conditionnel ──────────
  const slides = session.carouselImages?.filter(Boolean) ?? []
  const [slideIdx, setSlideIdx] = useState(0)

  // ── Stars — programme de fidélité ───────────────────────────────
  const [loyaltyStep, setLoyaltyStep] = useState<LoyaltyStep>('idle')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loyaltyLoading, setLoyaltyLoading] = useState(false)
  const [loyaltyError, setLoyaltyError] = useState('')
  const [clientData, setClientData] = useState<ClientFidelite | null>(null)
  const [pendingTx, setPendingTx] = useState<TransactionFidelite | null>(null)
  const [starsMode, setStarsMode] = useState<StarsMode>('earn')
  const [pointsToSpend, setPointsToSpend] = useState('')
  const [spendLoading, setSpendLoading] = useState(false)
  const [spendResult, setSpendResult] = useState<{ success: boolean; reductionFcfa?: number; error?: string } | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrPartenaire, setQrPartenaire] = useState<string | null>(null)
  const [qrPartenaireNom, setQrPartenaireNom] = useState<string | null>(null)

  // ── QR Code personnel client ────────────────────────────────────
  const [myQrToken, setMyQrToken] = useState<string | null>(null)
  const [myQrExpiresAt, setMyQrExpiresAt] = useState<string | null>(null)
  const [myQrDisplayName, setMyQrDisplayName] = useState('')
  const [myQrLoading, setMyQrLoading] = useState(false)
  const [myQrError, setMyQrError] = useState('')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setMaintenant(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (slides.length <= 1) return
    const intervalMs = (session.carousel_interval_sec ?? 6) * 1000 || CAROUSEL_INTERVAL_DEFAULT_MS
    const t = setInterval(() => setSlideIdx((i) => (i + 1) % slides.length), intervalMs)
    return () => clearInterval(t)
  }, [slides.length])

  // ── (countdown QR géré dans StarsQrCard via onExpired callback) ─

  const msRestants = Math.max(0, expireAt.getTime() - maintenant.getTime())
  const heuresRestantes = msRestants / 3600000
  const pct = Math.min(100, (msRestants / (48 * 3600000)) * 100)

  const hh = Math.floor(msRestants / 3600000)
  const mm = Math.floor((msRestants % 3600000) / 60000)
  const ss = Math.floor((msRestants % 60000) / 1000)
  const compteARebours = `${hh}h ${String(mm).padStart(2, '0')}min ${String(ss).padStart(2, '0')}s`

  const estExpire = maintenant >= expireAt
  const estEpuise = session.statut === 'epuise' || session.nb_utilisations >= session.max_utilisations
  const restantes = session.max_utilisations - session.nb_utilisations

  const urlSejour = `${APP_URL}/sejour/${session.code}`
  const urlHebergements = `/hebergements?code=${session.code}`
  const urlBoutique = `${BOUTIQUE_URL}?code=${session.code}`

  const msgWhatsApp = encodeURIComponent(
    `J'ai un code L&Lui Signature !\nCode : ${session.code}\nValable ${hh}h ${mm}min — ${restantes} utilisations restantes\n🏠 Hébergements + 🛍️ Boutique à Kribi\n→ ${urlSejour}\n— Partagé depuis ${session.nom_partenaire}`
  )

  // Écran — code épuisé
  if (estEpuise) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-serif font-semibold text-[#1A1A1A] mb-2">Code entièrement utilisé</h1>
          <p className="text-sm text-[#1A1A1A]/60 mb-2">
            Votre code <strong>{formatCode(session.code)}</strong> a été utilisé 5 fois. Bravo !
          </p>
          <p className="text-sm text-[#1A1A1A]/60 mb-6">
            Repassez chez <strong>{session.nom_partenaire}</strong> pour obtenir un nouveau code.
          </p>
          <div className="space-y-3">
            <Link href="/hebergements" className="block py-3 bg-[#C9A84C] text-white font-semibold rounded-xl text-sm">
              🏠 Voir nos hébergements
            </Link>
            <a href={BOUTIQUE_URL} target="_blank" rel="noreferrer"
              className="block py-3 border-2 border-[#C9A84C] text-[#C9A84C] font-semibold rounded-xl text-sm">
              🛍️ Visiter la boutique
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Écran — code expiré
  if (estExpire || session.statut === 'expire') {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
          <div className="text-4xl mb-4">⏰</div>
          <h1 className="text-xl font-serif font-semibold text-[#1A1A1A] mb-2">Code expiré</h1>
          <p className="text-sm text-[#1A1A1A]/60 mb-2">
            Votre code <strong>{formatCode(session.code)}</strong> n&apos;est plus valide.
          </p>
          <p className="text-sm text-[#1A1A1A]/60 mb-6">
            Repassez chez <strong>{session.nom_partenaire}</strong> pour obtenir un nouveau code promo.
          </p>
          <Link href="/hebergements" className="block py-3 bg-[#C9A84C] text-white font-semibold rounded-xl text-sm">
            🏠 Voir nos hébergements
          </Link>
        </div>
      </div>
    )
  }

  // ── Handlers Stars ─────────────────────────────────────────────

  async function handleGenerateMyQr() {
    const p = prenom.trim()
    const n = nom.trim()
    const tel = clientData?.telephone ?? normalizeTel(phone.trim())
    if (!phone.trim() || p.length < 2 || n.length < 2 || myQrLoading) {
      setMyQrError('Veuillez saisir votre prénom et nom (min. 2 caractères chacun)')
      return
    }
    setMyQrLoading(true)
    setMyQrError('')
    const result = await generateStarsQrToken(tel, p, n)
    if (result.success) {
      setMyQrToken(result.token)
      setMyQrExpiresAt(result.expiresAt)
      setMyQrDisplayName(result.displayName)
    } else {
      setMyQrError(result.error ?? 'Erreur lors de la génération')
    }
    setMyQrLoading(false)
  }

  async function handleSendOtp() {
    if (!phone.trim()) return
    setLoyaltyLoading(true)
    setLoyaltyError('')
    const res = await requestOtp(phone.trim(), session.code)
    setLoyaltyLoading(false)
    if (res.success) {
      setLoyaltyStep('otp_sent')
    } else {
      setLoyaltyError(res.error ?? 'Erreur lors de l\'envoi')
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) return
    setLoyaltyLoading(true)
    setLoyaltyError('')
    const res = await verifyOtpAndLinkClient(phone.trim(), otp.trim(), session.code)
    setLoyaltyLoading(false)
    if (res.success && res.client) {
      setClientData(res.client)
      setLoyaltyStep('verified')
      // Charger transaction pending éventuelle
      const tx = await getPendingTransaction(session.code)
      setPendingTx(tx)
    } else {
      setLoyaltyError(res.error ?? 'Code incorrect')
    }
  }

  async function handleSpendRequest() {
    if (!clientData || !session.prescripteur_partenaire_id) return
    const pts = parseInt(pointsToSpend.replace(/\D/g, ''), 10)
    if (!pts || pts <= 0) return
    setSpendLoading(true)
    setSpendResult(null)
    const res = await spendPointsRequest({
      clientId: clientData.telephone,
      partnerId: session.prescripteur_partenaire_id,
      pointsToUse: pts,
    })
    setSpendLoading(false)
    setSpendResult(res)
  }

  // Écran — code actif
  const prioriteBoutique = session.redirection_prioritaire === 'boutique'
  const estHotelOuResidence = session.type_partenaire === 'hotel' || session.type_partenaire === 'residence'

  const BoutonHebergement = ({ prioritaire }: { prioritaire: boolean }) => (
    <Link href={urlHebergements}
      className={`block rounded-2xl p-4 text-left transition-all ${prioritaire ? 'bg-[#C9A84C] text-white shadow-lg' : 'bg-[#F5F0E8] text-[#1A1A1A]'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-sm">🏠 Réserver un hébergement</span>
        {prioritaire && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Prioritaire ⭐</span>}
      </div>
      <p className="text-xs opacity-70">Code appliqué automatiquement</p>
    </Link>
  )

  const BoutonBoutique = ({ prioritaire }: { prioritaire: boolean }) => (
    <a href={urlBoutique} target="_blank" rel="noreferrer"
      className={`block rounded-2xl p-4 text-left transition-all ${prioritaire ? 'bg-[#C9A84C] text-white shadow-lg' : 'bg-[#F5F0E8] text-[#1A1A1A]'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-sm">🛍️ Visiter la boutique</span>
        {prioritaire && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Prioritaire ⭐</span>}
      </div>
      <p className="text-xs opacity-70">Votre code promo partenaires L&amp;Lui Signature à Kribi : {formatCode(session.code)}</p>
    </a>
  )

  return (
    <div className="min-h-screen bg-[#F5F0E8] px-4 py-8">
<div className="max-w-sm mx-auto space-y-4">
        {/* Entête */}
        <div className="text-center">
          <p className="text-xs font-medium text-[#C9A84C] uppercase tracking-widest mb-1">L&Lui Signature ✨</p>
          <h1 className="text-lg font-serif font-semibold text-[#1A1A1A]">
            <strong>{session.nom_partenaire}</strong> vous offre
          </h1>
          <p className="text-sm text-[#1A1A1A]/60">une expérience exclusive à Kribi</p>
        </div>

        {/* Vitrine partenaire */}
        {slides.length > 0 ? (
          /* Carrousel (dès qu'il y a des images, peu importe subscriptionLevel) */
          <div className="relative w-full rounded-2xl overflow-hidden shadow-sm bg-[#1A1A1A]"
            style={{ paddingBottom: '56.25%' /* ratio 16/9 compatible tous navigateurs */ }}>
            {slides.map((url, i) => (
              <div key={i}
                className="absolute inset-0 transition-opacity duration-700"
                style={{ opacity: i === slideIdx ? 1 : 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${session.nom_partenaire} – photo ${i + 1}`}
                  className="w-full h-full object-cover" />
              </div>
            ))}
            {/* Logo overlay */}
            {session.photoUrl && (
              <div className="absolute bottom-2 left-2 w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={session.photoUrl} alt="Logo" className="w-full h-full object-cover" />
              </div>
            )}
            {/* Indicateurs dots */}
            {slides.length > 1 && (
              <div className="absolute bottom-2 right-2 flex gap-1">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setSlideIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${i === slideIdx ? 'bg-white w-3' : 'bg-white/50 w-1.5'}`} />
                ))}
              </div>
            )}
          </div>
        ) : session.defaultImage ? (
          /* Image unique */
          <div className="relative w-full rounded-2xl overflow-hidden shadow-sm"
            style={{ paddingBottom: '56.25%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={session.defaultImage} alt={session.nom_partenaire}
              className="absolute inset-0 w-full h-full object-cover" />
            {session.photoUrl && (
              <div className="absolute bottom-2 left-2 w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={session.photoUrl} alt="Logo" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        ) : session.photoUrl ? (
          /* Juste le logo */
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-sm border border-[#F5F0E8]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={session.photoUrl} alt={session.nom_partenaire}
                className="w-full h-full object-cover" />
            </div>
          </div>
        ) : null}

        {/* Code */}
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <p className="text-xs font-semibold text-[#1A1A1A]/50 uppercase tracking-widest mb-3">Bon séjour avec votre code promo</p>
          <div className="text-5xl font-mono font-bold text-[#C9A84C] tracking-[0.3em] mb-4">
            {formatCode(session.code)}
          </div>

          {/* Compte à rebours */}
          <div className="mb-3">
            <p className="text-xs text-[#1A1A1A]/50 mb-1">⏱ Expire dans {compteARebours}</p>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-2 rounded-full transition-all ${getBarreColor(heuresRestantes)}`}
                style={{ width: `${pct}%` }} />
            </div>
          </div>

          <p className="text-xs text-[#1A1A1A]/50 mb-4">
            Utilisations : {session.nb_utilisations}/{session.max_utilisations} restantes
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(session.code)}
              className="flex-1 py-2 bg-[#F5F0E8] text-[#1A1A1A] text-sm font-medium rounded-xl hover:bg-[#ece7db] transition-colors">
              📋 Copier
            </button>
            <a href={`https://wa.me/?text=${msgWhatsApp}`} target="_blank" rel="noreferrer"
              className="flex-1 py-2 bg-green-500 text-white text-sm font-medium rounded-xl hover:bg-green-600 transition-colors text-center">
              📤 WhatsApp
            </a>
          </div>
        </div>

        {/* Avantage */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-[#1A1A1A]/50 uppercase tracking-widest mb-2">Votre avantage</p>
          {session.remise_type === 'reduction_pct' && session.remise_valeur_pct ? (
            <p className="text-sm font-medium text-[#1A1A1A]">
              🎁 <strong>{session.remise_valeur_pct}% de réduction</strong> sur votre réservation
            </p>
          ) : (
            <p className="text-sm font-medium text-[#1A1A1A]">
              🎁 {session.remise_description ?? 'Avantage exclusif partenaire'}
            </p>
          )}
        </div>

        {/* CTA Redirections */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-[#1A1A1A]/50 uppercase tracking-widest mb-3">Que souhaitez-vous faire ?</p>
          <div className="space-y-3">
            {estHotelOuResidence ? (
              <BoutonBoutique prioritaire={true} />
            ) : prioriteBoutique ? (
              <>
                <BoutonBoutique prioritaire={true} />
                <BoutonHebergement prioritaire={false} />
              </>
            ) : (
              <>
                <BoutonHebergement prioritaire={true} />
                <BoutonBoutique prioritaire={false} />
              </>
            )}
          </div>
        </div>

        {/* ── L&Lui Stars — Programme de fidélité ──────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">⭐</span>
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A]">L&Lui Stars</p>
              <p className="text-xs text-[#1A1A1A]/50">Gagnez des points à chaque achat</p>
            </div>
          </div>

          {/* ── Section 1 : QR Code Personnel — TOUJOURS VISIBLE ──── */}
          <div className="space-y-3">
            {myQrLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : myQrToken && myQrExpiresAt ? (
              <StarsQrCard
                clientUid={clientData?.telephone ?? normalizeTel(phone.trim())}
                clientNom={myQrDisplayName || clientData?.telephone || phone}
                clientTel={phone}
                totalStars={clientData?.points_stars ?? 0}
                qrToken={myQrToken}
                expiresAt={myQrExpiresAt}
                onExpired={() => { setMyQrToken(null); setMyQrExpiresAt(null); setMyQrDisplayName('') }}
                onRenew={handleGenerateMyQr}
              />
            ) : (
              <>
                <p className="text-xs font-semibold text-[#1A1A1A]">📱 Mon QR Code Stars</p>
                <p className="text-xs text-[#1A1A1A]/60">
                  Créez votre carte Stars personnelle en quelques secondes.
                </p>
                <input
                  type="text"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Votre prénom *"
                  className="w-full border border-[#F5F0E8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
                />
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Votre nom *"
                  className="w-full border border-[#F5F0E8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !myQrLoading && handleGenerateMyQr()}
                  placeholder="6 XX XX XX XX *"
                  className="w-full border border-[#F5F0E8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
                />
                {myQrError && (
                  <p className="text-xs text-red-500">{myQrError}</p>
                )}
                <button
                  onClick={handleGenerateMyQr}
                  disabled={myQrLoading || !phone.trim() || !prenom.trim() || !nom.trim()}
                  className="w-full py-2.5 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-[#b8963e] transition-colors"
                >
                  {myQrLoading ? 'Génération...' : '📱 Générer mon QR Code'}
                </button>
              </>
            )}
          </div>

          {/* ── Section 2 : Mon Pass / Solde (OTP requis) ───────── */}
          <div className="border-t border-[#F5F0E8] mt-4 pt-4 space-y-3">

            {/* Saisie OTP */}
            {loyaltyStep === 'otp_sent' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#1A1A1A]">⭐ Vérification de votre compte</p>
                <p className="text-xs text-[#1A1A1A]/60">
                  Code à 6 chiffres envoyé au <strong>{phone}</strong> via WhatsApp.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && !loyaltyLoading && handleVerifyOtp()}
                  placeholder="_ _ _ _ _ _"
                  className="w-full border border-[#F5F0E8] rounded-xl px-3 py-2.5 text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:border-[#C9A84C]"
                />
                {loyaltyError && <p className="text-xs text-red-500">{loyaltyError}</p>}
                <button
                  onClick={handleVerifyOtp}
                  disabled={loyaltyLoading || otp.length < 6}
                  className="w-full py-2.5 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-[#b8963e] transition-colors"
                >
                  {loyaltyLoading ? 'Vérification...' : '✅ Confirmer mon code'}
                </button>
                <button
                  onClick={() => { setLoyaltyStep('idle'); setOtp(''); setLoyaltyError('') }}
                  className="w-full py-2 text-xs text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition-colors"
                >
                  Annuler
                </button>
              </div>
            )}

            {/* Vérifié — Pass + Dépenser */}
            {loyaltyStep === 'verified' && clientData && (
              <div className="space-y-4">
                <div className="flex rounded-xl overflow-hidden border border-[#F5F0E8]">
                  <button
                    onClick={() => { setStarsMode('earn'); setSpendResult(null) }}
                    className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                      starsMode === 'earn' ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#1A1A1A]/50 hover:bg-[#F5F0E8]'
                    }`}
                  >
                    ⭐ Mon Pass
                  </button>
                  <button
                    onClick={() => { setStarsMode('spend'); setSpendResult(null); setPointsToSpend('') }}
                    className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                      starsMode === 'spend' ? 'bg-[#C9A84C] text-white' : 'bg-white text-[#1A1A1A]/50 hover:bg-[#F5F0E8]'
                    }`}
                  >
                    🎁 Dépenser mes Stars
                  </button>
                </div>

                {starsMode === 'earn' && (
                  <ElectronicPass
                    client={clientData}
                    params={plateformeParams}
                    pendingTx={pendingTx}
                    avantages={session.avantages_hors_stars}
                    onResendOtp={() => {
                      setLoyaltyStep('idle')
                      setOtp('')
                      setLoyaltyError('')
                    }}
                  />
                )}

                {starsMode === 'spend' && (
                  <div className="space-y-3">
                    <p className="text-xs text-[#1A1A1A]/60">
                      Solde disponible : <strong>{clientData.points_stars.toLocaleString('fr-FR')} ⭐</strong>
                    </p>
                    {spendResult === null && (
                      <div className="space-y-3">
                        <p className="text-xs text-[#1A1A1A]/60">
                          Indiquez le nombre de Stars à utiliser. Le partenaire validera la réduction.
                        </p>
                        <input
                          type="number"
                          value={pointsToSpend}
                          onChange={(e) => setPointsToSpend(e.target.value)}
                          placeholder="Ex : 500"
                          min={1}
                          max={clientData.points_stars}
                          className="w-full border border-[#F5F0E8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
                        />
                        {parseInt(pointsToSpend) > 0 && (
                          <p className="text-xs text-[#C9A84C] font-semibold">
                            ≈ {(parseInt(pointsToSpend) * (plateformeParams.fidelite_valeur_star_fcfa ?? 1)).toLocaleString('fr-FR')} FCFA de réduction
                          </p>
                        )}
                        <button
                          onClick={handleSpendRequest}
                          disabled={spendLoading || !pointsToSpend || parseInt(pointsToSpend) <= 0 || parseInt(pointsToSpend) > clientData.points_stars}
                          className="w-full py-2.5 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-[#b8963e] transition-colors"
                        >
                          {spendLoading ? 'Envoi en cours...' : '🎁 Envoyer la demande au partenaire'}
                        </button>
                      </div>
                    )}
                    {spendResult?.success && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center space-y-2">
                        <div className="text-2xl">✅</div>
                        <p className="text-sm font-bold text-green-700">Demande envoyée !</p>
                        <p className="text-xs text-green-600">
                          Réduction de <strong>{spendResult.reductionFcfa?.toLocaleString('fr-FR')} FCFA</strong> en attente de validation par le partenaire.
                        </p>
                        <button onClick={() => { setSpendResult(null); setPointsToSpend('') }}
                          className="text-xs text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition-colors">
                          Nouvelle demande
                        </button>
                      </div>
                    )}
                    {spendResult !== null && !spendResult.success && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center space-y-2">
                        <div className="text-2xl">❌</div>
                        <p className="text-xs text-red-600">{spendResult.error ?? 'Erreur lors de la demande'}</p>
                        <button onClick={() => setSpendResult(null)}
                          className="text-xs text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition-colors">
                          Réessayer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Idle — lien pour voir le solde */}
            {loyaltyStep === 'idle' && (
              <button
                onClick={handleSendOtp}
                disabled={loyaltyLoading || !phone.trim()}
                className="w-full py-2 text-xs text-[#1A1A1A]/50 hover:text-[#C9A84C] disabled:opacity-40 transition-colors text-center"
              >
                {loyaltyLoading ? 'Envoi...' : '⭐ Voir mon solde Stars →'}
              </button>
            )}
          </div>

        </div>

        {/* ── Carte partenaires Stars ── carte visible à tous les visiteurs */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-[#1A1A1A]">📍 Partenaires Stars à Kribi</h2>
            {partenaires.length > 0 && (
              <span className="text-xs text-[#C9A84C] font-medium">{partenaires.length} partenaire{partenaires.length > 1 ? 's' : ''}</span>
            )}
          </div>
          <p className="text-xs text-[#1A1A1A]/50 mb-3">
            Rendez-vous chez nos partenaires et scannez leur QR code pour gagner des Stars à chaque achat.
          </p>
          <PartenairesMap
            partenaires={partenaires}
            onScanRequest={(partenaire_id) => {
              if (!clientData) { setLoyaltyStep('phone'); return }
              setQrPartenaire(partenaire_id)
              setQrPartenaireNom(partenaires.find(p => p.id === partenaire_id)?.nom ?? null)
              setShowQrModal(true)
            }}
          />
        </div>

      </div>

      {/* Modal QR Scan */}
      {showQrModal && clientData && (
        <QrScanModal
          client_uid={clientData.telephone}
          client_tel={clientData.telephone}
          partenaire_id_preselect={qrPartenaire}
          partenaire_nom_preselect={qrPartenaireNom}
          onClose={() => { setShowQrModal(false); setQrPartenaire(null); setQrPartenaireNom(null) }}
        />
      )}

    </div>
  )
}
