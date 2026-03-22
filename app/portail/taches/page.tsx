'use client'
// app/portail/taches/page.tsx — Planning mariage en 3 phases narratives

import { useState, useEffect } from 'react'

function getUid() {
  if (typeof document === 'undefined') return ''
  return decodeURIComponent(document.cookie.match(/portail_uid=([^;]+)/)?.[1] ?? '')
}

type Phase = 1 | 2 | 3
type Priorite = 'haute' | 'moyenne' | 'basse'

interface Tache {
  id: string
  libelle: string
  done: boolean
  phase: Phase
  priorite: Priorite
  date_limite?: string | null
  rev?: number
  cta_url?: string
  cta_label?: string
}

const PHASE_CONFIG = {
  1: { emoji: '🚨', titre: 'Priorités immédiates', sous: 'Verrouillage', color: '#C0392B', bg: '#FFF1F1' },
  2: { emoji: '🏨', titre: 'Logistique & Confort', sous: 'Boost Boutique', color: '#C9A84C', bg: '#FEFAF0' },
  3: { emoji: '✨', titre: 'Détails & Esthétique', sous: 'Finitions', color: '#7C9A7E', bg: '#F0F7F1' },
}

const PRIO_COLOR: Record<Priorite, string> = {
  haute: '#C0392B', moyenne: '#C9A84C', basse: '#888',
}

const TACHES_TEMPLATE: Omit<Tache, 'id' | 'done'>[] = [
  { libelle: 'Finaliser la liste d\'invités (indispensable pour ajuster les devis traiteur)', phase: 1, priorite: 'haute', rev: 50 },
  { libelle: 'Validation du lieu de réception à Kribi (accessibilité plage si cérémonie extérieure)', phase: 1, priorite: 'haute', rev: 50 },
  { libelle: 'Signature contrat Traiteur + versement acompte', phase: 1, priorite: 'haute', rev: 50 },
  { libelle: 'Partager mon code L&Lui avec les invités', phase: 1, priorite: 'haute', rev: 30 },
  { libelle: 'Réserver le bloc de chambres pour les invités', phase: 2, priorite: 'haute', rev: 30, cta_url: '/portail/escales', cta_label: 'Voir la Sélection Hébergements →' },
  { libelle: 'Valider le plan de transport invités (navettes aéroport / hôtel / lieu)', phase: 2, priorite: 'moyenne', rev: 20 },
  { libelle: 'Choisir les cadeaux invités', phase: 2, priorite: 'moyenne', rev: 20, cta_url: '/portail/configurateur', cta_label: 'Voir les options en boutique →' },
  { libelle: 'Dégustation Vins & Spiritueux', phase: 2, priorite: 'basse', rev: 20, cta_url: '/portail/configurateur', cta_label: 'Voir la sélection L&Lui →' },
  { libelle: 'Brief photographe : lister les moments clés de la journée', phase: 3, priorite: 'moyenne', rev: 20 },
  { libelle: 'Validation palette de couleurs : envoi moodboard définitif à Fleurs & Décors', phase: 3, priorite: 'moyenne', rev: 20 },
  { libelle: 'Confirmer la musique et l\'animation', phase: 3, priorite: 'moyenne', rev: 20 },
  { libelle: 'Préparer le plan de table', phase: 3, priorite: 'basse', rev: 20 },
]

