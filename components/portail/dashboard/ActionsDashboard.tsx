'use client'
// BLOCS 6, 7, 8, 10, 11, 12 — Prestataires + Timeline + Tâches + Météo + Versements + Citation

import { useState } from 'react'
import { getCitationDuJour } from '@/lib/citations'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

interface Todo { id: string; libelle: string; done: boolean; date_limite?: string | null; rev?: number; priorite?: string }
interface Versement { label: string; statut: 'payé' | 'en_attente' | 'en_retard' | 'à_venir'; montant: number }
interface Prestataire { nom: string; statut: string; type: string }

interface Props {
  uid: string
  todos: Todo[]
  lieu: string
  versements?: Versement[]
  hasCommande?: boolean
  prestataires?: Prestataire[]
}

// Couleurs prestataires par statut (Firestore) — mapping flexible
const PRESTATAIRE_STATUT_COLOR: Record<string, string> = {
  confirme:    '#7C9A7E',
  a_confirmer: '#C9A84C',
  devis:       '#3B82F6',
  annule:      '#C0392B',
  // Compatibilité ancienne nomenclature
  CONFIRME:    '#7C9A7E',
  A_CONFIRMER: '#C9A84C',
  DEVIS_RECU:  '#3B82F6',
  ANNULE:      '#C0392B',
}

const PRESTATAIRE_STATUT_LABEL: Record<string, string> = {
  confirme:    'Confirmé',
  a_confirmer: 'À confirmer',
  devis:       'Devis reçu',
  annule:      'Annulé',
  CONFIRME:    'Confirmé',
  A_CONFIRMER: 'À confirmer',
  DEVIS_RECU:  'Devis reçu',
  ANNULE:      'Annulé',
}

const PRESTATAIRES_DEFAUT: Prestataire[] = [
  { nom: 'L&Lui Signature', statut: 'confirme', type: 'wedding_planner' },
  { nom: 'Photographe', statut: 'a_confirmer', type: 'photo' },
  { nom: 'Traiteur', statut: 'a_confirmer', type: 'traiteur' },
]

const STATUT_COLOR: Record<string, string> = {
  payé: '#7C9A7E', en_attente: '#C9A84C', en_retard: '#C0392B', 'à_venir': '#888'
}

