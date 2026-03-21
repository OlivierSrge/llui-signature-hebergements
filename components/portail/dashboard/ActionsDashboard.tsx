'use client'
// BLOCS 6, 7, 8, 10, 11, 12 — Prestataires + Timeline + Tâches + Météo + Versements + Citation

import { useState } from 'react'
import { getCitationDuJour } from '@/lib/citations'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

interface Todo { id: string; libelle: string; done: boolean; date_limite?: string | null; rev?: number }
interface Versement { label: string; statut: 'payé' | 'en_attente' | 'en_retard' | 'à_venir'; montant: number }

interface Props {
  uid: string
  todos: Todo[]
  lieu: string
  versements?: Versement[]
  hasCommande?: boolean
}

const PRESTATAIRES_DEFAUT = [
  { nom: 'L&Lui Signature', cat: 'Coordination', statut: 'Confirmé', color: '#7C9A7E' },
  { nom: 'Photographe', cat: 'Photo & Vidéo', statut: 'À confirmer', color: '#C9A84C' },
  { nom: 'Traiteur', cat: 'Traiteur', statut: 'À confirmer', color: '#C9A84C' },
]

const STATUT_COLOR: Record<string, string> = {
  payé: '#7C9A7E', en_attente: '#C9A84C', en_retard: '#C0392B', 'à_venir': '#888'
}

export default function ActionsDashboard({ uid, todos, lieu, versements = [], hasCommande = false }: Props) {
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  const [toast, setToast] = useState('')
  const citation = getCitationDuJour()

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

      {/* BLOC 6 — Prestataires */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">Mes Prestataires</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ background: '#C9A84C' }}>NOUVEAU</span>
          </div>
          <a href="/portail/prestataires" className="text-xs text-[#C9A84C]">Gérer →</a>
        </div>
        <div className="space-y-2">
          {PRESTATAIRES_DEFAUT.map(p => (
            <div key={p.nom} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
              <span className="text-sm flex-1 truncate">{p.nom}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: p.color + '22', color: p.color }}>{p.statut}</span>
            </div>
          ))}
        </div>
        <a href="/portail/prestataires" className="mt-3 block w-full py-2 rounded-xl text-xs font-semibold text-center border border-[#C9A84C] text-[#C9A84C]">+ Ajouter un prestataire</a>
      </div>

      {/* BLOC 7 — Timeline */}
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

      {/* BLOC 8 — Mes Tâches */}
      {todos.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">Mes Tâches</p>
            <a href="/portail/todo" className="text-xs text-[#C9A84C]">Voir tout →</a>
          </div>
          <div className="space-y-2">
            {todos.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center gap-2">
                <button onClick={() => handleCheck(t)} className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                  style={{ borderColor: t.done || checkedIds.includes(t.id) ? '#C9A84C' : '#E8E0D0', background: t.done || checkedIds.includes(t.id) ? '#C9A84C' : 'white' }}>
                  {(t.done || checkedIds.includes(t.id)) && <span className="text-white text-[10px]">✓</span>}
                </button>
                <span className={`text-sm flex-1 ${t.done || checkedIds.includes(t.id) ? 'line-through text-[#AAA]' : ''}`}>{t.libelle}</span>
                {t.rev && <span className="text-[10px] text-[#C9A84C] font-semibold">+{t.rev}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BLOC 10 — Météo mock */}
      <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #1A1A2E, #16213E)' }}>
        <div className="text-4xl">🌤️</div>
        <div>
          <p className="text-white font-semibold">29°C — {lieu || 'Kribi'}</p>
          <p className="text-white/60 text-xs">Partiellement nuageux · Humidité 75%</p>
          <p className="text-white/40 text-[10px]">Conditions idéales pour un mariage en plein air</p>
        </div>
      </div>

      {/* BLOC 11 — Versements */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">Mes Versements</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ background: '#C9A84C' }}>NOUVEAU</span>
          </div>
        </div>
        {hasCommande ? (
          <>
            {versements.map((v, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-[#F5F0E8] last:border-0">
                <span className="text-sm">{v.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{formatFCFA(v.montant)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: STATUT_COLOR[v.statut] + '22', color: STATUT_COLOR[v.statut] }}>{v.statut}</span>
                </div>
              </div>
            ))}
            <a href="/portail/ma-commande" className="mt-3 block w-full py-2 rounded-xl text-xs font-semibold text-center text-white" style={{ background: '#C9A84C' }}>Déclarer un versement →</a>
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-[#888] mb-2">Aucune commande en cours</p>
            <a href="/portail/panier" className="inline-block px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#C9A84C' }}>Créer mon devis →</a>
          </div>
        )}
      </div>

      {/* BLOC 12 — Citation du jour */}
      <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ borderLeft: '3px solid #C9A84C' }}>
        <p className="text-sm italic text-[#666] leading-relaxed">"{citation}"</p>
      </div>
    </div>
  )
}
