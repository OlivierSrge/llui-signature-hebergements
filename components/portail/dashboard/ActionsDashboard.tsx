'use client'
// BLOCS 6-12 — Redesign "Velvet & Vow" — Prestataires magazine + Checklist + Versements + Citation

import { useState } from 'react'
import { getCitationDuJour } from '@/lib/citations'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

interface Todo { id: string; libelle: string; done: boolean; date_limite?: string | null; rev?: number; priorite?: string }
interface Versement { id?: string; montant: number; date?: string; mode?: string; statut: string; note?: string }
interface Prestataire { nom: string; statut: string; type: string }

interface Props {
  uid: string
  todos: Todo[]
  lieu: string
  versements?: Versement[]
  budgetTotal?: number
  prestataires?: Prestataire[]
}

// ─── Prestataires ────────────────────────────────────────────────────────────

const PRESTATAIRE_STATUT: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  confirme:    { color: '#2D7D57', bg: '#E8F5EE', label: 'Confirmé',     dot: '#7C9A7E' },
  a_confirmer: { color: '#8B6914', bg: '#FDF4DC', label: 'À confirmer',  dot: '#C9A84C' },
  devis:       { color: '#1D4ED8', bg: '#EFF6FF', label: 'Devis reçu',   dot: '#3B82F6' },
  annule:      { color: '#B91C1C', bg: '#FEF2F2', label: 'Annulé',       dot: '#C0392B' },
  CONFIRME:    { color: '#2D7D57', bg: '#E8F5EE', label: 'Confirmé',     dot: '#7C9A7E' },
  A_CONFIRMER: { color: '#8B6914', bg: '#FDF4DC', label: 'À confirmer',  dot: '#C9A84C' },
  DEVIS_RECU:  { color: '#1D4ED8', bg: '#EFF6FF', label: 'Devis reçu',   dot: '#3B82F6' },
  ANNULE:      { color: '#B91C1C', bg: '#FEF2F2', label: 'Annulé',       dot: '#C0392B' },
}

const TYPE_EMOJI: Record<string, string> = {
  wedding_planner: '💍', photo: '📷', photographe: '📷', videaste: '🎬',
  traiteur: '🍽️', musique: '🎵', musicien: '🎵', decoration: '🌸',
  decorateur: '🌸', beaute: '💄', transport: '🚗', fleuriste: '💐',
  maitre_ceremonies: '🎤', autre: '🤝', default: '🤝',
}

const PRESTATAIRES_DEFAUT: Prestataire[] = [
  { nom: 'L&Lui Signature', statut: 'confirme', type: 'wedding_planner' },
  { nom: 'Photographe', statut: 'a_confirmer', type: 'photo' },
  { nom: 'Traiteur', statut: 'a_confirmer', type: 'traiteur' },
]

// ─── Todos catégories ────────────────────────────────────────────────────────

const CAT_KEYWORDS: Record<string, string[]> = {
  'Cérémonie': ['cérémonie', 'ceremonie', 'salle', 'prêtre', 'curé', 'officiant', 'alliance', 'vœux', 'voeux', 'fleurs'],
  'Réception': ['traiteur', 'menu', 'vin', 'cocktail', 'gâteau', 'gateau', 'musique', 'dj', 'animation', 'décoration', 'decoration', 'tables'],
  'Logistique': ['invités', 'invites', 'transport', 'hébergement', 'hebergement', 'faire-part', 'robe', 'costume', 'coiffure', 'maquillage'],
  'Administratif': ['mairie', 'civil', 'contrat', 'assurance', 'budget', 'paiement', 'acompte', 'facture'],
}

function getTodoCategorie(libelle: string): string {
  const l = libelle.toLowerCase()
  for (const [cat, kws] of Object.entries(CAT_KEYWORDS)) {
    if (kws.some(kw => l.includes(kw))) return cat
  }
  return 'Autres'
}

// ─── Versements ──────────────────────────────────────────────────────────────

