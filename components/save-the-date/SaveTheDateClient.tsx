'use client'
// components/save-the-date/SaveTheDateClient.tsx — #49 Save the date animé — 3 templates

import { useState, useEffect } from 'react'

interface Props {
  marie_uid: string
  noms_maries: string
  date_mariage: string
  lieu: string
  code_promo: string
  template: '1' | '2' | '3'
}

function formatDateLong(iso: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

function joursRestants(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}

function useCountdown(dateISO: string) {
  const [jours, setJours] = useState(0)
  const [heures, setHeures] = useState(0)
  const [minutes, setMinutes] = useState(0)
  const [secondes, setSecondes] = useState(0)

  useEffect(() => {
    function update() {
      const diff = new Date(dateISO).getTime() - Date.now()
      if (diff <= 0) { setJours(0); setHeures(0); setMinutes(0); setSecondes(0); return }
      setJours(Math.floor(diff / 86_400_000))
      setHeures(Math.floor((diff % 86_400_000) / 3_600_000))
      setMinutes(Math.floor((diff % 3_600_000) / 60_000))
      setSecondes(Math.floor((diff % 60_000) / 1_000))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [dateISO])

  return { jours, heures, minutes, secondes }
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl font-bold tabular-nums" style={{ color: '#C9A84C' }}>
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-xs opacity-60 mt-0.5">{label}</span>
    </div>
  )
}

// ── Template 1 : Gold Classic (fond crème, texte sombre) ──────────────────
function TemplateGold({ noms_maries, date_mariage, lieu, shareUrl, visible }: {
  noms_maries: string; date_mariage: string; lieu: string; shareUrl: string; visible: boolean
}) {
  const { jours, heures, minutes, secondes } = useCountdown(date_mariage)
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(160deg, #FAF6EE 0%, #F0E8D0 100%)' }}
    >
      <div
        className="w-full max-w-sm text-center transition-all duration-1000"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)' }}
      >
        <p className="text-xs tracking-[0.3em] uppercase text-[#C9A84C] mb-6">Save the Date</p>
        <div className="w-16 h-px mx-auto mb-6" style={{ background: '#C9A84C' }} />
        <h1 className="text-4xl font-serif text-[#1A1A1A] leading-tight mb-6">
          {noms_maries || 'Les Mariés'}
        </h1>
        <div className="w-16 h-px mx-auto mb-6" style={{ background: '#C9A84C' }} />
        <p className="text-lg text-[#1A1A1A]/80 mb-2">{formatDateLong(date_mariage)}</p>
        <p className="text-sm text-[#1A1A1A]/50 mb-8">📍 {lieu}</p>

        {date_mariage && (
          <div className="flex justify-center gap-6 mb-10 py-4 rounded-2xl"
            style={{ background: '#1A1A1A', color: 'white' }}>
            <CountdownUnit value={jours} label="jours" />
            <div className="text-[#C9A84C] text-2xl self-center">:</div>
            <CountdownUnit value={heures} label="heures" />
            <div className="text-[#C9A84C] text-2xl self-center">:</div>
            <CountdownUnit value={minutes} label="min" />
            <div className="text-[#C9A84C] text-2xl self-center">:</div>
            <CountdownUnit value={secondes} label="sec" />
          </div>
        )}

        <button
          onClick={() => { if (navigator.share) navigator.share({ title: 'Save the Date', url: shareUrl }); else navigator.clipboard.writeText(shareUrl) }}
          className="w-full py-3 rounded-2xl font-semibold text-white text-sm"
          style={{ background: 'linear-gradient(90deg, #C9A84C, #E8C87A)' }}
        >
          📤 Partager via WhatsApp
        </button>
        <p className="text-[10px] text-[#AAA] mt-3">Cliquez pour copier le lien si WhatsApp ne s'ouvre pas</p>
      </div>
    </div>
  )
}

// ── Template 2 : Dark Romance (fond sombre, or) ────────────────────────────
function TemplateDark({ noms_maries, date_mariage, lieu, shareUrl, visible }: {
  noms_maries: string; date_mariage: string; lieu: string; shareUrl: string; visible: boolean
}) {
  const { jours, heures, minutes, secondes } = useCountdown(date_mariage)
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(160deg, #0D0D0D 0%, #1A1A2E 100%)' }}
    >
      <div
        className="w-full max-w-sm text-center transition-all duration-1000"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)' }}
      >
        {/* Cercle décoratif */}
        <div className="w-32 h-32 rounded-full border-2 mx-auto mb-8 flex items-center justify-center"
          style={{ borderColor: '#C9A84C33' }}>
          <div className="w-24 h-24 rounded-full border flex items-center justify-center"
            style={{ borderColor: '#C9A84C66' }}>
            <span className="text-2xl">💍</span>
          </div>
        </div>

        <p className="text-xs tracking-[0.4em] uppercase mb-4" style={{ color: '#C9A84C' }}>Save the Date</p>
        <h1 className="text-3xl font-serif text-white leading-tight mb-4">
          {noms_maries || 'Les Mariés'}
        </h1>
        <p className="text-base mb-1" style={{ color: '#C9A84C' }}>{formatDateLong(date_mariage)}</p>
        <p className="text-sm text-white/40 mb-8">📍 {lieu}</p>

        <div className="flex justify-center gap-4 mb-8">
          {[{ v: jours, l: 'J' }, { v: heures, l: 'H' }, { v: minutes, l: 'M' }, { v: secondes, l: 'S' }].map(({ v, l }) => (
            <div key={l} className="w-14 h-14 rounded-xl flex flex-col items-center justify-center"
              style={{ background: '#C9A84C15', border: '1px solid #C9A84C33' }}>
              <span className="text-xl font-bold text-white tabular-nums">{String(v).padStart(2, '0')}</span>
              <span className="text-[9px]" style={{ color: '#C9A84C' }}>{l}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => { if (navigator.share) navigator.share({ title: 'Save the Date', url: shareUrl }); else navigator.clipboard.writeText(shareUrl) }}
          className="w-full py-3 rounded-2xl font-semibold text-sm"
          style={{ background: '#C9A84C', color: '#1A1A1A' }}
        >
          💫 Partager cet événement
        </button>
      </div>
    </div>
  )
}

// ── Template 3 : Floral Pastel ─────────────────────────────────────────────
function TemplateFloral({ noms_maries, date_mariage, lieu, shareUrl, visible }: {
  noms_maries: string; date_mariage: string; lieu: string; shareUrl: string; visible: boolean
}) {
  const { jours } = useCountdown(date_mariage)
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(160deg, #FFF0F5 0%, #FFF8F0 100%)' }}
    >
      <div
        className="w-full max-w-sm text-center transition-all duration-1000"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.9)' }}
      >
        <div className="text-5xl mb-4">🌸</div>
        <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: '#C96FB0' }}>Vous êtes invité(e)</p>
        <h1 className="text-3xl font-serif text-[#1A1A1A] leading-tight mb-2">
          {noms_maries || 'Les Mariés'}
        </h1>
        <p className="text-sm text-[#888] mb-1">vous souhaitent votre présence</p>
        <div className="w-12 h-px mx-auto my-4" style={{ background: '#C96FB0' }} />
        <p className="text-lg font-semibold text-[#1A1A1A] mb-1">{formatDateLong(date_mariage)}</p>
        <p className="text-sm text-[#888] mb-6">📍 {lieu}</p>

        {date_mariage && (
          <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full mb-8"
            style={{ background: '#C96FB022', border: '1px solid #C96FB033' }}>
            <span className="text-2xl font-bold" style={{ color: '#C96FB0' }}>{jours}</span>
            <span className="text-sm text-[#888]">jours restants</span>
          </div>
        )}

        <div className="text-3xl mb-6">🌺 🌸 🌼</div>

        <button
          onClick={() => { if (navigator.share) navigator.share({ title: 'Save the Date', url: shareUrl }); else navigator.clipboard.writeText(shareUrl) }}
          className="w-full py-3 rounded-2xl font-semibold text-white text-sm"
          style={{ background: 'linear-gradient(90deg, #C96FB0, #E89AD0)' }}
        >
          🌸 Partager l'invitation
        </button>
      </div>
    </div>
  )
}

