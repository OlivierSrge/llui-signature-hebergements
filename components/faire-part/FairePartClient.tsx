'use client'
// components/faire-part/FairePartClient.tsx
// Invitation numérique premium — espace émotionnel pur
// ZÉRO commercial · ZÉRO boutique · ZÉRO Stars · ZÉRO navigation portail

import { useState, useEffect, useRef, useCallback } from 'react'
import { useCoupleTheme } from '@/hooks/useCoupleTheme'
import { submitRsvp } from '@/actions/faire-part-rsvp'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Hebergement {
  nom: string
  type: string
  description: string
  telephone: string
  prix_indicatif: string
  maps_url: string
}

interface EtapeProgramme {
  heure: string
  titre: string
  description: string
  icone: string
}

export interface FairePartProps {
  marie_uid: string
  noms_maries: string
  date_mariage: string
  lieu: string
  adresse_exacte: string
  google_maps_url: string
  plans_acces_url: string
  message_faire_part: string
  theme: Record<string, string> | null
  programme: EtapeProgramme[]
  hebergements_visibles: boolean
  hebergements: Hebergement[]
  contact_hebergements_whatsapp: string
  rsvp_ouvert: boolean
  rsvp_max_accompagnants: number
  rsvp_date_limite: string
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function formatDateLong(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return iso }
}

function joursRestants(iso: string): number {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso + 'T00:00:00').getTime() - Date.now()) / 86_400_000))
}

function getInitiales(noms: string): string {
  // "Diane & Charly" → "DC"
  const parts = noms.replace(/&/g, ' ').split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('')
}

// ─── Loader ───────────────────────────────────────────────────────────────────

function Loader({ noms, accent, onDone }: { noms: string; accent: string; onDone: () => void }) {
  const initiales = getInitiales(noms)
  const [fadeOut, setFadeOut] = useState(false)
  const doneCalled = useRef(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), 2200)
    const t2 = setTimeout(() => {
      if (!doneCalled.current) { doneCalled.current = true; onDone() }
    }, 2800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(160deg, #0D2137 0%, #1B4F72 60%, #0A1E2F 100%)',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.6s ease',
        pointerEvents: fadeOut ? 'none' : 'all',
      }}
    >
      {/* Initiales champagne */}
      <div
        className="text-7xl font-serif tracking-widest mb-6"
        style={{ color: accent, textShadow: `0 0 40px ${accent}88`, fontFamily: 'Georgia, serif' }}
      >
        {initiales}
      </div>
      <p className="text-white/40 text-xs tracking-[0.4em] uppercase">Invitation</p>

      {/* Vague SVG animée */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden" style={{ height: 80 }}>
        <svg viewBox="0 0 1200 80" className="w-full" style={{ animation: 'waveLoaderMove 3s ease-in-out infinite' }}>
          <path d="M0,40 C200,80 400,0 600,40 C800,80 1000,0 1200,40 L1200,80 L0,80 Z"
            fill={accent} fillOpacity="0.15" />
          <path d="M0,55 C200,20 400,70 600,50 C800,30 1000,65 1200,40 L1200,80 L0,80 Z"
            fill={accent} fillOpacity="0.08" />
        </svg>
      </div>
    </div>
  )
}

// ─── Section 1 : Hero ─────────────────────────────────────────────────────────

