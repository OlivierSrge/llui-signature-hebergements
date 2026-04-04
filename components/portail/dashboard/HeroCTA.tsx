'use client'
// HERO REDESIGN — Style "Velvet & Vow" — Photo couple en avant-plan + Countdown premium

import { useEffect, useRef, useState } from 'react'
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
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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

  // Upload rapide depuis le hero
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { showToast('Format non supporté (jpg, png, webp)'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('Fichier trop lourd (5 Mo max)'); return }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/portail/photo-mariage', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur upload')
      showToast('✓ Photo mise à jour — rafraîchissez pour voir')
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur upload')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const jours = identity.jours_avant_mariage
  const noms = identity.noms_maries
  const lieu = identity.lieu
  const photoUrl = identity.photo_url

  const dateMariageLabel = jours !== null && jours >= 0
    ? (() => {
        const d = new Date()
        d.setDate(d.getDate() + jours)
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      })()
    : null

  const isJourJ = jours === 0
  const isApres = jours !== null && jours < 0

  return (
    <div className="space-y-3">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg text-center max-w-xs" style={{ background: '#2C1810' }}>
          {toast}
        </div>
      )}

      {/* ══ PHOTO DU COUPLE ══════════════════════════════════════════════════ */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ height: 250, boxShadow: '0 8px 32px rgba(44,24,16,0.18)' }}
      >
        {photoUrl ? (
          <>
            {/* Photo en premier plan, pleine largeur */}
            <img
              src={photoUrl}
              alt="Photo du couple"
              className="w-full h-full object-cover"
            />

            {/* Dégradé subtil en bas pour transition avec le hero */}
            <div
              aria-hidden
              className="absolute bottom-0 left-0 right-0"
              style={{ height: 80, background: 'linear-gradient(to top, rgba(44,24,16,0.6) 0%, transparent 100%)' }}
            />

            {/* Bouton modifier photo — discret en haut à droite */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: 'rgba(44,24,16,0.7)', backdropFilter: 'blur(4px)', border: '1px solid rgba(212,175,55,0.4)' }}
              title="Modifier la photo"
            >
              {uploading ? (
                <div className="w-3.5 h-3.5 border border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
              ) : (
                <span style={{ color: '#D4AF37', fontSize: 13 }}>✏️</span>
              )}
            </button>

            {/* Badge noms en bas de la photo */}
            {noms && noms !== 'Mon mariage' && (
              <div className="absolute bottom-3 left-3">
                <p className="text-white font-serif italic text-sm font-semibold drop-shadow-lg">{noms}</p>
              </div>
            )}
          </>
        ) : (
          /* Placeholder — pas encore de photo */
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full h-full flex flex-col items-center justify-center gap-3 transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: 'linear-gradient(160deg, #EDD5CC 0%, #E8C4B8 100%)' }}
          >
            {uploading ? (
              <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                  style={{ background: 'rgba(44,24,16,0.12)', border: '2px dashed rgba(212,175,55,0.5)' }}
                >
                  📷
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: '#2C1810' }}>Ajouter votre photo</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#6B4F4F' }}>JPG, PNG ou WEBP · 5 Mo max</p>
                </div>
                <span
                  className="px-4 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: '#D4AF37', color: '#1A1A1A' }}
                >
                  Choisir une photo
                </span>
              </>
            )}
          </button>
        )}

        {/* Input file caché */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </div>

      {/* ══ HERO COUNTDOWN ══════════════════════════════════════════════════ */}
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #2C1810 0%, #4A2828 40%, #2C1810 100%)',
          minHeight: 220,
        }}
      >
        {/* Motif décoratif doré */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, opacity: 0.06,
            backgroundImage: `radial-gradient(circle at 20% 50%, #D4AF37 1px, transparent 1px),
                              radial-gradient(circle at 80% 20%, #D4AF37 1px, transparent 1px),
                              radial-gradient(circle at 60% 80%, #D4AF37 1px, transparent 1px)`,
            backgroundSize: '60px 60px, 80px 80px, 50px 50px',
          }}
        />
        {/* Halo rose poudré */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: -80, left: '50%',
            transform: 'translateX(-50%)',
            width: 320, height: 320, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,196,184,0.18) 0%, transparent 70%)',
          }}
        />

        {/* Contenu */}
        <div className="relative z-10 px-6 py-7 flex flex-col items-center text-center">
          {/* Badge */}
          <div className="mb-4">
            <span
              className="text-[10px] font-semibold tracking-[0.2em] uppercase px-3 py-1 rounded-full"
              style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
            >
              L&amp;Lui Signature
            </span>
          </div>

          {/* Countdown */}
          {isJourJ ? (
            <div className="mb-3">
              <p className="text-6xl font-bold mb-1" style={{ color: '#D4AF37' }}>🎉</p>
              <p className="text-2xl font-serif font-bold text-white">C&apos;est aujourd&apos;hui !</p>
            </div>
          ) : isApres ? (
            <div className="mb-3">
              <p className="text-5xl font-bold mb-1" style={{ color: '#D4AF37' }}>✨</p>
              <p className="text-xl font-serif font-bold text-white">Félicitations !</p>
            </div>
          ) : (
            <div className="mb-3">
              <div className="inline-flex flex-col items-center">
                {jours !== null ? (
                  <>
                    <span
                      className="font-serif font-bold leading-none"
                      style={{ fontSize: 72, color: '#D4AF37', textShadow: '0 0 40px rgba(212,175,55,0.3)' }}
                    >
                      J-{jours}
                    </span>
                    <p className="text-white/50 text-xs tracking-widest uppercase mt-1">
                      {jours === 1 ? 'demain' : `${jours} jours`}
                    </p>
                  </>
                ) : (
                  <span className="font-serif font-bold text-5xl" style={{ color: '#D4AF37' }}>—</span>
                )}
              </div>
            </div>
          )}

          {/* Séparateur ornemental */}
          <div className="flex items-center gap-2 mb-3 w-full max-w-[200px]">
            <div className="flex-1 h-px" style={{ background: 'rgba(212,175,55,0.3)' }} />
            <span style={{ color: 'rgba(212,175,55,0.6)', fontSize: 10 }}>✦</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(212,175,55,0.3)' }} />
          </div>

          {/* Noms */}
          {noms && noms !== 'Mon mariage' ? (
            <p className="font-serif italic font-semibold text-white mb-1" style={{ fontSize: 18, letterSpacing: '0.02em' }}>
              {noms}
            </p>
          ) : (
            <p className="font-serif italic text-white/40 mb-1 text-base">Vos prénoms ici</p>
          )}

          {/* Lieu + Date */}
          <p className="text-white/40 text-xs mb-5">
            {lieu || 'Kribi, Cameroun'}
            {dateMariageLabel && <> · {dateMariageLabel}</>}
          </p>

          {/* Barre de progression */}
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-[10px] mb-1.5">
              <span className="text-white/40">Préparation</span>
              <span style={{ color: '#D4AF37' }} className="font-semibold">{pctPrep}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pctPrep}%`, background: 'linear-gradient(90deg, #D4AF37, #F0D060)' }}
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
          style={{ color: '#D4AF37' }}
        >
          <span>⚙️</span> Paramétrer mon mariage
        </a>
      </div>

      {/* ══ CTA BOUTIQUE + HÉBERGEMENTS ══════════════════════════════════════ */}
      <div
        className="rounded-2xl p-4 shadow-sm"
        style={{ background: '#F9F5F2', border: '1px solid rgba(212,175,55,0.25)' }}
      >
        <p className="font-serif text-center text-sm font-semibold mb-3" style={{ color: '#1A1A1A' }}>
          Composez votre mariage ✨
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Boutique */}
          <button
            onClick={openBoutique}
            className="rounded-2xl p-4 flex flex-col items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 w-full relative overflow-hidden"
            style={{ background: '#1A1A1A' }}
          >
            <div aria-hidden style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(212,175,55,0.08)' }} />
            <span style={{ fontSize: 22 }}>🛍️</span>
            <p className="text-xs font-bold text-center leading-tight" style={{ color: '#D4AF37' }}>
              Boutique<br />L&amp;Lui Signature
            </p>
            <p className="text-[9px] text-white/40 text-center">26 prestations</p>
          </button>

          {/* Hébergements */}
          <button
            onClick={openHebergements}
            className="rounded-2xl p-4 flex flex-col items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 w-full relative overflow-hidden"
            style={{ background: '#D4AF37' }}
          >
            <div aria-hidden style={{ position: 'absolute', bottom: -15, left: -15, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
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
            style={{ background: '#F5E8E4', border: '1px solid rgba(212,175,55,0.25)' }}
          >
            <div>
              <p className="text-xs font-semibold text-[#1A1A1A]">
                🛒 Mon Panier — {totaux.nb_articles} article{totaux.nb_articles > 1 ? 's' : ''}
              </p>
              <p className="text-[10px] text-[#6B4F4F]">{formatFCFA(totaux.total_ht)}</p>
            </div>
            <a href="/portail/panier" className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white" style={{ background: '#2C1810' }}>
              Voir →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
