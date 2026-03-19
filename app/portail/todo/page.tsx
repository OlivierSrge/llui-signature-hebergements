'use client'
// app/portail/todo/page.tsx
// Tâches mariage — Firestore + gamification REV

import { useEffect, useState } from 'react'

interface TodoItem {
  id: string
  libelle: string
  done: boolean
  rev_prime: number   // REV gagnés en cochant cette tâche
  categorie: string
}

const DEFAULTS: Omit<TodoItem, 'id'>[] = [
  { libelle: 'Réserver la salle de réception', done: false, rev_prime: 10, categorie: 'Logistique' },
  { libelle: 'Choisir le traiteur', done: false, rev_prime: 8, categorie: 'Logistique' },
  { libelle: 'Commander les faire-parts', done: false, rev_prime: 5, categorie: 'Communication' },
  { libelle: 'Envoyer les invitations', done: false, rev_prime: 5, categorie: 'Communication' },
  { libelle: 'Choisir la robe / tenue', done: false, rev_prime: 10, categorie: 'Tenues' },
  { libelle: 'Réserver le photographe', done: false, rev_prime: 8, categorie: 'Prestataires' },
  { libelle: 'Planifier la décoration', done: false, rev_prime: 6, categorie: 'Décoration' },
  { libelle: 'Organiser le transport invités', done: false, rev_prime: 5, categorie: 'Logistique' },
]

function getUidFromCookie(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/portail_uid=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

const CAT_COLORS: Record<string, string> = {
  'Logistique': '#C9A84C',
  'Communication': '#0F52BA',
  'Tenues': '#C0392B',
  'Prestataires': '#7C9A7E',
  'Décoration': '#888888',
}

export default function TodoPage() {
  const [uid] = useState(() => getUidFromCookie())
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newLibelle, setNewLibelle] = useState('')
  const [newCat, setNewCat] = useState('Logistique')
  const [totalRevGagnes, setTotalRevGagnes] = useState(0)

  useEffect(() => {
    fetch(`/api/portail/todos?uid=${uid}`)
      .then(r => r.json())
      .then((data: TodoItem[]) => {
        if (data.length === 0) {
          setTodos(DEFAULTS.map((d, i) => ({ ...d, id: `default-${i}` })))
        } else {
          setTodos(data)
        }
        setLoading(false)
      })
      .catch(() => {
        setTodos(DEFAULTS.map((d, i) => ({ ...d, id: `default-${i}` })))
        setLoading(false)
      })
  }, [uid])

  async function toggleTodo(todo: TodoItem) {
    const next = !todo.done
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: next } : t))
    if (next) setTotalRevGagnes(r => r + todo.rev_prime)
    else setTotalRevGagnes(r => Math.max(0, r - todo.rev_prime))

    await fetch('/api/portail/todos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, id: todo.id, done: next }),
    }).catch(() => {})
  }

  async function ajouterTodo() {
    if (!newLibelle.trim()) return
    const newTodo: TodoItem = {
      id: `local-${Date.now()}`,
      libelle: newLibelle.trim(),
      done: false,
      rev_prime: 3,
      categorie: newCat,
    }
    setTodos(prev => [...prev, newTodo])
    setShowModal(false)
    setNewLibelle('')

    await fetch('/api/portail/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, libelle: newTodo.libelle, categorie: newTodo.categorie, rev_prime: 3 }),
    }).catch(() => {})
  }

  const done = todos.filter(t => t.done).length
  const total = todos.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  if (loading) return <div className="text-center py-16 text-[#888] text-sm">Chargement…</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="font-serif italic text-2xl text-[#1A1A1A]">Mes Tâches</h1>
          <p className="text-sm text-[#888] mt-1">{done}/{total} complétées</p>
        </div>
        {totalRevGagnes > 0 && (
          <div className="bg-[#C9A84C]/10 rounded-xl px-3 py-2 text-right">
            <p className="text-[10px] text-[#888]">REV gagnés</p>
            <p className="text-lg font-bold text-[#C9A84C]">+{totalRevGagnes}</p>
          </div>
        )}
      </div>

      {/* Barre de progression */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] mb-4">
        <div className="flex justify-between text-xs text-[#888] mb-1.5">
          <span>Progression</span>
          <span>{pct}%</span>
        </div>
        <div className="h-3 bg-[#F5F0E8] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: pct === 100 ? '#7C9A7E' : '#C9A84C' }}
          />
        </div>
      </div>

      {/* Liste des tâches */}
      <div className="space-y-2 mb-24">
        {todos.map(todo => (
          <button
            key={todo.id}
            onClick={() => toggleTodo(todo)}
            className="w-full bg-white rounded-xl p-4 shadow-sm border border-[#F5F0E8] flex items-center gap-3 text-left transition-all hover:shadow-md"
          >
            <div
              className="w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all"
              style={{
                background: todo.done ? '#7C9A7E' : 'transparent',
                borderColor: todo.done ? '#7C9A7E' : '#DDD',
              }}
            >
              {todo.done && <span className="text-white text-xs font-bold">✓</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${todo.done ? 'line-through text-[#AAA]' : 'text-[#1A1A1A]'}`}>
                {todo.libelle}
              </p>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-block"
                style={{
                  background: (CAT_COLORS[todo.categorie] ?? '#888') + '22',
                  color: CAT_COLORS[todo.categorie] ?? '#888',
                }}
              >
                {todo.categorie}
              </span>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-[#C9A84C] font-semibold">+{todo.rev_prime} REV</p>
            </div>
          </button>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-white text-2xl font-bold shadow-lg flex items-center justify-center"
        style={{ background: '#C9A84C' }}
        aria-label="Ajouter une tâche"
      >
        +
      </button>

      {/* Modal ajout */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-serif italic text-xl text-[#1A1A1A] mb-4">Nouvelle tâche</h2>
            <input
              type="text"
              placeholder="Libellé de la tâche…"
              value={newLibelle}
              onChange={e => setNewLibelle(e.target.value)}
              className="w-full border border-[#E8E0D0] rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:border-[#C9A84C]"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && ajouterTodo()}
            />
            <select
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              className="w-full border border-[#E8E0D0] rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-[#C9A84C]"
            >
              {Object.keys(CAT_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={ajouterTodo}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white"
              style={{ background: '#C9A84C' }}
            >
              Ajouter (+3 REV)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
