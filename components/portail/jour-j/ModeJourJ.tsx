'use client'
// components/portail/jour-j/ModeJourJ.tsx — #172 Mode Jour J — programme paramétrable

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

interface EtapeProgramme {
  id: string
  emoji: string
  titre: string
  description: string
  heure: string
  ordre: number
}

const PROGRAMME_DEFAUT: EtapeProgramme[] = [
  { id: '1', emoji: '💄', titre: 'Préparation de la mariée', description: 'Coiffure, maquillage, habillage', heure: '09:00', ordre: 0 },
  { id: '2', emoji: '🤵', titre: 'Préparation du marié', description: 'Habillage, photographies', heure: '10:30', ordre: 1 },
  { id: '3', emoji: '💍', titre: 'Cérémonie traditionnelle', description: 'Remise de la dot — famille réunie', heure: '11:00', ordre: 2 },
  { id: '4', emoji: '⛪', titre: 'Cérémonie civile / religieuse', description: 'Échange des vœux, signature des registres', heure: '13:00', ordre: 3 },
  { id: '5', emoji: '📸', titre: 'Séance photos officielle', description: 'Couple + famille + témoins', heure: '15:00', ordre: 4 },
  { id: '6', emoji: '🥂', titre: 'Accueil des invités — Cocktail', description: 'Apéritif et cocktail de bienvenue', heure: '16:00', ordre: 5 },
  { id: '7', emoji: '✨', titre: 'Entrée des mariés', description: 'Applaudissements, première danse', heure: '17:00', ordre: 6 },
  { id: '8', emoji: '🍛', titre: 'Dîner de mariage', description: 'Service des plats — spécialités Kribi', heure: '18:00', ordre: 7 },
  { id: '9', emoji: '🎤', titre: 'Discours et témoignages', description: 'Témoins, familles, surprise', heure: '20:00', ordre: 8 },
  { id: '10', emoji: '🎂', titre: 'Gâteau et première danse', description: 'Découpe du gâteau, ouverture du bal', heure: '21:00', ordre: 9 },
  { id: '11', emoji: '🎵', titre: 'Soirée dansante', description: 'DJ / orchestre — piste de danse ouverte', heure: '22:00', ordre: 10 },
  { id: '12', emoji: '🌙', titre: 'Fin de soirée', description: 'Raccompagnement des invités', heure: '02:00', ordre: 11 },
]

function isJourJ(dateMariage: string): boolean {
  if (!dateMariage) return false
  const today = new Date()
  const dm = new Date(dateMariage)
  return today.getFullYear() === dm.getFullYear() &&
    today.getMonth() === dm.getMonth() &&
    today.getDate() === dm.getDate()
}

function getCurrentStep(programme: EtapeProgramme[]): number {
  const now = new Date()
  const heureCourante = now.getHours() * 60 + now.getMinutes()
  let current = 0
  for (let i = 0; i < programme.length; i++) {
    const [h, m] = programme[i].heure.split(':').map(Number)
    if (heureCourante >= h * 60 + m) current = i
  }
  return current
}

