'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { CodeSession } from '@/actions/codes-sessions'
import type { ParametresPlateforme } from '@/actions/parametres'
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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
const BOUTIQUE_URL = process.env.NEXT_PUBLIC_BOUTIQUE_URL ?? 'https://l-et-lui-signature.com'

/** Durée d'affichage par défaut si le partenaire n'a pas configuré la sienne (ms). */
const CAROUSEL_INTERVAL_DEFAULT_MS = 6000

interface Props {
  session: CodeSession
  plateformeParams: ParametresPlateforme
  partenaires?: PartenaireAvecLocation[]
}

function formatCode(code: string) {
  return code.slice(0, 3) + ' ' + code.slice(3)
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

  // ── QR scan partenaire depuis la carte ─────────────────────────
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrPartenaire, setQrPartenaire] = useState<string | null>(null)
  const [qrPartenaireNom, setQrPartenaireNom] = useState<string | null>(null)

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

        {/* ── Club VIP L&Lui — Pass VIP ─────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="space-y-4">

            {/* Titre section */}
            <div className="text-center mb-2">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
                L&Lui ✦ Signature
              </p>
              <h3 className="text-lg font-bold text-[#1A1A1A]">Club VIP L&Lui</h3>
              <p className="text-sm text-gray-500 mt-1">
                Choisissez votre Pass et profitez de remises exclusives chez nos partenaires à Kribi.
              </p>
            </div>

            {/* Bouton guide d'utilisation */}
            <a
              href="/notices/guide-pass-vip.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                width: '100%',
                padding: '18px 24px',
                marginBottom: '4px',
                background: 'linear-gradient(135deg, #C9A84C 0%, #D4AF37 100%)',
                color: 'white',
                textAlign: 'center',
                textDecoration: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(201, 168, 76, 0.3)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(201, 168, 76, 0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(201, 168, 76, 0.3)'
              }}
            >
              📖 Guide d&apos;utilisation des Pass VIP
            </a>

            {/* 4 cartes Pass VIP */}
            {([
              {
                grade: 'ARGENT',
                emoji: '🥈',
                duree: '7 jours',
                prix: '3 500 FCFA',
                remise: '6%',
                bg: 'linear-gradient(135deg, #E8E8E8 0%, #A8A9AD 50%, #E8E8E8 100%)',
                textColor: '#1A1A1A',
                url: 'https://l-et-lui-signature.com/produit.html?id=29',
              },
              {
                grade: 'OR',
                emoji: '✦',
                duree: '15 jours',
                prix: '7 500 FCFA',
                remise: '8%',
                bg: 'linear-gradient(135deg, #C9A84C 0%, #F5D17A 40%, #C9A84C 70%, #A07830 100%)',
                textColor: '#FFFFFF',
                url: 'https://l-et-lui-signature.com/produit.html?id=30',
              },
              {
                grade: 'SAPHIR',
                emoji: '💎',
                duree: '30 jours',
                prix: '15 000 FCFA',
                remise: '10%',
                bg: 'linear-gradient(135deg, #0F3460 0%, #0F52BA 50%, #0F3460 100%)',
                textColor: '#FFFFFF',
                url: 'https://l-et-lui-signature.com/produit.html?id=31',
              },
              {
                grade: 'DIAMANT',
                emoji: '👑',
                duree: '30 jours',
                prix: '25 000 FCFA',
                remise: '15%',
                bg: 'linear-gradient(135deg, #1A1A2E 0%, #4A0E8F 40%, #1A1A2E 70%, #6C3483 100%)',
                textColor: '#FFFFFF',
                url: 'https://l-et-lui-signature.com/produit.html?id=32',
              },
            ] as const).map((pass) => (
              <div
                key={pass.grade}
                style={{ background: pass.bg }}
                className="rounded-2xl p-5 shadow-md"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{pass.emoji}</span>
                      <span className="font-bold text-sm tracking-wide" style={{ color: pass.textColor }}>
                        {pass.grade}
                      </span>
                    </div>
                    <p className="text-xs opacity-80" style={{ color: pass.textColor }}>
                      {pass.duree}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold" style={{ color: pass.textColor }}>
                      -{pass.remise}
                    </p>
                    <p className="text-xs opacity-80" style={{ color: pass.textColor }}>
                      garanti
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold" style={{ color: pass.textColor }}>
                    {pass.prix}
                  </p>
                  <a
                    href={pass.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-white/20 backdrop-blur-sm"
                    style={{ color: pass.textColor, border: `1px solid ${pass.textColor}44` }}
                  >
                    Obtenir ce Pass →
                  </a>
                </div>
              </div>
            ))}

            {/* Note bas de section */}
            <p className="text-xs text-gray-400 text-center pb-2">
              Votre carte s&apos;affiche instantanément après l&apos;achat. Aucune inscription requise.
            </p>

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
              setQrPartenaire(partenaire_id)
              setQrPartenaireNom(partenaires.find(p => p.id === partenaire_id)?.nom ?? null)
              setShowQrModal(true)
            }}
          />
        </div>

      </div>

      {/* Modal QR Scan partenaire */}
      {showQrModal && (
        <QrScanModal
          client_uid=""
          client_tel=""
          partenaire_id_preselect={qrPartenaire}
          partenaire_nom_preselect={qrPartenaireNom}
          onClose={() => { setShowQrModal(false); setQrPartenaire(null); setQrPartenaireNom(null) }}
        />
      )}

    </div>
  )
}