export default function TachesPage() {
  const [uid] = useState(() => getUid())
  const [taches, setTaches] = useState<Tache[]>([])
  const [loading, setLoading] = useState(true)
  const [openPhases, setOpenPhases] = useState<Set<Phase>>(new Set<Phase>([1, 2, 3]))
  const [toast, setToast] = useState('')
  // Formulaire ajout
  const [showForm, setShowForm] = useState(false)
  const [formLibelle, setFormLibelle] = useState('')
  const [formPhase, setFormPhase] = useState<Phase>(1)
  const [formPrio, setFormPrio] = useState<Priorite>('moyenne')
  const [formDate, setFormDate] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const load = async () => {
    if (!uid) return
    setLoading(true)
    try {
      const res = await fetch('/api/portail/taches')
      const d = await res.json()
      if (d.taches?.length > 0) {
        setTaches(d.taches)
      } else {
        // Seed depuis template si vide
        setTaches(TACHES_TEMPLATE.map((t, i) => ({ ...t, id: `tpl_${i}`, done: false })))
      }
    } catch {
      setTaches(TACHES_TEMPLATE.map((t, i) => ({ ...t, id: `tpl_${i}`, done: false })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (uid) load() }, [uid])

  const togglePhase = (p: Phase) => {
    setOpenPhases(prev => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p); else next.add(p)
      return next
    })
  }

  const handleCheck = async (t: Tache) => {
    if (t.done) return
    // Optimistic update
    setTaches(prev => prev.map(x => x.id === t.id ? { ...x, done: true } : x))
    showToast(`✓ Tâche cochée${t.rev ? ` · +${t.rev} REV gagnés` : ''}`)
    if (!t.id.startsWith('tpl_')) {
      await fetch('/api/portail/update-tache', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tache_id: t.id, statut: 'done' }),
      }).catch(() => {})
    }
  }

  const handleAjouter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uid || !formLibelle.trim()) return
    setFormSaving(true)
    try {
      const res = await fetch('/api/portail/ajouter-tache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: formLibelle.trim(),
          phase: formPhase,
          priorite: formPrio,
          date_limite: formDate || null,
        }),
      })
      if (res.ok) {
        showToast('Tâche ajoutée ✓')
        setFormLibelle(''); setFormDate(''); setShowForm(false)
        await load()
      }
    } finally {
      setFormSaving(false)
    }
  }

  // Stats globales
  const total = taches.length
  const done = taches.filter(t => t.done).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const tachesByPhase = (phase: Phase) => taches.filter(t => t.phase === phase)
  const phasePct = (phase: Phase) => {
    const ts = tachesByPhase(phase)
    if (!ts.length) return 0
    return Math.round((ts.filter(t => t.done).length / ts.length) * 100)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 flex justify-center items-center min-h-[200px]">
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-20">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-sm px-4 py-2.5 rounded-xl shadow-lg max-w-xs text-center">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <a href="/portail" className="text-xs text-[#C9A84C] block mb-0.5">← Retour</a>
          <h1 className="font-serif italic text-2xl text-[#1A1A1A]">Mon Planning</h1>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
          style={{ background: '#C9A84C' }}
        >
          + Tâche
        </button>
      </div>

      {/* Graphique de progression global */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
        <div className="flex items-center gap-4">
          {/* Donut SVG */}
          <div className="flex-shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#F5F0E8" strokeWidth="8" />
              <circle cx="40" cy="40" r="32" fill="none" stroke="#C9A84C" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
              <text x="40" y="44" textAnchor="middle" className="fill-[#1A1A1A]" fontSize="14" fontWeight="bold">{pct}%</text>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-[#1A1A1A]">{done} / {total} tâches complétées</p>
            <p className="text-xs text-[#888] mt-0.5">
              {pct === 100 ? 'Tout est prêt — félicitations ! 🎉' : pct >= 50 ? 'Vous avancez bien !' : 'Votre planning se met en place'}
            </p>
            {/* Barres par phase */}
            <div className="mt-3 space-y-1.5">
              {([1, 2, 3] as Phase[]).map(p => (
                <div key={p} className="flex items-center gap-2">
                  <span className="text-[10px] w-4">{PHASE_CONFIG[p].emoji}</span>
                  <div className="flex-1 bg-[#F5F0E8] rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${phasePct(p)}%`, background: PHASE_CONFIG[p].color }} />
                  </div>
                  <span className="text-[10px] text-[#888] w-6 text-right">{phasePct(p)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire ajout */}
      {showForm && (
        <form onSubmit={handleAjouter} className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] space-y-3">
          <p className="font-semibold text-sm">Nouvelle tâche</p>
          <input
            value={formLibelle}
            onChange={e => setFormLibelle(e.target.value)}
            placeholder="Titre de la tâche *"
            required
            className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={formPhase}
              onChange={e => setFormPhase(Number(e.target.value) as Phase)}
              className="border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] bg-white"
            >
              {([1, 2, 3] as Phase[]).map(p => (
                <option key={p} value={p}>{PHASE_CONFIG[p].emoji} Phase {p} — {PHASE_CONFIG[p].sous}</option>
              ))}
            </select>
            <select
              value={formPrio}
              onChange={e => setFormPrio(e.target.value as Priorite)}
              className="border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] bg-white"
            >
              <option value="haute">🔴 Haute priorité</option>
              <option value="moyenne">🟡 Moyenne</option>
              <option value="basse">⚪ Basse</option>
            </select>
          </div>
          <input
            type="date"
            value={formDate}
            onChange={e => setFormDate(e.target.value)}
            className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={formSaving || !formLibelle.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#C9A84C' }}>
              {formSaving ? 'Ajout…' : '+ Ajouter'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm border border-[#E8E0D0] text-[#888]">Annuler</button>
          </div>
        </form>
      )}

      {/* Phases accordéon */}
      {([1, 2, 3] as Phase[]).map(phase => {
        const cfg = PHASE_CONFIG[phase]
        const ts = tachesByPhase(phase)
        const isOpen = openPhases.has(phase)
        const phaseDone = ts.filter(t => t.done).length

        return (
          <div key={phase} className="rounded-2xl overflow-hidden shadow-sm border border-[#F5F0E8]" style={{ background: cfg.bg }}>
            {/* En-tête phase */}
            <button
              onClick={() => togglePhase(phase)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <span className="text-xl">{cfg.emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm text-[#1A1A1A]">{cfg.titre}</p>
                <p className="text-[11px] text-[#888]">{cfg.sous} · {phaseDone}/{ts.length} tâches</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: cfg.color }}>
                {phasePct(phase)}%
              </span>
              <span className="text-[#888] text-sm">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Tâches */}
            {isOpen && (
              <div className="px-4 pb-4 space-y-2">
                {ts.length === 0 && (
                  <p className="text-xs text-center text-[#AAA] py-3">Aucune tâche dans cette phase</p>
                )}
                {ts.map(t => (
                  <div
                    key={t.id}
                    className="bg-white rounded-xl p-3 flex gap-3 items-start"
                    style={{ borderLeft: `3px solid ${t.done ? '#C9A84C' : PRIO_COLOR[t.priorite]}`, opacity: t.done ? 0.65 : 1 }}
                  >
                    <button
                      onClick={() => handleCheck(t)}
                      disabled={t.done}
                      className="mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                      style={{
                        borderColor: t.done ? '#C9A84C' : PRIO_COLOR[t.priorite],
                        background: t.done ? '#C9A84C' : 'transparent',
                      }}
                    >
                      {t.done && <span className="text-white text-[10px]">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${t.done ? 'line-through text-[#888]' : 'text-[#1A1A1A]'}`}>{t.libelle}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {t.rev && !t.done && (
                          <span className="text-[10px] text-[#C9A84C] font-semibold">+{t.rev} REV</span>
                        )}
                        {t.date_limite && (
                          <span className="text-[10px] text-[#888]">📅 {new Date(t.date_limite).toLocaleDateString('fr-FR')}</span>
                        )}
                        {t.cta_url && !t.done && (
                          <a
                            href={t.cta_url}
                            className="text-[10px] font-semibold underline"
                            style={{ color: cfg.color }}
                          >
                            {t.cta_label}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
