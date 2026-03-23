'use client'
// components/invite-jour-j/JourJClient.tsx — #174 App invité Jour J — QR Table, sans login, temps réel

import { useState, useEffect } from 'react'

interface ProgrammeItem { heure: string; libelle: string }

interface Props {
  marie_uid: string
  noms_maries: string
  date_mariage: string
  lieu: string
  code_promo: string
  programme: ProgrammeItem[]
  message_jour_j: string
}

const DEFAULT_PROGRAMME: ProgrammeItem[] = [
  { heure: '10h00', libelle: 'Accueil des invités' },
  { heure: '11h00', libelle: 'Cérémonie' },
  { heure: '12h30', libelle: 'Cocktail & photos' },
  { heure: '14h00', libelle: 'Repas de mariage' },
  { heure: '17h00', libelle: 'Gâteau & discours' },
  { heure: '19h00', libelle: 'Soirée dansante' },
]

function useCurrentTime() {
  const [time, setTime] = useState('')
  useEffect(() => {
    function update() {
      setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    }
    update(); const id = setInterval(update, 30000); return () => clearInterval(id)
  }, [])
  return time
}

function getCurrentStep(programme: ProgrammeItem[]): number {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  let current = -1
  for (let i = 0; i < programme.length; i++) {
    const [h, m] = programme[i].heure.replace('h', ':').split(':').map(Number)
    const stepMin = h * 60 + (m || 0)
    if (nowMin >= stepMin) current = i
  }
  return current
}