const MODE_LABELS: Record<string, string> = {
  orange_money: 'Orange Money', virement: 'Virement', especes: 'Espèces',
  carte: 'Carte', autre: 'Autre',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ActionsDashboard({ uid: _uid, todos, lieu, versements = [], budgetTotal = 0, prestataires }: Props) {
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  const [toast, setToast] = useState('')
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const citation = getCitationDuJour()

  const prestatairesAffiches = (prestataires && prestataires.length > 0) ? prestataires : PRESTATAIRES_DEFAUT

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleCheck = async (todo: Todo) => {
    if (checkedIds.includes(todo.id) || todo.done) return
    setCheckingId(todo.id)
    setCheckedIds(p => [...p, todo.id])
    await fetch(`/api/portail/todos/${todo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    }).catch(() => {})
    setCheckingId(null)
    showToast(`✅ Tâche complétée${todo.rev ? ` · +${todo.rev} REV gagnés` : ''}`)
  }

  // Timeline
  const timeline = todos
    .filter(t => !t.done && t.date_limite)
    .sort((a, b) => new Date(a.date_limite!).getTime() - new Date(b.date_limite!).getTime())
    .slice(0, 3)

  const getDotColor = (dateStr: string) => {
    const j = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
    return j < 7 ? '#C0392B' : j < 14 ? '#C9A84C' : '#7C9A7E'
  }
  const getDelai = (dateStr: string) => {
    const j = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
    if (j < 0) return 'En retard'
    if (j === 0) return "Aujourd'hui"
    return `J-${j}`
  }

  // Todos groupés par catégorie
  const todosDoneCount = todos.filter(t => t.done || checkedIds.includes(t.id)).length
  const pctTodos = todos.length > 0 ? Math.round((todosDoneCount / todos.length) * 100) : 0

  const todosParCategorie: Record<string, Todo[]> = {}
  for (const t of todos) {
    const cat = getTodoCategorie(t.libelle)
    if (!todosParCategorie[cat]) todosParCategorie[cat] = []
    todosParCategorie[cat].push(t)
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* ══ BLOC 6 — PRESTATAIRES STYLE MAGAZINE ════════════════════════════ */}
      <div
        className="rounded-2xl overflow-hidden shadow-sm"
        style={{ border: '1px solid rgba(201,168,76,0.12)' }}
      >
        {/* En-tête */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: '#F5F0E8', borderBottom: '1px solid rgba(201,168,76,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold text-[#888] uppercase tracking-wider">Mes Prestataires</p>
            {prestataires && prestataires.length > 0 && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ background: '#7C9A7E' }}
              >
                {prestataires.length}
              </span>
            )}
          </div>
          <a href="/portail/prestataires" className="text-xs font-medium" style={{ color: '#C9A84C' }}>
            Gérer →
          </a>
        </div>

        {/* Cards prestataires */}
        <div className="bg-white divide-y divide-[#F5F0E8]">
          {prestatairesAffiches.map((p, i) => {
            const s = PRESTATAIRE_STATUT[p.statut] ?? { color: '#888', bg: '#F5F5F5', label: p.statut, dot: '#888' }
            const emoji = TYPE_EMOJI[p.type] ?? TYPE_EMOJI.default
            const confirme = p.statut === 'confirme' || p.statut === 'CONFIRME'
            return (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderTop: i === 0 ? 'none' : '1px solid #F5F0E8' }}
              >
                {/* Avatar emoji */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
                  style={{ background: s.bg }}
                >
                  {emoji}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1A1A1A] truncate">{p.nom}</p>
                  <p className="text-[10px] text-[#888] capitalize">{p.type?.replace(/_/g, ' ')}</p>
                </div>

                {/* Badge statut */}
                <div className="flex-shrink-0 flex items-center gap-1.5">
                  {confirme && (
                    <span className="text-[#7C9A7E] text-sm">✅</span>
                  )}
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3" style={{ background: '#FAFAF8', borderTop: '1px solid #F5F0E8' }}>
          <a
            href="/portail/prestataires"
            className="block w-full py-2 rounded-xl text-xs font-semibold text-center border"
            style={{ borderColor: '#C9A84C', color: '#C9A84C' }}
          >
            + Ajouter un prestataire
          </a>
        </div>
      </div>

      {/* ══ BLOC 7 — TIMELINE ════════════════════════════════════════════════ */}
      {timeline.length > 0 && (
        <div
          className="rounded-2xl p-4 shadow-sm"
          style={{ background: '#fff', border: '1px solid rgba(201,168,76,0.12)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-[#888] uppercase tracking-wider">Prochaines étapes</p>
            <a href="/portail/taches" className="text-xs font-medium" style={{ color: '#C9A84C' }}>Planning →</a>
          </div>
          <div className="space-y-2.5">
            {timeline.map(t => {
              const dotColor = getDotColor(t.date_limite!)
              const delai = getDelai(t.date_limite!)
              return (
                <div key={t.id} className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: dotColor, boxShadow: `0 0 4px ${dotColor}80` }}
                  />
                  <p className="text-sm flex-1 leading-tight text-[#333]">{t.libelle}</p>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: dotColor + '18', color: dotColor }}
                  >
                    {delai}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══ BLOC 8 — CHECKLIST AVEC PROGRESSION ═════════════════════════════ */}
      {todos.length > 0 ? (
        <div
          className="rounded-2xl overflow-hidden shadow-sm"
          style={{ border: '1px solid rgba(201,168,76,0.12)' }}
        >
          {/* En-tête avec progression */}
          <div
            className="px-4 py-3"
            style={{ background: '#F5F0E8', borderBottom: '1px solid rgba(201,168,76,0.15)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-[#888] uppercase tracking-wider">Ma Checklist</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: '#C9A84C' }}>{pctTodos}%</span>
                <a href="/portail/taches" className="text-xs font-medium" style={{ color: '#C9A84C' }}>
                  Tout voir →
                </a>
              </div>
            </div>
            {/* Barre globale */}
            <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pctTodos}%`, background: 'linear-gradient(90deg, #C9A84C, #E8C87A)' }}
              />
            </div>
            <p className="text-[9px] text-[#888] mt-1">{todosDoneCount} / {todos.length} tâches complétées</p>
          </div>

          {/* Tâches groupées par catégorie */}
          <div className="bg-white">
            {(() => {
              const cats = Object.entries(todosParCategorie)
              // Trier : priorité haute en premier, puis par catégorie
              const hautes = todos.filter(t => !t.done && !checkedIds.includes(t.id) && t.priorite === 'haute')
              const displayed: Array<{ cat: string; items: Todo[] }> = []

              if (hautes.length > 0) {
                displayed.push({ cat: '🔴 Urgent', items: hautes.slice(0, 3) })
              }

              // Jusqu'à 3 catégories avec leurs 2 premiers items non-done
              let count = 0
              for (const [cat, items] of cats) {
                if (count >= 3) break
                const pending = items.filter(t => !t.done && !checkedIds.includes(t.id)).slice(0, 2)
                if (pending.length === 0) continue
                if (displayed.find(d => d.cat === `🔴 Urgent`)) {
                  // Éviter doublons avec "Urgent"
                  const filtered = pending.filter(t => t.priorite !== 'haute')
                  if (filtered.length > 0) { displayed.push({ cat, items: filtered }); count++ }
                } else {
                  displayed.push({ cat, items: pending }); count++
                }
              }

              const allDisplayed = displayed.flatMap(d => d.items)
              const reste = todos.filter(t => !t.done && !checkedIds.includes(t.id)).length - allDisplayed.filter(t => !t.done).length

              return (
                <>
                  {displayed.map(({ cat, items }, gi) => (
                    <div key={cat} style={{ borderTop: gi === 0 ? 'none' : '1px solid #F5F0E8' }}>
                      <p className="text-[9px] font-semibold text-[#AAA] uppercase tracking-wider px-4 pt-3 pb-1.5">
                        {cat}
                      </p>
                      {items.map(t => {
                        const isDone = t.done || checkedIds.includes(t.id)
                        const isChecking = checkingId === t.id
                        return (
                          <div
                            key={t.id}
                            className="flex items-center gap-3 px-4 py-2.5"
                            style={{ borderTop: '1px solid #F9F6F0' }}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => handleCheck(t)}
                              disabled={isDone}
                              className="flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                              style={{
                                borderColor: isDone ? '#C9A84C' : t.priorite === 'haute' ? '#C0392B' : '#E8E0D0',
                                background: isDone ? '#C9A84C' : 'white',
                                transform: isChecking ? 'scale(1.2)' : 'scale(1)',
                              }}
                            >
                              {isDone && <span className="text-white text-[10px]">✓</span>}
                            </button>

                            {/* Label */}
                            <span
                              className="text-sm flex-1 leading-snug"
                              style={{
                                color: isDone ? '#CCC' : '#333',
                                textDecoration: isDone ? 'line-through' : 'none',
                              }}
                            >
                              {t.libelle}
                            </span>

                            {/* Badges */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {!isDone && t.priorite === 'haute' && (
                                <span className="text-[9px] font-bold text-red-500">URGENT</span>
                              )}
                              {t.rev && (
                                <span
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C' }}
                                >
                                  +{t.rev}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                  {reste > 0 && (
                    <div className="px-4 py-3 text-center" style={{ borderTop: '1px solid #F5F0E8' }}>
                      <a href="/portail/todo" className="text-xs font-medium" style={{ color: '#C9A84C' }}>
                        +{reste} autre{reste > 1 ? 's' : ''} tâche{reste > 1 ? 's' : ''} →
                      </a>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl p-4 shadow-sm"
          style={{ background: '#fff', border: '1px solid rgba(201,168,76,0.12)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-[#888] uppercase tracking-wider">Ma Checklist</p>
            <a href="/portail/taches" className="text-xs" style={{ color: '#C9A84C' }}>Planning →</a>
          </div>
          <p className="text-sm text-[#AAA] text-center py-2">Votre planning se prépare — votre coordinateur va bientôt le compléter ✨</p>
          <a
            href="/portail/taches"
            className="block w-full py-2 rounded-xl text-xs font-semibold text-center text-white mt-1"
            style={{ background: '#C9A84C' }}
          >
            Voir mon planning →
          </a>
        </div>
      )}

      {/* ══ MÉTÉO ════════════════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl p-4 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)' }}
      >
        <div className="text-4xl">🌤️</div>
        <div>
          <p className="text-white font-semibold">29°C · {lieu || 'Kribi'}</p>
          <p className="text-white/60 text-xs">Partiellement nuageux · Humidité 75%</p>
          <p className="text-white/30 text-[10px] mt-0.5">Conditions idéales pour un mariage en plein air</p>
        </div>
      </div>

      {/* ══ VERSEMENTS ═══════════════════════════════════════════════════════ */}
      {(() => {
        const vArray = Array.isArray(versements) ? versements : []
        const totalConfirme = vArray.filter(v => v.statut === 'confirme').reduce((s, v) => s + v.montant, 0)
        const totalDeclare = vArray.reduce((s, v) => s + v.montant, 0)
        const resteAPayer = budgetTotal > 0 ? Math.max(0, budgetTotal - totalConfirme) : null
        const pct = budgetTotal > 0 ? Math.min(100, Math.round((totalConfirme / budgetTotal) * 100)) : 0
        return (
          <div
            className="rounded-2xl overflow-hidden shadow-sm"
            style={{ border: '1px solid rgba(201,168,76,0.12)' }}
          >
            {/* En-tête */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ background: '#F5F0E8', borderBottom: '1px solid rgba(201,168,76,0.15)' }}
            >
              <p className="text-[10px] font-semibold text-[#888] uppercase tracking-wider">Mes Versements</p>
              <a href="/portail/ma-commande" className="text-xs font-medium" style={{ color: '#C9A84C' }}>
                Déclarer →
              </a>
            </div>

            <div className="bg-white px-4 py-4">
              {budgetTotal > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#888]">
                      Payé : <strong style={{ color: '#7C9A7E' }}>{formatFCFA(totalConfirme)}</strong>
                    </span>
                    {resteAPayer !== null && (
                      <span className="text-[#888]">
                        Reste : <strong className="text-[#1A1A1A]">{formatFCFA(resteAPayer)}</strong>
                      </span>
                    )}
                  </div>
                  <div className="h-2.5 bg-[#F5F0E8] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: '#C9A84C' }}
                    />
                  </div>
                  <p className="text-[9px] text-[#AAA] mt-1">{pct}% du budget réglé</p>
                </div>
              )}

              {vArray.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {vArray.slice(-5).map((v, i) => {
                    const sc = v.statut === 'confirme' ? '#7C9A7E' : '#C9A84C'
                    const sl = v.statut === 'confirme' ? '✅ Confirmé' : '⏳ Déclaré'
                    return (
                      <div
                        key={v.id ?? i}
                        className="flex items-center justify-between py-2"
                        style={{ borderBottom: i < vArray.slice(-5).length - 1 ? '1px solid #F5F0E8' : 'none' }}
                      >
                        <div>
                          <p className="text-xs text-[#888]">
                            {v.date ? new Date(v.date).toLocaleDateString('fr-FR') : '—'}
                            {v.mode ? ` · ${MODE_LABELS[v.mode] ?? v.mode}` : ''}
                          </p>
                          {v.note && <p className="text-[10px] text-[#AAA] truncate max-w-[140px]">{v.note}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#1A1A1A]">{formatFCFA(v.montant)}</span>
                          <span
                            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ background: sc + '18', color: sc }}
                          >
                            {sl}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  {totalDeclare > totalConfirme && (
                    <p className="text-[10px] text-center" style={{ color: '#C9A84C' }}>
                      ⏳ {formatFCFA(totalDeclare - totalConfirme)} en attente de confirmation
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#888] text-center py-2 mb-3">
                  Aucun versement déclaré pour l&apos;instant
                </p>
              )}

              <a
                href="/portail/ma-commande"
                className="block w-full py-2.5 rounded-xl text-xs font-semibold text-center text-white"
                style={{ background: '#C9A84C' }}
              >
                + Déclarer un versement
              </a>
            </div>
          </div>
        )
      })()}

      {/* ══ CITATION DU JOUR ════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, #1A1A1A 0%, #2C1F0E 100%)',
          border: '1px solid rgba(201,168,76,0.2)',
        }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'rgba(201,168,76,0.5)' }}
        >
          ✦ Citation du jour
        </p>
        <p className="text-sm italic text-white/70 leading-relaxed">&ldquo;{citation}&rdquo;</p>
      </div>

      <div className="h-4" />
    </div>
  )
}
