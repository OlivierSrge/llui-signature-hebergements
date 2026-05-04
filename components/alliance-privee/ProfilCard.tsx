'use client'
// components/alliance-privee/ProfilCard.tsx

import { useState } from 'react'
import Image from 'next/image'
import { marquerInteret } from '@/actions/alliance-privee-matching'
import CompatibilityBadge from './CompatibilityBadge'
import type { CompatibilityMatch } from '@/lib/alliance-privee-matching'
import { TIER_CONFIGS } from '@/types/alliance-privee'

interface Props {
  match: CompatibilityMatch
  currentMemberId: string
  alreadyInterested?: boolean
}

export default function ProfilCard({ match, currentMemberId, alreadyInterested = false }: Props) {
  const { profile, score, level } = match
  const [interested, setInterested] = useState(alreadyInterested)
  const [loading, setLoading] = useState(false)
  const [mutual, setMutual] = useState(false)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const tier = TIER_CONFIGS[profile.tier]

  async function handleInteret() {
    if (interested || loading) return
    setLoading(true)
    setError(null)
    const result = await marquerInteret({
      fromMemberId: currentMemberId,
      toMemberId: profile.id,
    })
    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Erreur')
      return
    }
    setInterested(true)
    if (result.mutual && result.matchId) {
      setMutual(true)
      setMatchId(result.matchId)
    }
  }

  return (
    <div className="relative bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden hover:border-amber-500/20 transition-all group">
      {/* Tier badge */}
      <div className="absolute top-3 left-3 z-10">
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
          style={{
            background: `${tier.color}22`,
            color: tier.color,
            border: `1px solid ${tier.color}44`,
          }}
        >
          {tier.emoji} {tier.label}
        </span>
      </div>

      {/* Compatibilité badge */}
      <div className="absolute top-3 right-3 z-10">
        <CompatibilityBadge score={score} level={level} size="sm" showLabel={false} />
      </div>

      {/* Photo floutée */}
      <div className="relative w-full aspect-[4/3] bg-black/30 overflow-hidden">
        {profile.photo_principale_floutee ? (
          <Image
            src={profile.photo_principale_floutee}
            alt={profile.prenom}
            fill
            className="object-cover blur-[6px] scale-110 group-hover:blur-[4px] transition-all duration-500"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl opacity-20">◈</span>
          </div>
        )}
        {/* Overlay dégradé */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

        {/* Infos sur la photo */}
        <div className="absolute bottom-3 left-4 right-4">
          <p className="text-white font-semibold text-lg leading-tight">{profile.prenom}, {profile.age} ans</p>
          <p className="text-white/60 text-xs">{profile.ville} · {profile.profession}</p>
        </div>
      </div>

      {/* Bas de la carte */}
      <div className="p-4 space-y-3">
        {/* Score détaillé */}
        <div className="flex items-center justify-between">
          <CompatibilityBadge score={score} level={level} size="sm" />
          <span className="text-white/30 text-xs">
            {profile.location === 'DIASPORA' ? '✈ Diaspora' : '📍 Local'}
          </span>
        </div>

        {/* Piliers résumé */}
        <div className="flex flex-wrap gap-1">
          {[
            visionLabel(profile.piliers?.vision_geographique),
            engagementLabel(profile.piliers?.engagement),
          ].map((label) => (
            <span
              key={label}
              className="text-[10px] text-white/40 border border-white/10 rounded px-1.5 py-0.5"
            >
              {label}
            </span>
          ))}
        </div>

        {/* Match mutuel — lien chat */}
        {mutual && matchId && (
          <a
            href={`/alliance-privee/chat/${matchId}`}
            className="block w-full text-center py-2 rounded-xl text-sm font-semibold text-black"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A28)' }}
          >
            💎 Chat ouvert — Écrire à {profile.prenom}
          </a>
        )}

        {/* Bouton intérêt */}
        {!mutual && (
          <button
            onClick={handleInteret}
            disabled={interested || loading}
            className={`w-full py-2 rounded-xl text-sm font-medium transition-all ${
              interested
                ? 'bg-white/5 text-white/40 cursor-default border border-white/10'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 active:scale-95'
            }`}
          >
            {loading
              ? '…'
              : interested
              ? '✓ Intérêt envoyé'
              : `Marquer mon intérêt`}
          </button>
        )}

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      </div>
    </div>
  )
}

// Helpers labels
function visionLabel(v?: string): string {
  const map: Record<string, string> = {
    EUROPE: '🌍 Europe',
    CAMEROUN: '🇨🇲 Cameroun',
    FLEXIBLE: '🌐 Flexible',
  }
  return map[v ?? ''] ?? v ?? ''
}

function engagementLabel(e?: string): string {
  const map: Record<string, string> = {
    MARIAGE_RAPIDE: '💍 Mariage rapide',
    MARIAGE_MOYEN_TERME: '💑 Moyen terme',
    CONNAITRE_DABORD: '☕ Connaître d\'abord',
    PAS_PRESSE: '🌿 Pas pressé',
  }
  return map[e ?? ''] ?? e ?? ''
}