function SectionHero({ noms, date_mariage, lieu, message, principal, accent, secondaire }: {
  noms: string; date_mariage: string; lieu: string; message: string;
  principal: string; accent: string; secondaire: string
}) {
  const jours = joursRestants(date_mariage)

  return (
    <section
      id="hero"
      className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${principal} 0%, #0A1E2F 55%, #061525 100%)` }}
    >
      {/* Étoiles */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute rounded-full" style={{
            width: (i % 3) + 1, height: (i % 3) + 1,
            top: `${(i * 37 + 13) % 100}%`, left: `${(i * 53 + 7) % 100}%`,
            background: 'white', opacity: 0.1 + (i % 4) * 0.08,
            animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${(i * 0.4) % 4}s`,
          }} />
        ))}
      </div>

      {/* Vague basse */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: 100 }}>
        <svg viewBox="0 0 1200 100" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0,60 C300,100 600,20 900,60 C1050,80 1150,40 1200,50 L1200,100 L0,100 Z"
            fill="#F0F8FF" fillOpacity="0.04" />
        </svg>
      </div>

      <div className="relative text-center max-w-lg">
        <p className="text-xs tracking-[0.5em] uppercase mb-8" style={{ color: `${accent}99` }}>
          L&Lui Signature vous présente
        </p>

        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent})` }} />
          <span style={{ color: accent, fontSize: 18 }}>✦</span>
          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        </div>

        <p className="text-white/50 text-sm mb-4">Nous avons le bonheur de vous convier à célébrer</p>

        <h1 className="text-5xl leading-tight mb-6"
          style={{ color: 'white', fontFamily: 'Georgia, serif', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
          {noms || 'Notre Mariage'}
        </h1>

        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="flex-1 h-px" style={{ background: `${accent}40` }} />
          <span style={{ color: accent }}>💍</span>
          <div className="flex-1 h-px" style={{ background: `${accent}40` }} />
        </div>

        {/* Date */}
        <div className="rounded-2xl p-6 mb-6"
          style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${accent}22` }}>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: `${accent}88` }}>Le</p>
          <p className="text-xl font-semibold text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            {formatDateLong(date_mariage)}
          </p>
          {jours > 0 && (
            <p className="text-sm mt-2" style={{ color: secondaire }}>
              dans {jours} jour{jours > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <p className="text-white/60 text-sm">
          <span style={{ color: `${accent}cc` }}>📍</span> {lieu}
        </p>

        {message && (
          <div className="mt-8 p-5 rounded-2xl italic text-white/65 text-sm leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.04)', borderLeft: `3px solid ${accent}50` }}>
            &ldquo;{message}&rdquo;
          </div>
        )}

        <div className="mt-12 flex flex-col items-center gap-1" style={{ color: `${accent}50` }}>
          <p className="text-xs tracking-widest uppercase">Découvrir</p>
          <span style={{ animation: 'arrowBounce 2s infinite' }}>↓</span>
        </div>
      </div>
    </section>
  )
}

// ─── Section 2 : Timeline ─────────────────────────────────────────────────────

function SectionTimeline({ programme, accent, fond }: {
  programme: EtapeProgramme[]; accent: string; fond: string
}) {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const [visible, setVisible] = useState<boolean[]>(programme.map(() => false))

  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setVisible(programme.map(() => true)); return }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          const idx = parseInt(e.target.getAttribute('data-idx') ?? '0')
          if (e.isIntersecting) setVisible(prev => { const n = [...prev]; n[idx] = true; return n })
        })
      },
      { threshold: 0.15 }
    )
    itemRefs.current.forEach(el => el && obs.observe(el))
    return () => obs.disconnect()
  }, [programme.length])

  if (!programme.length) return null

  return (
    <section id="programme" className="py-20 px-6" style={{ background: fond }}>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs tracking-[0.4em] uppercase mb-2" style={{ color: `${accent}88` }}>La journée</p>
          <h2 className="text-3xl font-serif" style={{ color: '#0D2137', fontFamily: 'Georgia, serif' }}>Programme</h2>
          <div className="flex items-center gap-3 justify-center mt-4">
            <div className="flex-1 h-px" style={{ background: `${accent}40` }} />
            <span style={{ color: accent }}>✦</span>
            <div className="flex-1 h-px" style={{ background: `${accent}40` }} />
          </div>
        </div>

        <div className="relative pl-2">
          {/* Ligne verticale */}
          <div className="absolute left-6 top-0 bottom-0 w-px"
            style={{ background: `linear-gradient(to bottom, ${accent}50, ${accent}10)` }} />

          {programme.map((etape, i) => (
            <div key={i} ref={el => { itemRefs.current[i] = el }} data-idx={i}
              className="flex gap-5 mb-8"
              style={{
                opacity: visible[i] ? 1 : 0,
                transform: visible[i] ? 'translateX(0)' : 'translateX(-20px)',
                transition: `opacity 0.6s ease ${i * 80}ms, transform 0.6s ease ${i * 80}ms`,
              }}>
              {/* Dot */}
              <div className="relative flex-shrink-0" style={{ width: 48 }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm z-10"
                  style={{ background: 'white', border: `2px solid ${accent}35` }}>
                  {etape.icone}
                </div>
              </div>
              {/* Texte */}
              <div className="flex-1 rounded-2xl p-4 shadow-sm"
                style={{ background: 'white', border: `1px solid ${accent}15` }}>
                <span className="text-xs font-bold" style={{ color: accent }}>{etape.heure}</span>
                <p className="font-semibold text-[#0D2137] text-sm mt-0.5 mb-1">{etape.titre}</p>
                <p className="text-xs text-[#0D2137]/50 leading-relaxed">{etape.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Section 3 : Le Lieu ──────────────────────────────────────────────────────

function SectionLieu({ lieu, adresse_exacte, google_maps_url, plans_acces_url, principal, accent, fond }: {
  lieu: string; adresse_exacte: string; google_maps_url: string; plans_acces_url: string;
  principal: string; accent: string; fond: string
}) {
  const mapsUrl = google_maps_url || `https://maps.google.com/?q=${encodeURIComponent(adresse_exacte || lieu)}`
  const plansUrl = plans_acces_url || `https://maps.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse_exacte || lieu)}`

  return (
    <section id="lieu" className="py-20 px-6"
      style={{ background: `linear-gradient(160deg, ${principal}06 0%, ${fond} 100%)` }}>
      <div className="max-w-lg mx-auto text-center">
        <p className="text-xs tracking-[0.4em] uppercase mb-2" style={{ color: `${accent}88` }}>Où nous retrouver</p>
        <h2 className="text-3xl font-serif mb-4" style={{ color: '#0D2137', fontFamily: 'Georgia, serif' }}>Le Lieu</h2>
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="flex-1 h-px" style={{ background: `${accent}40` }} />
          <span style={{ color: accent }}>✦</span>
          <div className="flex-1 h-px" style={{ background: `${accent}40` }} />
        </div>

        <div className="rounded-3xl p-8 mb-8 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${principal}14, ${principal}06)`, border: `1px solid ${accent}18` }}>
          <div className="text-5xl mb-4">🌊</div>
          <h3 className="text-xl font-serif font-semibold mb-1" style={{ color: '#0D2137', fontFamily: 'Georgia, serif' }}>
            {lieu}
          </h3>
          {adresse_exacte && <p className="text-sm text-[#0D2137]/55 mt-2">{adresse_exacte}</p>}
          <p className="text-xs text-[#0D2137]/35 mt-3 italic">Kribi, Cameroun — Bord de l&apos;Atlantique</p>
        </div>

        <div className="flex gap-3 justify-center flex-wrap">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white active:scale-95 transition-transform"
            style={{ background: principal }}>
            <span>📍</span> Voir sur Maps
          </a>
          <a href={plansUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm active:scale-95 transition-transform"
            style={{ background: 'white', color: principal, border: `2px solid ${principal}25` }}>
            <span>🧭</span> Itinéraire
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── Section 4 : Hébergements ─────────────────────────────────────────────────

function SectionHebergements({ hebergements, contact_whatsapp, accent, principal, fond }: {
  hebergements: Hebergement[]; contact_whatsapp: string; accent: string; principal: string; fond: string
}) {
  const waNum = contact_whatsapp.replace(/\D/g, '')
  const waMsg = encodeURIComponent('Bonjour Olivier, je cherche un hébergement pour le mariage de Diane & Charly à Kribi.')
  const waUrl = waNum ? `https://wa.me/${waNum}?text=${waMsg}` : null

  return (
    <section id="hebergements" className="py-20 px-6" style={{ background: fond }}>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs tracking-[0.4em] uppercase mb-2" style={{ color: `${accent}88` }}>Pour votre séjour</p>
          <h2 className="text-3xl font-serif mb-3" style={{ color: '#0D2137', fontFamily: 'Georgia, serif' }}>
            Hébergements suggérés
          </h2>
          <div className="flex items-center gap-3 justify-center mb-4">
            <div className="flex-1 h-px" style={{ background: `${accent}40` }} />
            <span style={{ color: accent }}>✦</span>
            <div className="flex-1 h-px" style={{ background: `${accent}40` }} />
          </div>
          <p className="text-sm text-[#0D2137]/45">Sélectionnés à Kribi pour votre confort</p>
        </div>

        <div className="space-y-4 mb-8">
          {hebergements.map((h, i) => (
            <div key={i} className="rounded-2xl p-5 shadow-sm"
              style={{ background: 'white', border: `1px solid ${accent}12` }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: `${principal}0e` }}>🏨</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#0D2137] text-sm">{h.nom}</p>
                  <p className="text-xs text-[#0D2137]/40 mb-1">{h.type}</p>
                  <p className="text-xs text-[#0D2137]/55 leading-relaxed mb-2">{h.description}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-medium" style={{ color: accent }}>{h.prix_indicatif}</span>
                    {h.maps_url && (
                      <a href={h.maps_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs underline" style={{ color: principal }}>📍 Localiser</a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {waUrl && (
          <div className="text-center">
            <p className="text-xs text-[#0D2137]/38 mb-3">Besoin d&apos;aide pour choisir votre hébergement ?</p>
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white active:scale-95 transition-transform"
              style={{ background: '#25D366' }}>
              <span>💬</span> Contacter Olivier
            </a>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Section 5 : RSVP ─────────────────────────────────────────────────────────

type RsvpPresence = 'present' | 'absent' | null

function SectionRsvp({ marie_uid, max_accompagnants, date_limite, ouvert, accent, principal, fond }: {
  marie_uid: string; max_accompagnants: number; date_limite: string;
  ouvert: boolean; accent: string; principal: string; fond: string
}) {
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [presence, setPresence] = useState<RsvpPresence>(null)
  const [nbAccomp, setNbAccomp] = useState(0)
  const [messageInvite, setMessageInvite] = useState('')
  const [step, setStep] = useState<'form' | 'saving' | 'done' | 'error'>('form')
  const [errMsg, setErrMsg] = useState('')

  const handleSubmit = useCallback(async () => {
    if (!prenom.trim() || !nom.trim() || presence === null) {
      setErrMsg('Merci de renseigner vos prénom, nom et présence.')
      return
    }
    setErrMsg('')
    setStep('saving')
    const result = await submitRsvp(marie_uid, {
      prenom, nom, presence, nb_accompagnants: nbAccomp, message: messageInvite,
    })
    setStep(result.success ? 'done' : 'error')
  }, [prenom, nom, presence, nbAccomp, messageInvite, marie_uid])

  if (!ouvert) {
    return (
      <section id="rsvp" className="py-20 px-6" style={{ background: `${principal}08` }}>
        <div className="max-w-lg mx-auto text-center">
          <div className="rounded-3xl p-10" style={{ background: 'white', border: `1px solid ${accent}18` }}>
            <p className="text-4xl mb-4">💌</p>
            <p className="text-xl font-serif mb-2" style={{ color: '#0D2137', fontFamily: 'Georgia, serif' }}>
              RSVP fermé
            </p>
            <p className="text-sm text-[#0D2137]/50">La date limite de confirmation est passée.</p>
          </div>
        </div>
      </section>
    )
  }

  if (step === 'done') {
    return (
      <section id="rsvp" className="py-20 px-6" style={{ background: `${principal}08` }}>
        <div className="max-w-lg mx-auto text-center">
          <div className="rounded-3xl p-10" style={{ background: 'white', border: `1px solid ${accent}18` }}>
            <p className="text-5xl mb-6">{presence === 'present' ? '🥂' : '💐'}</p>
            <p className="text-2xl font-serif mb-3" style={{ color: '#0D2137', fontFamily: 'Georgia, serif' }}>
              {presence === 'present' ? 'À très bientôt !' : 'Merci de nous avoir prévenus.'}
            </p>
            <p className="text-sm text-[#0D2137]/50">
              {presence === 'present'
                ? `Votre présence, ${prenom}, nous touche profondément.`
                : `Nous comprenons, ${prenom}. Vous serez dans nos pensées.`}
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="rsvp" className="py-20 px-6" style={{ background: `${principal}08` }}>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs tracking-[0.4em] uppercase mb-2" style={{ color: `${accent}88` }}>
            Confirmez votre présence
          </p>
          <h2 className="text-3xl font-serif mb-3" style={{ color: '#0D2137', fontFamily: 'Georgia, serif' }}>RSVP</h2>
          <div className="flex items-center gap-3 justify-center mb-4">
            <div className="flex-1 h-px" style={{ background: `${accent}40` }} />
            <span style={{ color: accent }}>✦</span>
            <div className="flex-1 h-px" style={{ background: `${accent}40` }} />
          </div>
          {date_limite && (
            <p className="text-xs text-[#0D2137]/38">
              Avant le {new Date(date_limite + 'T12:00:00').toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          )}
        </div>

        <div className="rounded-3xl p-6 space-y-5"
          style={{ background: 'white', boxShadow: '0 4px 30px rgba(0,0,0,0.05)' }}>
          {/* Prénom / Nom */}
          <div className="grid grid-cols-2 gap-3">
            <input className="w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors"
              style={{ borderColor: prenom ? `${principal}55` : '#e5e7eb' }}
              placeholder="Prénom" value={prenom}
              onChange={e => setPrenom(e.target.value)} />
            <input className="w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors"
              style={{ borderColor: nom ? `${principal}55` : '#e5e7eb' }}
              placeholder="Nom" value={nom}
              onChange={e => setNom(e.target.value)} />
          </div>

          {/* Pill toggle présence */}
          <div>
            <p className="text-xs text-[#0D2137]/45 mb-3">Serez-vous des nôtres ?</p>
            <div className="flex gap-3">
              {([
                { val: 'present' as const, label: '🥂 Oui, avec joie !' },
                { val: 'absent' as const, label: '💐 Je ne pourrai pas' },
              ]).map(opt => (
                <button key={opt.val} type="button"
                  onClick={() => setPresence(opt.val)}
                  className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all active:scale-95"
                  style={presence === opt.val
                    ? { background: principal, color: 'white', boxShadow: `0 4px 12px ${principal}35` }
                    : { background: '#F3F4F6', color: '#6B7280' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accompagnants */}
          {presence === 'present' && max_accompagnants > 0 && (
            <div>
              <p className="text-xs text-[#0D2137]/45 mb-3">
                Accompagnants <span className="text-[#0D2137]/30">(max {max_accompagnants})</span>
              </p>
              <div className="flex items-center gap-4">
                <button type="button"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold active:scale-95 transition-transform"
                  style={{ background: `${principal}12`, color: principal }}
                  onClick={() => setNbAccomp(n => Math.max(0, n - 1))}>−</button>
                <span className="text-xl font-bold w-8 text-center" style={{ color: '#0D2137' }}>{nbAccomp}</span>
                <button type="button"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold active:scale-95 transition-transform"
                  style={{ background: `${principal}12`, color: principal }}
                  onClick={() => setNbAccomp(n => Math.min(max_accompagnants, n + 1))}>+</button>
              </div>
            </div>
          )}

          {/* Message optionnel */}
          <textarea
            className="w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors"
            style={{ borderColor: '#e5e7eb', minHeight: 80 }}
            placeholder="Un mot pour les mariés… (facultatif)"
            value={messageInvite}
            onChange={e => setMessageInvite(e.target.value)} />

          {errMsg && <p className="text-xs text-red-500 text-center">{errMsg}</p>}
          {step === 'error' && (
            <p className="text-xs text-red-500 text-center">
              Une erreur est survenue. Veuillez réessayer.
            </p>
          )}

          <button type="button" onClick={handleSubmit} disabled={step === 'saving'}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm active:scale-95 transition-all disabled:opacity-60"
            style={{ background: `linear-gradient(90deg, ${principal}, ${accent})` }}>
            {step === 'saving' ? 'Envoi en cours…' : 'Confirmer ma réponse'}
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ principal, accent }: { principal: string; accent: string }) {
  return (
    <footer className="py-12 px-6 text-center"
      style={{ background: `linear-gradient(160deg, #0D2137 0%, ${principal} 100%)` }}>
      <div className="flex items-center gap-3 justify-center mb-4">
        <div className="flex-1 h-px max-w-16" style={{ background: `${accent}35` }} />
        <span style={{ color: accent }}>✦</span>
        <div className="flex-1 h-px max-w-16" style={{ background: `${accent}35` }} />
      </div>
      <p className="text-white/75 text-xs tracking-[0.35em] uppercase mb-1">L&Lui Signature</p>
      <p className="text-white/38 text-xs">Organisateur de mariage · Kribi, Cameroun</p>
    </footer>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function FairePartClient(props: FairePartProps) {
  const {
    marie_uid, noms_maries, date_mariage, lieu, adresse_exacte,
    google_maps_url, plans_acces_url, message_faire_part,
    theme, programme, hebergements_visibles, hebergements,
    contact_hebergements_whatsapp, rsvp_ouvert, rsvp_max_accompagnants, rsvp_date_limite,
  } = props

  const resolved = useCoupleTheme(theme)
  const [loaderDone, setLoaderDone] = useState(false)
  const doneCallback = useCallback(() => setLoaderDone(true), [])

  return (
    <>
      <style>{`
        @keyframes waveLoaderMove { 0%,100% { transform:translateX(0); } 50% { transform:translateX(-30px); } }
        @keyframes twinkle { 0%,100% { opacity:0.05; } 50% { opacity:0.5; } }
        @keyframes arrowBounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(8px); } }
        html { scroll-behavior: smooth; }
      `}</style>

      {!loaderDone && (
        <Loader noms={noms_maries} accent={resolved.accent} onDone={doneCallback} />
      )}

      <main style={{ opacity: loaderDone ? 1 : 0, transition: 'opacity 0.6s ease' }}>
        <SectionHero
          noms={noms_maries} date_mariage={date_mariage} lieu={lieu}
          message={message_faire_part} principal={resolved.principal}
          accent={resolved.accent} secondaire={resolved.secondaire}
        />

        {programme.length > 0 && (
          <SectionTimeline programme={programme} accent={resolved.accent} fond={resolved.fond} />
        )}

        <SectionLieu
          lieu={lieu} adresse_exacte={adresse_exacte}
          google_maps_url={google_maps_url} plans_acces_url={plans_acces_url}
          principal={resolved.principal} accent={resolved.accent} fond={resolved.fond}
        />

        {hebergements_visibles && hebergements.length > 0 && (
          <SectionHebergements
            hebergements={hebergements} contact_whatsapp={contact_hebergements_whatsapp}
            accent={resolved.accent} principal={resolved.principal} fond={resolved.fond}
          />
        )}

        <SectionRsvp
          marie_uid={marie_uid} max_accompagnants={rsvp_max_accompagnants}
          date_limite={rsvp_date_limite} ouvert={rsvp_ouvert}
          accent={resolved.accent} principal={resolved.principal} fond={resolved.fond}
        />

        <Footer principal={resolved.principal} accent={resolved.accent} />
      </main>
    </>
  )
}