export default function ModeJourJ({ marie_uid, date_mariage, noms_maries }: Props) {
  const [jourJ] = useState(() => isJourJ(date_mariage))
  const [programme, setProgramme] = useState<EtapeProgramme[]>(PROGRAMME_DEFAUT)
  const [personnalise, setPersonnalise] = useState(false)
  const [loadingProg, setLoadingProg] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [invites, setInvites] = useState<CheckinInvite[]>([])
  const [loadingInvites, setLoadingInvites] = useState(false)
  const [urgenceEnvoyee, setUrgenceEnvoyee] = useState(false)
  const [showCheckin, setShowCheckin] = useState(false)

  // Charger le programme personnalisé
  useEffect(() => {
    fetch('/api/portail/programme')
      .then(r => r.json())
      .then(d => {
        if (d.programme) {
          setProgramme(d.programme)
          setPersonnalise(d.personnalise ?? false)
          setCurrentStep(getCurrentStep(d.programme))
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProg(false))
  }, [])

  // Refresh current step every minute (jour J seulement)
  useEffect(() => {
    if (!jourJ) return
    const interval = setInterval(() => setCurrentStep(getCurrentStep(programme)), 60000)
    return () => clearInterval(interval)
  }, [jourJ, programme])

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
    setInvites(prev => prev.map(i => i.id === id
      ? { ...i, checked_in: newStatus, heure_arrivee: newStatus ? new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : undefined }
      : i
    ))
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
  const affichees = programme.slice(0, 6)
  const reste = programme.length - 6

  // ── MODE PREVIEW (pas encore le Jour J) ─────────────────────────────────────
  if (!jourJ) {
    const jours = date_mariage
      ? Math.ceil((new Date(date_mariage).getTime() - Date.now()) / 86400000)
      : null

    return (
      <div
        className="rounded-2xl overflow-hidden shadow-sm"
        style={{ background: '#F9F5F2', border: '1px solid rgba(212,175,55,0.2)' }}
      >
        {/* Header */}
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #2C1810, #4A2828)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(212,175,55,0.5)' }} />
                <p className="text-[10px] tracking-[0.3em] uppercase" style={{ color: 'rgba(212,175,55,0.6)' }}>
                  MODE JOUR J
                </p>
              </div>
              <h3 className="text-lg font-serif text-white">Programme du mariage</h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {jours !== null && jours > 0
                  ? `S'activera dans ${jours} jour${jours > 1 ? 's' : ''}`
                  : jours === 0 ? "Prêt à s'activer aujourd'hui !"
                  : 'Aperçu de votre programme'}
              </p>
            </div>
            {/* Bouton modifier */}
            <a
              href="/portail/programme"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
            >
              ✏️ Modifier
            </a>
          </div>
          {personnalise && (
            <p className="text-[10px] mt-2 font-medium" style={{ color: 'rgba(212,175,55,0.7)' }}>
              ✦ Programme personnalisé
            </p>
          )}
        </div>

        {/* Liste des 6 premières étapes */}
        <div className="p-4">
          {loadingProg ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {affichees.map((item, idx) => (
                <div
                  key={item.id ?? idx}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: '#F5E8E4', border: '1px solid #EDD5CC' }}
                >
                  <span className="text-sm flex-shrink-0">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1A1A1A] truncate">{item.titre}</p>
                    {item.description && (
                      <p className="text-[10px] text-[#6B4F4F] truncate">{item.description}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold flex-shrink-0" style={{ color: '#D4AF37' }}>
                    {item.heure}
                  </span>
                </div>
              ))}
              {reste > 0 && (
                <a
                  href="/portail/programme"
                  className="block text-center text-[11px] font-medium py-1.5"
                  style={{ color: '#D4AF37' }}
                >
                  + {reste} autre{reste > 1 ? 's' : ''} étape{reste > 1 ? 's' : ''}…
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid #EDD5CC' }}
        >
          <p className="text-[10px] text-[#A08878]">
            {programme.length} étape{programme.length > 1 ? 's' : ''} au programme
          </p>
          <a
            href="/portail/programme"
            className="text-xs font-semibold"
            style={{ color: '#D4AF37' }}
          >
            ✏️ Modifier le programme →
          </a>
        </div>
      </div>
    )
  }

  // ── MODE ACTIF — JOUR J ──────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '2px solid #D4AF37' }}>
      {/* Header actif */}
      <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #D4AF37, #F0D060)' }}>
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
          Étape actuelle : {programme[currentStep]?.emoji} {programme[currentStep]?.titre}
        </p>
      </div>

      {/* Programme heure par heure */}
      <div className="px-4 py-3 space-y-1.5" style={{ background: '#F9F5F2' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-[#6B4F4F] uppercase tracking-wide">Programme du jour</p>
          <a href="/portail/programme" className="text-[10px] font-medium" style={{ color: '#D4AF37' }}>
            ✏️ Modifier
          </a>
        </div>
        {programme.map((item, idx) => {
          const isPast = idx < currentStep
          const isCurrent = idx === currentStep
          return (
            <div
              key={item.id ?? idx}
              className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all"
              style={{
                background: isCurrent ? 'rgba(212,175,55,0.12)' : isPast ? '#F5E8E4' : '#F9F5F2',
                border: isCurrent ? '1px solid rgba(212,175,55,0.4)' : '1px solid transparent',
              }}
            >
              <span className="text-base flex-shrink-0" style={{ opacity: isPast ? 0.4 : 1 }}>
                {item.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-semibold truncate"
                  style={{
                    color: isCurrent ? '#1A1A1A' : isPast ? '#A08878' : '#6B4F4F',
                    textDecoration: isPast ? 'line-through' : 'none',
                  }}
                >
                  {item.titre}
                </p>
                {isCurrent && item.description && (
                  <p className="text-[10px] text-[#6B4F4F] mt-0.5">{item.description}</p>
                )}
              </div>
              <span
                className="text-[10px] font-bold flex-shrink-0"
                style={{ color: isCurrent ? '#D4AF37' : '#A08878' }}
              >
                {item.heure}
              </span>
              {isCurrent && (
                <div
                  className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                  style={{ background: '#D4AF37' }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Check-in invités */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid #EDD5CC', background: '#F9F5F2' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-[#1A1A1A]">Check-in invités</p>
          <span className="text-xs font-bold" style={{ color: '#7C9A7E' }}>{checkInCount} arrivés</span>
        </div>

        <button
          onClick={chargerInvites}
          disabled={loadingInvites}
          className="w-full py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all"
          style={{ background: 'rgba(124,154,126,0.12)', color: '#7C9A7E', border: '1px solid rgba(124,154,126,0.3)' }}
        >
          {loadingInvites ? 'Chargement…' : showCheckin ? '▲ Masquer la liste' : '📋 Ouvrir le check-in invités'}
        </button>

        {showCheckin && invites.length > 0 && (
          <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
            {invites.map(invite => (
              <label
                key={invite.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer"
                style={{ background: invite.checked_in ? 'rgba(124,154,126,0.08)' : '#F5E8E4' }}
              >
                <div
                  className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    borderColor: invite.checked_in ? '#7C9A7E' : '#D4B8B0',
                    background: invite.checked_in ? '#7C9A7E' : '#F9F5F2',
                  }}
                  onClick={() => toggleCheckin(invite.id)}
                >
                  {invite.checked_in && (
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-[#1A1A1A]">{invite.prenom} {invite.nom}</p>
                  {invite.table && <p className="text-[10px] text-[#6B4F4F]">Table {invite.table}</p>}
                </div>
                {invite.heure_arrivee && (
                  <span className="text-[10px] font-medium" style={{ color: '#7C9A7E' }}>{invite.heure_arrivee}</span>
                )}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
