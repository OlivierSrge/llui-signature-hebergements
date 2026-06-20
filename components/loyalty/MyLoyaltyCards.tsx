'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface MyCard {
  card_id: string
  program_id: string
  programme_nom: string
  partenaire_name: string
  niveau_actuel: string
  niveau_nom: string
  niveau_emoji: string
  niveau_couleur: string
  points_cumules: number
  statut: string
  expires_at?: string
  created_at?: string
}

function jours(d: string) {
  return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000))
}

function CardChip({ card }: { card: MyCard }) {
  const isActive = card.statut === 'ACTIVE'
  const isPending = card.statut === 'PENDING'
  const expiresJ = card.expires_at ? jours(card.expires_at) : null

  return (
    <Link href={`/loyalty/card/${card.card_id}`} className="block">
      <div
        className="rounded-2xl p-4 border-l-4 space-y-2 min-w-[200px] transition-opacity hover:opacity-90"
        style={{
          borderLeftColor: isActive ? card.niveau_couleur : '#ccc',
          backgroundColor: isActive ? card.niveau_couleur + '12' : '#f5f5f5',
        }}
      >
        {/* Niveau */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">{card.niveau_emoji}</span>
            <p className="text-xs font-bold text-[#1A1A1A]">{card.niveau_nom}</p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            isActive  ? 'bg-green-100 text-green-700' :
            isPending ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-500'
          }`}>
            {isActive ? 'ACTIVE' : isPending ? 'EN ATTENTE' : card.statut}
          </span>
        </div>

        {/* Partenaire */}
        <p className="text-[11px] font-semibold text-[#1A1A1A] truncate">{card.partenaire_name}</p>
        <p className="text-[10px] text-[#1A1A1A]/50 truncate">{card.programme_nom}</p>

        {/* Points + expiration */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#1A1A1A]/70">
            <span className="font-bold text-[#C9A84C]">{card.points_cumules ?? 0}</span> pts
          </p>
          {expiresJ !== null && isActive && (
            <p className={`text-[10px] ${expiresJ < 30 ? 'text-red-500' : 'text-[#1A1A1A]/40'}`}>
              J-{expiresJ}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

interface Props {
  phone: string
}

export default function MyLoyaltyCards({ phone }: Props) {
  const [cards, setCards] = useState<MyCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!phone) { setLoading(false); return }
    fetch(`/api/loyalty/my-cards?phone=${encodeURIComponent(phone)}`)
      .then((r) => r.json())
      .then((d: { cards: MyCard[] }) => setCards(d.cards ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [phone])

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2].map((i) => (
          <div key={i} className="min-w-[200px] h-28 rounded-2xl bg-[#F5F0E8] animate-pulse flex-shrink-0" />
        ))}
      </div>
    )
  }

  if (cards.length === 0) return null

  return (
    <div>
      <p className="text-xs text-[#1A1A1A]/50 mb-2">
        {cards.length} carte{cards.length !== 1 ? 's' : ''} fidélité
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {cards.map((c) => (
          <div key={c.card_id} className="flex-shrink-0 w-[220px]">
            <CardChip card={c} />
          </div>
        ))}
      </div>
    </div>
  )
}