export default function JourJClient({ marie_uid, noms_maries, date_mariage, lieu, code_promo, programme, message_jour_j }: Props) {
  const [messageEnvoye, setMessageEnvoye] = useState(false)
  const [messageTexte, setMessageTexte] = useState('')
  const [sending, setSending] = useState(false)
  const [tab, setTab] = useState<'programme' | 'cadeau' | 'message'>('programme')
  const currentTime = useCurrentTime()

  const prog = programme && programme.length > 0 ? programme : DEFAULT_PROGRAMME
  const currentStep = getCurrentStep(prog)

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
  const boutiqueUrl = `${APP_URL}/boutique?code=${encodeURIComponent(code_promo)}`

  async function handleSendMessage() {
    if (!messageTexte.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/rsvp/${marie_uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: 'Invité', nom: 'Anonyme',
          presence: 'oui', nb_adultes: '1', nb_enfants: '0',
          regimes: ['normal'], besoin_hebergement: false,
          message: messageTexte,
        }),
      })
      if (res.ok) { setMessageEnvoye(true) }
    } catch { }
    finally { setSending(false) }
  }

  return (
    <div className="min-h-screen" style={{ background: '#1A1A1A' }}>
      {/* Header jour J */}
      <div className="px-4 pt-10 pb-6 text-center border-b" style={{ borderColor: '#C9A84C20' }}>
        <div className="text-3xl mb-2">💍</div>
        <h1 className="text-2xl font-serif mb-1" style={{ color: '#C9A84C' }}>
          {noms_maries || 'Mariage'}
        </h1>
        <p className="text-white/50 text-xs mb-3">{lieu}</p>
        {message_jour_j && (
          <p className="text-white/70 text-sm italic max-w-xs mx-auto">&ldquo;{message_jour_j}&rdquo;</p>
        )}
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: '#C9A84C15', border: '1px solid #C9A84C30' }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#C9A84C' }} />
          <span className="text-xs" style={{ color: '#C9A84C' }}>En direct · {currentTime}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: '#C9A84C15' }}>
        {([
          { key: 'programme', label: '📋 Programme' },
          { key: 'cadeau', label: '🎁 Cadeau' },
          { key: 'message', label: '💌 Message' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 py-3 text-xs font-semibold transition-all"
            style={{
              color: tab === t.key ? '#C9A84C' : '#888',
              borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Programme */}
      {tab === 'programme' && (
        <div className="px-4 py-5">
          <p className="text-xs text-white/40 uppercase tracking-wide mb-4">Déroulé de la journée</p>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px" style={{ background: '#C9A84C20' }} />
            <div className="space-y-4">
              {prog.map((item, i) => {
                const isPast = i < currentStep
                const isCurrent = i === currentStep
                const isFuture = i > currentStep
                return (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xs w-12 shrink-0 text-right mt-0.5"
                      style={{ color: isCurrent ? '#C9A84C' : isPast ? '#555' : '#888' }}>
                      {item.heure}
                    </span>
                    <div
                      className="w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 z-10 flex items-center justify-center"
                      style={{
                        borderColor: isCurrent ? '#C9A84C' : isPast ? '#444' : '#333',
                        background: isCurrent ? '#C9A84C' : '#1A1A1A',
                      }}
                    >
                      {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      {isPast && <span className="text-[8px] text-[#555]">✓</span>}
                    </div>
                    <div className={`flex-1 rounded-xl px-3 py-2.5 ${isCurrent ? 'border' : ''}`}
                      style={{
                        background: isCurrent ? '#C9A84C15' : 'transparent',
                        border: isCurrent ? '1px solid #C9A84C30' : 'none',
                      }}>
                      <p className="text-sm font-semibold"
                        style={{ color: isCurrent ? '#C9A84C' : isPast ? '#555' : '#999' }}>
                        {item.libelle}
                      </p>
                      {isCurrent && (
                        <p className="text-[10px] mt-0.5" style={{ color: '#C9A84C80' }}>⏱ En cours maintenant</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab Cadeau */}
      {tab === 'cadeau' && (
        <div className="px-4 py-6 text-center">
          <div className="text-5xl mb-4">🎁</div>
          <h2 className="text-lg font-semibold text-white mb-2">Offrir un cadeau</h2>
          <p className="text-white/50 text-sm mb-6">
            Faites plaisir à {noms_maries} en utilisant leur code privilège sur la boutique L&Lui Signature
          </p>
          {code_promo && (
            <div className="rounded-2xl py-5 px-4 mb-4" style={{ background: '#C9A84C15', border: '1px solid #C9A84C30' }}>
              <p className="text-xs text-white/40 mb-1">Code privilège</p>
              <p className="text-3xl font-bold tracking-widest" style={{ color: '#C9A84C' }}>{code_promo}</p>
            </div>
          )}
          <a
            href={boutiqueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-4 rounded-2xl font-bold text-[#1A1A1A] text-sm"
            style={{ background: 'linear-gradient(90deg, #C9A84C, #E8C87A)' }}
          >
            🛍️ Aller à la boutique
          </a>
          <p className="text-[10px] text-white/30 mt-3">Chaque achat avec ce code alimente leur cagnotte de mariage</p>
        </div>
      )}

      {/* Tab Message */}
      {tab === 'message' && (
        <div className="px-4 py-6">
          {messageEnvoye ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">💛</div>
              <h2 className="text-lg font-semibold text-white mb-2">Message envoyé !</h2>
              <p className="text-white/50 text-sm">Merci pour ce mot doux 💍</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white mb-2">Laisser un message</h2>
              <p className="text-white/50 text-sm mb-4">Envoyez un mot de félicitations aux mariés</p>
              <textarea
                rows={5}
                value={messageTexte}
                onChange={e => setMessageTexte(e.target.value)}
                placeholder="Félicitations ! Que votre amour soit aussi lumineux que ce beau jour... 💛"
                className="w-full rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none"
                style={{ background: '#2A2A2A', color: 'white', border: '1px solid #C9A84C20' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageTexte.trim() || sending}
                className="mt-3 w-full py-4 rounded-2xl font-bold text-[#1A1A1A] text-sm disabled:opacity-40"
                style={{ background: 'linear-gradient(90deg, #C9A84C, #E8C87A)' }}
              >
                {sending ? '…' : '💌 Envoyer ce message'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-8 text-center mt-4">
        <p className="text-[10px] text-white/20">L&Lui Signature 💛 — Organisateur de mariages à Kribi</p>
      </div>
    </div>
  )
}
