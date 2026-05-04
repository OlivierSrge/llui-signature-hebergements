'use client'
// components/alliance-privee/ProfilsCompatiblesClient.tsx

import Link from 'next/link'
import ProfilCard from './ProfilCard'
import type { CompatibilityMatch } from '@/lib/alliance-privee-matching'

interface Props {
  memberId: string
  profils: CompatibilityMatch[]
}

export default function ProfilsCompatiblesClient({ memberId, profils }: Props) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link href={`/alliance-privee/dashboard?demo=${memberId}`} className="text-white/40 hover:text-white/70 text-sm">
            ← Dashboard
          </Link>
          <div>
            <p className="text-xs text-amber-500/60 uppercase tracking-wider">Alliance Privée</p>
            <h1 className="text-white font-light">Profils compatibles</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-8">
        {/* Compteur */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-white/50 text-sm">
            {profils.length === 0
              ? 'Aucun profil compatible pour l\'instant'
              : `${profils.length} profil${profils.length > 1 ? 's' : ''} compatible${profils.length > 1 ? 's' : ''} trouvé${profils.length > 1 ? 's' : ''}`}
          </p>
          <span className="text-xs text-white/25">Score minimum : 40%</span>
        </div>

        {profils.length === 0 ? (
          <div className="text-center py-20 border border-white/5 rounded-2xl">
            <p className="text-5xl mb-4">◈</p>
            <p className="text-white/40">Les profils sont ajoutés régulièrement.</p>
            <p className="text-white/25 text-sm mt-2">Revenez dans quelques jours.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profils.map((match) => (
              <ProfilCard
                key={match.profile.id}
                match={match}
                currentMemberId={memberId}
              />
            ))}
          </div>
        )}

        {/* Légende scores */}
        <div className="mt-10 border border-white/5 rounded-xl p-5">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Légende compatibilité</p>
          <div className="flex flex-wrap gap-3">
            {[
              { emoji: '💎', label: 'Match Parfait', range: '85–100%', color: '#C9A84C' },
              { emoji: '✨', label: 'Excellent', range: '75–84%', color: '#10B981' },
              { emoji: '💫', label: 'Bon Match', range: '60–74%', color: '#3B82F6' },
              { emoji: '⭐', label: 'Moyen', range: '40–59%', color: '#F59E0B' },
            ].map((item) => (
              <span
                key={item.label}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border"
                style={{ borderColor: `${item.color}40`, backgroundColor: `${item.color}12`, color: item.color }}
              >
                {item.emoji} {item.label} ({item.range})
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