export default function SaveTheDateClient({ marie_uid, noms_maries, date_mariage, lieu, code_promo, template }: Props) {
  const [visible, setVisible] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState<'1' | '2' | '3'>(template)

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
  const shareUrl = `${APP_URL}/save-the-date/${marie_uid}`

  useEffect(() => { setTimeout(() => setVisible(true), 100) }, [])

  return (
    <div>
      {/* Sélecteur de template (barre en bas) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-white/90 backdrop-blur px-3 py-2 rounded-full shadow-lg border border-gray-100">
        {(['1', '2', '3'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTemplate(t)}
            className="w-8 h-8 rounded-full text-xs font-bold transition-all"
            style={{
              background: activeTemplate === t ? '#C9A84C' : '#F5F0E8',
              color: activeTemplate === t ? 'white' : '#888',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTemplate === '1' && <TemplateGold noms_maries={noms_maries} date_mariage={date_mariage} lieu={lieu} shareUrl={shareUrl} visible={visible} />}
      {activeTemplate === '2' && <TemplateDark noms_maries={noms_maries} date_mariage={date_mariage} lieu={lieu} shareUrl={shareUrl} visible={visible} />}
      {activeTemplate === '3' && <TemplateFloral noms_maries={noms_maries} date_mariage={date_mariage} lieu={lieu} shareUrl={shareUrl} visible={visible} />}
    </div>
  )
}
