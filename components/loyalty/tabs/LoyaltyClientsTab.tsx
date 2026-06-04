'use client'

import { useState, useEffect } from 'react'
import { getLoyaltyCards } from '@/actions/loyalty'
import type { LoyaltyCard } from '@/types/loyalty'

const NIVEAU_COLORS: Record<string, string> = {
  bronze: '#888888',
  argent: '#A8A9AD',
  or: '#C9A84C',
}

const NIVEAU_EMOJI: Record<string, string> = {
  bronze: '🤍',
  argent: '🩷',
  or: '💎',
}

export default function LoyaltyClientsTab({ programId }: { programId: string }) {
  const [cards, setCards] = useState<(LoyaltyCard & { card_id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterNiveau, setFilterNiveau] = useState<string>('')

  useEffect(() => {
    if (!programId) return
    setLoading(true)
    getLoyaltyCards(programId).then(({ cards: c = [] }) => {
      setCards(c)
      setLoading(false)
    })
  }, [programId])

  const filtered = cards.filter((c) => {
    const matchSearch =
      !search ||
      c.client_nom.toLowerCase().includes(search.toLowerCase()) ||
      c.client_email.toLowerCase().includes(search.toLowerCase())
    const matchNiveau = !filterNiveau || c.niveau_actuel === filterNiveau
    return matchSearch && matchNiveau
  })

  if (loading) return <div className="text-[#F5F0E8]/50 text-center py-8">Chargement...</div>

  return (
    <div>
      {/* Filtres */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          type="text"
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-[#0A0A0A] border border-[#C9A84C]/20 text-[#F5F0E8] px-3 py-2 rounded-lg text-sm placeholder-[#F5F0E8]/30"
        />
        <select
          value={filterNiveau}
          onChange={(e) => setFilterNiveau(e.target.value)}
          className="bg-[#0A0A0A] border border-[#C9A84C]/20 text-[#F5F0E8] px-3 py-2 rounded-lg text-sm"
        >
          <option value="">Tous les niveaux</option>
          <option value="bronze">🤍 Bronze</option>
          <option value="argent">🩷 Argent</option>
          <option value="or">💎 Or</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-[#F5F0E8]/40 text-center py-10">
          {cards.length === 0 ? 'Aucun client pour le moment.' : 'Aucun résultat pour ces filtres.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div
              key={c.card_id}
              className="bg-[#0A0A0A] border border-[#C9A84C]/10 rounded-lg px-4 py-3 flex items-center gap-4"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: `${NIVEAU_COLORS[c.niveau_actuel] ?? '#888'}20` }}
              >
                {NIVEAU_EMOJI[c.niveau_actuel] ?? '🎫'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#F5F0E8] text-sm font-medium truncate">{c.client_nom}</p>
                <p className="text-[#F5F0E8]/40 text-xs truncate">{c.client_email}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className="text-sm font-semibold"
                  style={{ color: NIVEAU_COLORS[c.niveau_actuel] ?? '#888' }}
                >
                  {c.points_cumules} pts
                </p>
                <p className="text-[#F5F0E8]/40 text-xs">{c.nombre_utilisations} visites</p>
              </div>
              <div className="flex-shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.statut === 'ACTIVE'
                      ? 'bg-green-900/40 text-green-400'
                      : 'bg-red-900/40 text-red-400'
                  }`}
                >
                  {c.statut}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[#F5F0E8]/30 text-xs mt-4 text-right">
        {filtered.length} client{filtered.length > 1 ? 's' : ''}
      </p>
    </div>
  )
}
