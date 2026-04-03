'use client'
// HERO REDESIGN — Style "Velvet & Vow" — Countdown premium + noms mariés + CTA

import { useEffect, useState } from 'react'
import { useClientIdentity } from '@/hooks/useClientIdentity'
import { usePanier } from '@/hooks/usePanier'
import { getCodePromoUrl } from '@/lib/generatePromoCode'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

interface Props { uid: string; todosDone: number; todosTotal: number }

export default function HeroCTA({ uid, todosDone, todosTotal }: Props) {
  const identity = useClientIdentity()
  const { totaux } = usePanier(uid)
  const pctPrep = todosTotal > 0 ? Math.round((todosDone / todosTotal) * 100) : 0
  const [toast, setToast] = useState('')

  // Tick secondes pour l'effet "live"
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  function openBoutique() {
    const url = identity.code_promo
      ? getCodePromoUrl(identity.code_promo, identity.uid || uid, 'boutique')
      : `https://letlui-signature.netlify.app?ref=${identity.uid || uid}`
    window.open(url, '_blank', 'noopener,noreferrer')
    showToast('Boutique ouverte ! Revenez ici pour enregistrer vos achats.')
  }

  function openHebergements() {
    const url = identity.code_promo
      ? getCodePromoUrl(identity.code_promo, identity.uid || uid, 'hebergement')
      : `https://llui-signature-hebergements.vercel.app/hebergements?ref=${identity.uid || uid}`
    window.open(url, '_blank', 'noopener,noreferrer')
    showToast('Site hébergements ouvert ! Revenez ici pour enregistrer votre réservation.')
  }

  const jours = identity.jours_avant_mariage
  const noms = identity.noms_maries
  const lieu = identity.lieu
  const photoUrl = identity.photo_url

  // Date approximative du mariage calculée à partir du compte à rebours
  const dateMariageLabel = jours !== null && jours >= 0
    ? (() => {
        const d = new Date()
        d.setDate(d.getDate() + jours)
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      })()
    : null

  // Statut du jour J
  const isJourJ = jours === 0
  const isApres = jours !== null && jours < 0
  const isAvant = jours !== null && jours > 0

  return (
    <div className="space-y-3">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-xs px-4 py-2.5 rounded-xl shadow-lg text-center max-w-xs">
          {toast}
        </div>
      )}

      {/* ══ HERO COUNTDOWN ══════════════════════════════════════════════════ */}
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #1A1A1A 0%, #2C1F0E 50%, #1A1A1A 100%)',
          minHeight: 260,
        }}
      >
        {/* Photo de mariage en background si disponible */}
        {photoUrl && (
          <>
            <img
              src={photoUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0.35 }}
            />
            {/* Dégradé sombre pour garder le texte lisible */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: 'linear-gradient(160deg, rgba(26,26,26,0.85) 0%, rgba(44,31,14,0.75) 50%, rgba(26,26,26,0.85) 100%)' }}
            />
          </>
        )}

        {/* Motif décoratif doré en fond (masqué si photo présente) */}
        {!photoUrl && (
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0, opacity: 0.06,
              backgroundImage: `radial-gradient(circle at 20% 50%, #C9A84C 1px, transparent 1px),
                                radial-gradient(circle at 80% 20%, #C9A84C 1px, transparent 1px),
                                radial-gradient(circle at 60% 80%, #C9A84C 1px, transparent 1px)`,
              backgroundSize: '60px 60px, 80px 80px, 50px 50px',
            }}
          />
        )}

        {/* Dégradé arc doré */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -80, left: '50%',
            transform: 'translateX(-50%)',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Contenu */}
        <div className="relative z-10 px-6 py-8 flex flex-col items-center text-center">
          {/* Badge L&Lui */}
          <div className="mb-5">
            <span
              className="text-[10px] font-semibold tracking-[0.2em] uppercase px-3 py-1 rounded-full"
              style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }}
            >
              L&amp;Lui Signature
            </span>
          </div>

          {/* Countdown principal */}
          {isJourJ ? (
            <div className="mb-4">
              <p className="text-6xl font-bold mb-1" style={{ color: '#C9A84C' }}>🎉</p>
              <p className="text-2xl font-serif font-bold text-white">C&apos;est aujourd&apos;hui !</p>
            </div>
          ) : isApres ? (
            <div className="mb-4">
              <p className="text-5xl font-bold mb-1" style={{ color: '#C9A84C' }}>✨</p>
              <p className="text-xl font-serif font-bold text-white">Félicitations !</p>
            </div>
          ) : (
            <div className="mb-3">
              {/* Grand J-X */}
              <div className="relative inline-flex flex-col items-center">
                {jours !== null ? (
                  <>
                    <span
                      className="font-serif font-bold leading-none"
                      style={{ fontSize: 80, color: '#C9A84C', textShadow: '0 0 40px rgba(201,168,76,0.3)' }}
                    >
                      J-{jours}
                    </span>
                    <p className="text-white/50 text-xs tracking-widest uppercase mt-1">
                      {jours === 1 ? 'demain' : `${jours} jours`}
                    </p>
                  </>
                ) : (
                  <span className="font-serif font-bold text-5xl" style={{ color: '#C9A84C' }}>
                    —
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Séparateur ornemental */}
          <div className="flex items-center gap-2 mb-3 w-full max-w-[200px]">
            <div className="flex-1 h-px" style={{ background: 'rgba(201,168,76,0.3)' }} />
            <span style={{ color: 'rgba(201,168,76,0.6)', fontSize: 10 }}>✦</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(201,168,76,0.3)' }} />
          </div>

          {/* Noms des mariés */}
          {noms ? (
            <p
              className="font-serif italic font-semibold text-white mb-1"
              style={{ fontSize: 20, letterSpacing: '0.02em' }}
            >
              {noms}
            </p>
          ) : (
            <p className="font-serif italic text-white/40 mb-1 text-base">
              Vos prénoms ici
            </p>
          )}

          {/* Lieu + Date */}
          <p className="text-white/40 text-xs mb-5">
            {lieu || 'Kribi, Cameroun'}
            {dateMariageLabel && <> · {dateMariageLabel}</>}
          </p>

          {/* Barre de progression préparation */}
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-[10px] mb-1.5">
              <span className="text-white/40">Préparation</span>
              <span style={{ color: '#C9A84C' }} className="font-semibold">{pctPrep}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pctPrep}%`,
                  background: 'linear-gradient(90deg, #C9A84C, #E8C87A)',
                }}
              />
            </div>
            <p className="text-white/25 text-[9px] mt-1 text-center">
              {todosDone}/{todosTotal} tâches complétées
            </p>
          </div>
        </div>
      </div>

      {/* Lien paramètres */}
      <div className="text-center -mt-1">
        <a
          href="/portail/parametres"
          className="inline-flex items-center gap-1 text-xs transition-colors"
          style={{ color: '#C9A84C' }}
        >
          <span>⚙️</span> Paramétrer mon mariage
        </a>
      </div>

      {/* ══ CTA BOUTIQUE + HÉBERGEMENTS ══════════════════════════════════════ */}
      <div
        className="rounded-2xl p-4 shadow-sm"
        style={{ background: '#fff', border: '1px solid rgba(201,168,76,0.15)' }}
      >
        <p
          className="font-serif text-center text-sm font-semibold mb-3"
          style={{ color: '#1A1A1A' }}
        >
          Composez votre mariage ✨
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Boutique */}
          <button
            onClick={openBoutique}
            className="rounded-2xl p-4 flex flex-col items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 w-full relative overflow-hidden"
            style={{ background: '#1A1A1A' }}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute', top: -20, right: -20,
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(201,168,76,0.08)',
              }}
            />
            <span style={{ fontSize: 22 }}>🛍️</span>
            <p className="text-xs font-bold text-center leading-tight" style={{ color: '#C9A84C' }}>
              Boutique<br />L&amp;Lui Signature
            </p>
            <p className="text-[9px] text-white/40 text-center">26 prestations</p>
          </button>

          {/* Hébergements */}
          <button
            onClick={openHebergements}
            className="rounded-2xl p-4 flex flex-col items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 w-full relative overflow-hidden"
            style={{ background: '#C9A84C' }}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute', bottom: -15, left: -15,
                width: 70, height: 70, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
              }}
            />
            <span style={{ fontSize: 22 }}>🏡</span>
            <p className="text-xs font-bold text-[#1A1A1A] text-center leading-tight">
              Sélection<br />Hébergements
            </p>
            <p className="text-[9px] text-[#1A1A1A]/50 text-center">Kribi &amp; environs</p>
          </button>
        </div>

        {/* Panier si articles */}
        {totaux.nb_articles > 0 && (
          <div
            className="flex items-center justify-between rounded-xl px-3 py-2.5"
            style={{ background: '#F5F0E8', border: '1px solid rgba(201,168,76,0.25)' }}
          >
            <div>
              <p className="text-xs font-semibold text-[#1A1A1A]">
                🛒 Mon Panier — {totaux.nb_articles} article{totaux.nb_articles > 1 ? 's' : ''}
              </p>
              <p className="text-[10px] text-[#888]">{formatFCFA(totaux.total_ht)}</p>
            </div>
            <a
              href="/portail/panier"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
              style={{ background: '#1A1A1A' }}
            >
              Voir →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