export default function ActionsDashboard({ uid, todos, lieu, versements = [], hasCommande = false, prestataires }: Props) {
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  const [toast, setToast] = useState('')
  const citation = getCitationDuJour()

  // Prestataires depuis Firestore ou fallback sur défauts
  const prestatairesAffiches = (prestataires && prestataires.length > 0) ? prestataires : PRESTATAIRES_DEFAUT

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleCheck = async (todo: Todo) => {
    if (checkedIds.includes(todo.id) || todo.done) return
    setCheckedIds(p => [...p, todo.id])
    await fetch(`/api/portail/todos/${todo.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true })
    }).catch(() => {})
    showToast(`✓ Tâche cochée${todo.rev ? ` · +${todo.rev} REV gagnés` : ''}`)
  }

  // BLOC 7 — Timeline (todos avec date_limite)
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

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-sm px-4 py-2 rounded-xl shadow-lg">{toast}</div>}

      {/* BLOC 6 — Prestataires (depuis Firestore ou défaut) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">Mes Prestataires</p>
            {prestataires && prestataires.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ background: '#7C9A7E' }}>
                {prestataires.length}
              </span>
            )}
          </div>
          <a href="/portail/prestataires" className="text-xs text-[#C9A84C]">Gérer →</a>
        </div>
        <div className="space-y-2">
          {prestatairesAffiches.map((p, i) => {
            const color = PRESTATAIRE_STATUT_COLOR[p.statut] ?? '#888'
            const label = PRESTATAIRE_STATUT_LABEL[p.statut] ?? p.statut
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-sm flex-1 truncate">{p.nom}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: color + '22', color }}>{label}</span>
              </div>
            )
          })}
        </div>
        <a href="/portail/prestataires" className="mt-3 block w-full py-2 rounded-xl text-xs font-semibold text-center border border-[#C9A84C] text-[#C9A84C]">+ Ajouter un prestataire</a>
      </div>

      {/* BLOC 7 — Timeline (todos avec date_limite) */}
      {timeline.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">Prochaines étapes</p>
            <a href="/portail/todo" className="text-xs text-[#C9A84C]">Todo →</a>
          </div>
          <div className="space-y-2">
            {timeline.map(t => (
              <div key={t.id} className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: getDotColor(t.date_limite!) }} />
                <p className="text-sm flex-1 leading-tight">{t.libelle}</p>
                <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: getDotColor(t.date_limite!) }}>{getDelai(t.date_limite!)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BLOC 8 — Mes Tâches priorité haute en premier, puis les autres */}
      {todos.length > 0 ? (() => {
        // 3 tâches "haute" non-done en premier, puis compléter avec les autres jusqu'à 5
        const hautes = todos.filter(t => !t.done && !checkedIds.includes(t.id) && t.priorite === 'haute').slice(0, 3)
        const autresIds = new Set(hautes.map(t => t.id))
        const autres = todos.filter(t => !autresIds.has(t.id)).slice(0, Math.max(0, 5 - hautes.length))
        const displayed = [...hautes, ...autres]
        const reste = todos.length - displayed.length
        return (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">Mes Tâches</p>
                {hautes.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ background: '#C0392B' }}>
                    {hautes.length} urgente{hautes.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <a href="/portail/todo" className="text-xs text-[#C9A84C]">Gérer →</a>
            </div>
            <div className="space-y-2">
              {displayed.map(t => {
                const isDone = t.done || checkedIds.includes(t.id)
                const isHaute = t.priorite === 'haute' && !isDone
                return (
                  <div key={t.id} className="flex items-center gap-2">
                    <button
                      onClick={() => handleCheck(t)}
                      className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                      style={{ borderColor: isDone ? '#C9A84C' : isHaute ? '#C0392B' : '#E8E0D0', background: isDone ? '#C9A84C' : 'white' }}
                    >
                      {isDone && <span className="text-white text-[10px]">✓</span>}
                    </button>
                    <span className={`text-sm flex-1 ${isDone ? 'line-through text-[#AAA]' : ''}`}>{t.libelle}</span>
                    {isHaute && <span className="text-[9px] text-red-500 font-semibold">!</span>}
                    {t.rev && <span className="text-[10px] text-[#C9A84C] font-semibold">+{t.rev}</span>}
                  </div>
                )
              })}
            </div>
            {reste > 0 && (
              <a href="/portail/todo" className="mt-2 block text-center text-xs text-[#C9A84C]">
                +{reste} autre{reste > 1 ? 's' : ''} tâche{reste > 1 ? 's' : ''} →
              </a>
            )}
          </div>
        )
      })() : (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">Mes Tâches</p>
            <a href="/portail/todo" className="text-xs text-[#C9A84C]">Gérer →</a>
          </div>
          <p className="text-sm text-[#AAA] text-center py-2">Votre planning est vierge — commencez par ajouter vos premières tâches ✨</p>
          <a href="/portail/todo" className="block w-full py-2 rounded-xl text-xs font-semibold text-center text-white mt-1" style={{ background: '#C9A84C' }}>
            + Créer mes tâches
          </a>
        </div>
      )}

      {/* BLOC 10 — Météo Kribi */}
      <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #1A1A2E, #16213E)' }}>
        <div className="text-4xl">🌤️</div>
        <div>
          <p className="text-white font-semibold">29°C — {lieu || 'Kribi'}</p>
          <p className="text-white/60 text-xs">Partiellement nuageux · Humidité 75%</p>
          <p className="text-white/40 text-[10px]">Conditions idéales pour un mariage en plein air</p>
        </div>
      </div>

      {/* BLOC 11 — Versements 30/40/30 (depuis Firestore mariés/[uid].versements) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">Mes Versements</p>
        </div>
        {hasCommande && versements.length > 0 ? (
          <>
            {versements.map((v, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-[#F5F0E8] last:border-0">
                <span className="text-sm">{v.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{formatFCFA(v.montant)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: (STATUT_COLOR[v.statut] ?? '#888') + '22', color: STATUT_COLOR[v.statut] ?? '#888' }}>
                    {v.statut.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
            <a href="/portail/ma-commande" className="mt-3 block w-full py-2 rounded-xl text-xs font-semibold text-center text-white" style={{ background: '#C9A84C' }}>
              Déclarer un versement →
            </a>
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-[#888] mb-2">Budget en cours de définition par votre coordinateur L&amp;Lui Signature</p>
            <a href="/portail/panier" className="inline-block px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#C9A84C' }}>
              Créer mon devis →
            </a>
          </div>
        )}
      </div>

      {/* BLOC 12 — Citation du jour */}
      <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ borderLeft: '3px solid #C9A84C' }}>
        <p className="text-sm italic text-[#666] leading-relaxed">&ldquo;{citation}&rdquo;</p>
      </div>

      {/* Padding bottom pour nav mobile */}
      <div className="h-4" />
    </div>
  )
}
