'use client'
// components/faire-part/FairePartClient.tsx — #50 Faire-part interactif

import { useState, useEffect } from 'react'

interface Props {
  marie_uid: string
  noms_maries: string
  date_mariage: string
  lieu: string
  code_promo: string
  message_perso: string
}

function formatDateLong(iso: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

function joursRestants(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}

export default function FairePartClient({ marie_uid, noms_maries, date_mariage, lieu, code_promo, message_perso }: Props) {
  const [visible, setVisible] = useState(false)
  const [rsvpClicked, setRsvpClicked] = useState(false)
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
  const rsvpUrl = `${APP_URL}/rsvp/${marie_uid}`
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(lieu)}`
  const jours = joursRestants(date_mariage)

  useEffect(() => { setTimeout(() => setVisible(true), 150) }, [])

  const shareText = `📩 Faire-part de mariage\n${noms_maries}\nLe ${formatDateLong(date_mariage)}\n📍 ${lieu}\n\nRSVP : ${rsvpUrl}`

  function handleShare() {
    if (navigator.share) navigator.share({ title: `Mariage de ${noms_maries}`, text: shareText, url: rsvpUrl })
    else navigator.clipboard.writeText(`${APP_URL}/faire-part/${marie_uid}`)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #FAF6EE 0%, #F0E8D0 60%, #E8D5A3 100%)' }}
    >
      {/* Décoration fond */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-8 left-8 text-5xl opacity-10 rotate-12">🌸</div>
        <div className="absolute top-24 right-6 text-4xl opacity-10 -rotate-12">🌺</div>
        <div className="absolute bottom-16 left-12 text-4xl opacity-10 rotate-6">✨</div>
        <div className="absolute bottom-8 right-8 text-5xl opacity-10">💐</div>
      </div>

      {/* Carte faire-part */}
      <div
        className="w-full max-w-sm relative transition-all duration-1000"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(40px)' }}
      >
        {/* Ornements haut */}
        <div className="text-center mb-2">
          <span className="text-2xl">🕊️</span>
        </div>

        <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl border border-[#C9A84C]/20 p-8 text-center">
          {/* Fioritures */}
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#C9A84C] mb-1">Invitation</p>
          <div className="flex items-center gap-2 justify-center mb-4">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #C9A84C)' }} />
            <span className="text-[#C9A84C] text-lg">♦</span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />
          </div>

          <p className="text-xs text-[#888] mb-3">Nous avons le plaisir de vous inviter à célébrer</p>
          <h1 className="text-3xl font-serif text-[#1A1A1A] leading-tight mb-4">
            {noms_maries || 'Notre Mariage'}
          </h1>

          <div className="flex items-center gap-2 justify-center mb-5">
            <div className="flex-1 h-px bg-[#C9A84C]/30" />
            <span className="text-[#C9A84C] text-sm">💍</span>
            <div className="flex-1 h-px bg-[#C9A84C]/30" />
          </div>

          {/* Date */}
          <div className="mb-4 py-4 rounded-2xl" style={{ background: '#F5F0E8' }}>
            <p className="text-xs text-[#888] uppercase tracking-wide mb-1">Date du mariage</p>
            <p className="font-semibold text-[#1A1A1A]">{formatDateLong(date_mariage)}</p>
            {jours > 0 && (
              <p className="text-xs text-[#C9A84C] mt-1">dans {jours} jour{jours > 1 ? 's' : ''}</p>
            )}
          </div>

          {/* Lieu */}
          <div className="mb-5">
            <p className="text-xs text-[#888] uppercase tracking-wide mb-1">Lieu</p>
            <p className="font-semibold text-[#1A1A1A] mb-1">📍 {lieu}</p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#C9A84C] hover:underline"
            >
              Voir sur Google Maps →
            </a>
          </div>

          {/* Message personnalisé */}
          {message_perso && (
            <div className="mb-5 p-3 rounded-xl italic text-sm text-[#555]"
              style={{ background: '#C9A84C08', border: '1px solid #C9A84C20' }}>
              &ldquo;{message_perso}&rdquo;
            </div>
          )}

          {/* Code promo */}
          {code_promo && (
            <div className="mb-5 p-3 rounded-xl text-center"
              style={{ background: '#1A1A1A', color: 'white' }}>
              <p className="text-[10px] text-white/50 mb-1">Code privilège boutique</p>
              <p className="text-lg font-bold tracking-widest" style={{ color: '#C9A84C' }}>{code_promo}</p>
            </div>
          )}

          {/* Boutons */}
          <div className="space-y-3">
            {!rsvpClicked ? (
              <a
                href={rsvpUrl}
                onClick={() => setRsvpClicked(true)}
                className="block w-full py-3 rounded-2xl font-bold text-white text-sm"
                style={{ background: 'linear-gradient(90deg, #C9A84C, #E8C87A)' }}
              >
                💌 Confirmer ma présence (RSVP)
              </a>
            ) : (
              <div className="py-3 rounded-2xl text-sm font-semibold text-center"
                style={{ background: '#7C9A7E15', color: '#7C9A7E', border: '1px solid #7C9A7E30' }}>
                ✅ Redirection vers le formulaire…
              </div>
            )}

            <button
              onClick={handleShare}
              className="w-full py-2.5 rounded-2xl text-sm font-semibold border"
              style={{ border: '1px solid #C9A84C', color: '#C9A84C' }}
            >
              📤 Partager cet invitation
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-[#888] mt-4">L&Lui Signature — Organisateur du mariage</p>
      </div>
    </div>
  )
}
