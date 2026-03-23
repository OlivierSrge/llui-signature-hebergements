'use client'
// components/portail/jour-j/ModeJourJ.tsx — #172 Mode Jour J

import { useState, useEffect } from 'react'

interface CheckinInvite {
  id: string
  prenom: string
  nom: string
  table?: string
  checked_in: boolean
  heure_arrivee?: string
}

interface Props {
  marie_uid: string
  date_mariage: string
  noms_maries?: string
}

interface ProgrammeItem {
  heure: string
  label: string
  detail?: string
  emoji: string
}

const PROGRAMME_JOUR_J: ProgrammeItem[] = [
  { heure: '09:00', label: 'Préparation de la mariée', emoji: '💄', detail: 'Coiffure, maquillage, habillage' },
  { heure: '10:30', label: 'Préparation du marié', emoji: '🤵', detail: 'Habillage, photographies' },
  { heure: '11:00', label: 'Cérémonie traditionnelle', emoji: '💍', detail: 'Remise de la dot — famille réunie' },
  { heure: '13:00', label: 'Cérémonie civile / religieuse', emoji: '⛪', detail: 'Échange des vœux, signature des registres' },
  { heure: '15:00', label: 'Séance photos officielle', emoji: '📸', detail: 'Couple + famille + témoins' },
  { heure: '16:00', label: 'Accueil des invités — Cocktail', emoji: '🥂', detail: 'Apéritif et cocktail de bienvenue' },
  { heure: '17:00', label: 'Entrée des mariés', emoji: '✨', detail: 'Applaudissements, première danse' },
  { heure: '18:00', label: 'Dîner de mariage', emoji: '🍛', detail: 'Service des plats — spécialités Kribi' },
  { heure: '20:00', label: 'Discours et témoignages', emoji: '🎤', detail: 'Témoins, familles, surprise' },
  { heure: '21:00', label: 'Gâteau et première danse', emoji: '🎂', detail: 'Découpe du gâteau, ouverture du bal' },
  { heure: '22:00', label: 'Soirée dansante', emoji: '🎵', detail: 'DJ / orchestre — piste de danse ouverte' },
  { heure: '02:00', label: 'Fin de soirée', emoji: '🌙', detail: 'Raccompagnement des invités' },
]

function isJourJ(dateMariage: string): boolean {
  if (!dateMariage) return false
  const today = new Date()
  const dm = new Date(dateMariage)
  return today.getFullYear() === dm.getFullYear() &&
    today.getMonth() === dm.getMonth() &&
    today.getDate() === dm.getDate()
}

function getCurrentStep(): number {
  const now = new Date()
  const heureCourante = now.getHours() * 60 + now.getMinutes()
  let current = 0
  for (let i = 0; i < PROGRAMME_JOUR_J.length; i++) {
    const [h, m] = PROGRAMME_JOUR_J[i].heure.split(':').map(Number)
    if (heureCourante >= h * 60 + m) current = i
  }
  return current
}

