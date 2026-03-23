'use client'
// components/mariage/MariagePublicClient.tsx — #19 Page mariage publique

import { useState, useEffect } from 'react'

interface ProgrammeItem { heure: string; libelle: string }

interface Props {
  uid: string
  noms_maries: string
  date_mariage: string
  lieu: string
  code_promo: string
  message_bienvenue: string
  programme: ProgrammeItem[]
}

function formatDateLong(iso: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

function useCountdown(dateISO: string) {
  const [t, setT] = useState({ j: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    function update() {
      const diff = new Date(dateISO).getTime() - Date.now()
      if (diff <= 0) { setT({ j: 0, h: 0, m: 0, s: 0 }); return }
      setT({ j: Math.floor(diff / 86400000), h: Math.floor(diff % 86400000 / 3600000), m: Math.floor(diff % 3600000 / 60000), s: Math.floor(diff % 60000 / 1000) })
    }
    update(); const id = setInterval(update, 1000); return () => clearInterval(id)
  }, [dateISO])
  return t
}

const DEFAULT_PROGRAMME: ProgrammeItem[] = [
  { heure: '10h00', libelle: 'Accueil des invités' },
  { heure: '11h00', libelle: 'Cérémonie civile / religieuse' },
  { heure: '12h30', libelle: 'Cocktail & photos' },
  { heure: '14h00', libelle: 'Déjeuner de noces' },
  { heure: '17h00', libelle: 'Gâteau & discours' },
  { heure: '19h00', libelle: 'Soirée dansante' },
]

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

export default function MariagePublicClient({ uid, noms_maries, date_mariage, lieu, code_promo, message_bienvenue, programme }: Props) {
  const [visible, setVisible] = useState(false)
  const { j, h, m, s } = useCountdown(date_mariage)

  useEffect(() => { setTimeout(() => setVisible(true), 100) }, [])

  const prog = programme && programme.length > 0 ? programme : DEFAULT_PROGRAMME
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(lieu)}`
  const rsvpUrl = `${APP_URL}/rsvp/${uid}`
  const fairePartUrl = `${APP_URL}/faire-part/${uid}`
  const boutiqueUrl = `${APP_URL}/boutique?code=${encodeURIComponent(code_promo)}`

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0D0D0D 0%, #1A1A2E 30%, #FAF6EE 30%)' }}>
      {/* Hero section sombre */}
      <div className="px-4 pt-16 pb-32 text-center" style={{ background: 'linear-gradient(160deg, #0D0D0D, #1A1A2E)' }}>
        <div
          className="transition-all duration-1000"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)' }}
        >
          <p className="text-xs tracking-[0.4em] uppercase mb-4" style={{ color: '#C9A84C' }}>Mariage de</p>
          <h1 className="text-4xl font-serif text-white mb-3">{noms_maries || 'Les Mariés'}</h1>
          <p className="text-base mb-1" style={{ color: '#C9A84C' }}>{formatDateLong(date_mariage)}</p>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-white/60">📍 {lieu}</a>
        </div>

        {/* Countdown */}
        {date_mariage && (
          <div className="mt-8 flex justify-center gap-3">
            {[{ v: j, l: 'Jours' }, { v: h, l: 'H' }, { v: m, l: 'Min' }, { v: s, l: 'Sec' }].map(({ v, l }) => (
              <div key={l} className="w-16 rounded-2xl py-3 text-center"
                style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <span className="text-2xl font-bold text-white tabular-nums block">{String(v).padStart(2, '0')}</span>
                <span className="text-[9px] uppercase tracking-wide" style={{ color: '#C9A84C' }}>{l}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contenu cream */}
      <div className="max-w-sm mx-auto px-4 -mt-8 pb-12 space-y-4">
        {/* Message bienvenue */}
        {message_bienvenue && (
          <div className="bg-white rounded-2xl p-5 shadow-xl border border-[#F5F0E8] text-center">
            <p className="text-sm text-[#555] italic">&ldquo;{message_bienvenue}&rdquo;</p>
            <p className="text-xs text-[#C9A84C] mt-2">— {noms_maries}</p>
          </div>
        )}

        {/* CTA RSVP */}
        <a
          href={rsvpUrl}
          className="block w-full py-4 rounded-2xl font-bold text-[#1A1A1A] text-center text-sm shadow-xl"
          style={{ background: 'linear-gradient(90deg, #C9A84C, #E8C87A)' }}
        >
          💌 Confirmer ma présence (RSVP)
        </a>

        {/* Programme */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
          <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-4">Programme de la journée</p>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px" style={{ background: '#C9A84C30' }} />
            <div className="space-y-4">
              {prog.map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <span className="text-xs font-bold w-12 shrink-0 text-right" style={{ color: '#C9A84C' }}>{item.heure}</span>
                  <div className="w-3 h-3 rounded-full border-2 shrink-0 mt-0.5 z-10 bg-white"
                    style={{ borderColor: '#C9A84C' }} />
                  <p className="text-sm text-[#1A1A1A] flex-1">{item.libelle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lieu + Maps */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
          <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">Lieu du mariage</p>
          <p className="font-semibold text-[#1A1A1A] mb-1">📍 {lieu}</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-2.5 rounded-xl text-sm text-center font-semibold mt-3"
            style={{ background: '#F5F0E8', color: '#C9A84C' }}
          >
            🗺️ Voir sur Google Maps
          </a>
        </div>

        {/* Code promo boutique */}
        {code_promo && (
          <div className="rounded-2xl p-5 text-center" style={{ background: '#1A1A1A' }}>
            <p className="text-xs text-white/50 mb-2">Offrez-leur un cadeau</p>
            <p className="text-2xl font-bold tracking-widest mb-1" style={{ color: '#C9A84C' }}>{code_promo}</p>
            <p className="text-xs text-white/40 mb-3">Code privilège boutique L&Lui Signature</p>
            <a
              href={boutiqueUrl}
              className="block py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#C9A84C', color: '#1A1A1A' }}
            >
              🛍️ Découvrir la boutique
            </a>
          </div>
        )}

        {/* Liens utiles */}
        <div className="flex gap-3">
          <a href={fairePartUrl}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-center border"
            style={{ border: '1px solid #C9A84C', color: '#C9A84C' }}>
            📜 Faire-part
          </a>
          <a href={`${APP_URL}/save-the-date/${uid}`}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-center border"
            style={{ border: '1px solid #C9A84C', color: '#C9A84C' }}>
            📅 Save the date
          </a>
          <a href={`${APP_URL}/guide-kribi`}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-center border"
            style={{ border: '1px solid #C9A84C', color: '#C9A84C' }}>
            🌊 Guide Kribi
          </a>
        </div>

        <p className="text-center text-xs text-[#AAA]">L&Lui Signature 💛 — Organisateur de mariages</p>
      </div>
    </div>
  )
}
