'use client'
// components/alliance-privee/MemberDashboardClient.tsx

import { useState } from 'react'
import Link from 'next/link'
import type { MemberDashboardStats } from '@/actions/alliance-privee-matching'
import type { CompatibilityMatch } from '@/lib/alliance-privee-matching'
import ProfilCard from './ProfilCard'
import CompatibilityBadge from './CompatibilityBadge'

interface Props {
  memberId: string
  prenom: string
  tier: string
  stats: MemberDashboardStats
  profilsCompatibles: CompatibilityMatch[]
}

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Accueil', icon: '◈', href: null },
  { key: 'profils', label: 'Profils compatibles', icon: '💫', href: '/alliance-privee/profils-compatibles' },
  { key: 'interets', label: 'Mes intérêts', icon: '⭐', href: '/alliance-privee/mes-interets' },
  { key: 'recus', label: 'Intérêts reçus', icon: '🌟', href: '/alliance-privee/interets-recus' },
  { key: 'conversations', label: 'Conversations', icon: '💬', href: '/alliance-privee/conversations' },
]

export default function MemberDashboardClient({ memberId, prenom, tier, stats, profilsCompatibles }: Props) {
  const [activeTab] = useState('dashboard')

  const StatCard = ({
    icon,
    label,
    value,
    href,
    highlight,
  }: {
    icon: string
    label: string
    value: number
    href: string
    highlight?: boolean
  }) => (
    <Link
      href={href}
      className={`relative flex flex-col gap-2 p-5 rounded-2xl border transition-all hover:scale-[1.02] ${
        highlight && value > 0
          ? 'border-amber-500/40 bg-amber-500/5'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span
        className={`text-3xl font-light tabular-nums ${
          highlight && value > 0 ? 'text-amber-400' : 'text-white'
        }`}
      >
        {value}
      </span>
      <span className="text-xs text-white/40 uppercase tracking-wide">{label}</span>
      {highlight && value > 0 && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      )}
    </Link>
  )

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header membre */}
      <div className="border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-500/60 uppercase tracking-wider">Alliance Privée</p>
            <h1 className="text-white font-light text-lg">
              Bonjour, <span className="text-amber-400">{prenom}</span>
            </h1>
          </div>
          <span className="text-xs text-white/30 border border-white/10 rounded-full px-3 py-1">
            {tier}
          </span>
        </div>
      </div>

      {/* Navigation secondaire */}
      <nav className="border-b border-white/5 bg-black/50">
        <div className="max-w-5xl mx-auto px-5">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
            {NAV_ITEMS.map((item) => (
              item.href ? (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/80 hover:bg-white/5 transition-all whitespace-nowrap"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.key === 'recus' && stats.interets_recus > 0 && (
                    <span className="bg-amber-500 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {stats.interets_recus}
                    </span>
                  )}
                  {item.key === 'conversations' && stats.messages_non_lus > 0 && (
                    <span className="bg-amber-500 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {stats.messages_non_lus}
                    </span>
                  )}
                </Link>
              ) : (
                <span
                  key={item.key}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-amber-400 bg-amber-500/10 whitespace-nowrap"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              )
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 py-8 space-y-10">
        {/* Stats */}
        <section>
          <h2 className="text-sm text-white/40 uppercase tracking-wider mb-4">Vue d'ensemble</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon="💎"
              label="Matchs actifs"
              value={stats.matchs_actifs}
              href="/alliance-privee/conversations"
            />
            <StatCard
              icon="🌟"
              label="Intérêts reçus"
              value={stats.interets_recus}
              href="/alliance-privee/interets-recus"
              highlight
            />
            <StatCard
              icon="💬"
              label="Messages non lus"
              value={stats.messages_non_lus}
              href="/alliance-privee/conversations"
              highlight
            />
            <StatCard
              icon="⭐"
              label="Intérêts envoyés"
              value={stats.interets_envoyes}
              href="/alliance-privee/mes-interets"
            />
          </div>
        </section>

        {/* Profils compatibles */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm text-white/40 uppercase tracking-wider">
              Profils compatibles
              {profilsCompatibles.length > 0 && (
                <span className="ml-2 text-amber-400">({profilsCompatibles.length})</span>
              )}
            </h2>
            <Link
              href="/alliance-privee/profils-compatibles"
              className="text-xs text-amber-500/70 hover:text-amber-400 transition-colors"
            >
              Voir tous →
            </Link>
          </div>

          {profilsCompatibles.length === 0 ? (
            <div className="text-center py-12 border border-white/5 rounded-2xl">
              <p className="text-4xl mb-3">◈</p>
              <p className="text-white/40 text-sm">Aucun profil compatible pour l'instant.</p>
              <p className="text-white/25 text-xs mt-1">Les profils sont ajoutés régulièrement.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profilsCompatibles.slice(0, 3).map((match) => (
                <ProfilCard
                  key={match.profile.id}
                  match={match}
                  currentMemberId={memberId}
                />
              ))}
            </div>
          )}
        </section>

        {/* Meilleur match */}
        {profilsCompatibles.length > 0 && profilsCompatibles[0].score >= 75 && (
          <section className="border border-amber-500/20 rounded-2xl bg-amber-500/5 p-6">
            <div className="flex items-start gap-4">
              <span className="text-3xl">💎</span>
              <div className="flex-1">
                <p className="text-amber-400 font-semibold text-sm">Votre meilleur match</p>
                <p className="text-white mt-1">
                  <strong>{profilsCompatibles[0].profile.prenom}</strong>, {profilsCompatibles[0].profile.age} ans — {profilsCompatibles[0].profile.profession}
                </p>
                <div className="mt-2">
                  <CompatibilityBadge
                    score={profilsCompatibles[0].score}
                    level={profilsCompatibles[0].level}
                    size="md"
                  />
                </div>
              </div>
              <Link
                href="/alliance-privee/profils-compatibles"
                className="text-xs border border-amber-500/30 text-amber-400 rounded-lg px-3 py-1.5 hover:bg-amber-500/10 transition-all"
              >
                Voir →
              </Link>
            </div>
          </section>
        )}

        {/* Rappel Sentinelle */}
        <section className="flex items-start gap-3 text-xs text-white/30 border border-white/5 rounded-xl p-4">
          <span className="text-lg flex-shrink-0">🛡</span>
          <div>
            <p className="text-white/50 font-medium mb-0.5">Sentinelle IA active</p>
            <p>
              Tous vos échanges sont protégés. L'échange de coordonnées directes (téléphone, email,
              réseaux sociaux) est bloqué automatiquement — les rendez-vous sont organisés
              exclusivement par L&amp;Lui Signature.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