export default function ModeJourJ({ marie_uid, date_mariage, noms_maries }: Props) {
  const [jourJ] = useState(() => isJourJ(date_mariage))
  const [currentStep, setCurrentStep] = useState(() => getCurrentStep())
  const [invites, setInvites] = useState<CheckinInvite[]>([])
  const [loadingInvites, setLoadingInvites] = useState(false)
  const [qrScanResult, setQrScanResult] = useState<string | null>(null)
  const [urgenceEnvoyee, setUrgenceEnvoyee] = useState(false)
  const [showCheckin, setShowCheckin] = useState(false)

  // Refresh current step every minute
  useEffect(() => {
    if (!jourJ) return
    const interval = setInterval(() => setCurrentStep(getCurrentStep()), 60000)
    return () => clearInterval(interval)
  }, [jourJ])

  // Charger invités pour check-in
  async function chargerInvites() {
    if (invites.length > 0) { setShowCheckin(true); return }
    setLoadingInvites(true)
    try {
      const res = await fetch(`/api/portail/jour-j/invites?marie_uid=${marie_uid}`)
      const data = await res.json()
      setInvites(data.invites || [])
      setShowCheckin(true)
    } catch { /* ignore */ }
    setLoadingInvites(false)
  }

  async function toggleCheckin(id: string) {
    const invite = invites.find(i => i.id === id)
    if (!invite) return
    const newStatus = !invite.checked_in
    setInvites(prev => prev.map(i => i.id === id ? { ...i, checked_in: newStatus, heure_arrivee: newStatus ? new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : undefined } : i))
    await fetch('/api/portail/jour-j/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marie_uid, invite_id: id, checked_in: newStatus }),
    }).catch(() => null)
  }

  async function envoyerUrgence() {
    setUrgenceEnvoyee(true)
    await fetch('/api/portail/jour-j/urgence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marie_uid }),
    }).catch(() => null)
    setTimeout(() => setUrgenceEnvoyee(false), 5000)
  }

  const checkInCount = invites.filter(i => i.checked_in).length

  if (!jourJ) {
    // Mode preview — pas encore le jour J
    const jours = Math.ceil((new Date(date_mariage).getTime() - Date.now()) / 86400000)
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: '#FDFAF4', border: '1px solid #E8E0D0' }}>
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #1A1A1A, #2D2D2D)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: '#AAA' }} />
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#888]">MODE JOUR J</p>
          </div>
          <h3 className="text-lg font-serif text-white">Programme du mariage</h3>
          <p className="text-xs text-[#888] mt-1">
            {jours > 0 ? `S'activera automatiquement dans ${jours} jour${jours > 1 ? 's' : ''}` : "Prêt à s'activer aujourd'hui !"}
          </p>
        </div>

        <div className="p-4">
          <p className="text-xs text-[#888] mb-3">Aperçu du programme — modifiable dans vos paramètres</p>
          <div className="space-y-2">
            {PROGRAMME_JOUR_J.slice(0, 6).map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: '#F5F0E8' }}>
                <span className="text-sm flex-shrink-0">{item.emoji}</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-[#1A1A1A]">{item.label}</p>
                  {item.detail && <p className="text-[10px] text-[#888]">{item.detail}</p>}
                </div>
                <span className="text-[10px] font-bold text-[#C9A84C]">{item.heure}</span>
              </div>
            ))}
            <p className="text-center text-[10px] text-[#AAA] py-1">+ {PROGRAMME_JOUR_J.length - 6} autres étapes…</p>
          </div>
        </div>
      </div>
    )
  }

  // Mode actif — Jour J !
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '2px solid #C9A84C' }}>
      {/* Header actif */}
      <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C87A)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
            <p className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">EN DIRECT — JOUR J</p>
          </div>
          <button
            onClick={envoyerUrgence}
            disabled={urgenceEnvoyee}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: urgenceEnvoyee ? '#7C9A7E' : '#C0392B', color: 'white' }}
          >
            {urgenceEnvoyee ? '✅ Olivier alerté' : '🚨 Urgence → Olivier'}
          </button>
        </div>
        <h3 className="text-xl font-serif text-[#1A1A1A] mt-2">{noms_maries} 💍</h3>
        <p className="text-xs text-[#1A1A1A] opacity-70 mt-0.5">
          Étape actuelle : {PROGRAMME_JOUR_J[currentStep]?.emoji} {PROGRAMME_JOUR_J[currentStep]?.label}
        </p>
      </div>

      {/* Programme heure par heure */}
      <div className="px-4 py-3 space-y-1.5" style={{ background: 'white' }}>
        <p className="text-xs font-bold text-[#888] uppercase tracking-wide mb-2">Programme du jour</p>
        {PROGRAMME_JOUR_J.map((item, idx) => {
          const isPast = idx < currentStep
          const isCurrent = idx === currentStep
          return (
            <div
              key={idx}
              className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all"
              style={{
                background: isCurrent ? '#C9A84C15' : isPast ? '#F9F9F9' : 'white',
                border: isCurrent ? '1px solid #C9A84C40' : '1px solid transparent',
              }}
            >
              <span className="text-base flex-shrink-0" style={{ opacity: isPast ? 0.4 : 1 }}>{item.emoji}</span>
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: isCurrent ? '#1A1A1A' : isPast ? '#AAA' : '#666', textDecoration: isPast ? 'line-through' : 'none' }}>
                  {item.label}
                </p>
                {isCurrent && item.detail && <p className="text-[10px] text-[#888] mt-0.5">{item.detail}</p>}
              </div>
              <span className="text-[10px] font-bold" style={{ color: isCurrent ? '#C9A84C' : '#AAA' }}>{item.heure}</span>
              {isCurrent && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#C9A84C', flexShrink: 0 }} />}
            </div>
          )
        })}
      </div>

      {/* Check-in invités */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid #F5F0E8' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-[#1A1A1A]">Check-in invités</p>
          <span className="text-xs font-bold text-[#7C9A7E]">{checkInCount} arrivés</span>
        </div>

        {qrScanResult && (
          <div className="mb-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#7C9A7E15', color: '#7C9A7E' }}>
            ✅ QR scanné : {qrScanResult}
          </div>
        )}

        <button
          onClick={chargerInvites}
          disabled={loadingInvites}
          className="w-full py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all"
          style={{ background: '#7C9A7E15', color: '#7C9A7E', border: '1px solid #7C9A7E30' }}
        >
          {loadingInvites ? 'Chargement…' : showCheckin ? '▲ Masquer la liste' : '📋 Ouvrir le check-in invités'}
        </button>

        {showCheckin && invites.length > 0 && (
          <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
            {invites.map(invite => (
              <label
                key={invite.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer"
                style={{ background: invite.checked_in ? '#7C9A7E10' : '#FAFAFA' }}
              >
                <div
                  className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ borderColor: invite.checked_in ? '#7C9A7E' : '#DDD', background: invite.checked_in ? '#7C9A7E' : 'white' }}
                  onClick={() => toggleCheckin(invite.id)}
                >
                  {invite.checked_in && <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-[#1A1A1A]">{invite.prenom} {invite.nom}</p>
                  {invite.table && <p className="text-[10px] text-[#888]">Table {invite.table}</p>}
                </div>
                {invite.heure_arrivee && <span className="text-[10px] text-[#7C9A7E] font-medium">{invite.heure_arrivee}</span>}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
