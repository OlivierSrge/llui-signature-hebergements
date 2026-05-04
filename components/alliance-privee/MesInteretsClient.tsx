'use client'
// components/alliance-privee/MesInteretsClient.tsx

import Link from 'next/link'
import type { InterestDoc } from '@/actions/alliance-privee-matching'

interface PortraitMini {
  prenom: string
  age: number
  ville: string
  profession: string
  photo?: string
  tier: string
}

interface Props {
  memberId: string
  interets: InterestDoc[]
  portraits: Record<string, PortraitMini>
}

const STATUS_CONFIG = {
  PENDING: { label: 'En attente', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: '⏳' },
  MUTUAL: { label: 'Match mutuel !', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: '💎' },
  EXPIRED: { label: 'Expiré', color: 'text-white/30', bg: 'bg-white/5 border-white/10', icon: '○' },
}

export default function MesInteretsClient({ memberId, interets, portraits }: Props) {
  const backHref = `/alliance-privee/dashboard?demo=${memberId}`

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link href={backHref} className="text-white/40 hover:text-white/70 text-sm">
            ← Dashboard
          </Link>
          <div>
            <p className="text-xs text-amber-500/60 uppercase tracking-wider">Alliance Privée</p>
            <h1 className="text-white font-light">Mes intérêts envoyés</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8">
        <p className="text-white/40 text-sm mb-6">
          {interets.length === 0
            ? 'Vous n\'avez pas encore marqué d\'intérêt.'
            : `${interets.length} intérêt${interets.length > 1 ? 's' : ''} envoyé${interets.length > 1 ? 's' : ''}`}
        </p>

        {interets.length === 0 ? (
          <div className="text-center py-20 border border-white/5 rounded-2xl">
            <p className="text-5xl mb-4">⭐</p>
            <p className="text-white/40">Explorez les profils compatibles pour marquer vos intérêts.</p>
            <Link
              href={`/alliance-privee/profils-compatibles?demo=${memberId}`}
              className="inline-block mt-4 text-sm text-amber-400 border border-amber-500/30 rounded-lg px-4 py-2 hover:bg-amber-500/10 transition-all"
            >
              Voir les profils →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {interets.map((interet) => {
              const portrait = portraits[interet.to_member_id]
              const cfg = STATUS_CONFIG[interet.status]

              return (
                <div
                  key={interet.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${cfg.bg} transition-all`}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {portrait?.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={portrait.photo}
                        alt={portrait?.prenom}
                        className="w-full h-full object-cover blur-[4px]"
                      />
                    ) : (
                      <span className="text-xl text-white/20">◈</span>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    {portrait ? (
                      <>
                        <p className="text-white font-medium text-sm truncate">
                          {portrait.prenom}, {portrait.age} ans
                        </p>
                        <p className="text-white/40 text-xs truncate">
                          {portrait.ville} · {portrait.profession}
                        </p>
                      </>
                    ) : (
                      <p className="text-white/30 text-sm">Profil non disponible</p>
                    )}
                    <p className="text-white/25 text-[10px] mt-0.5">
                      {new Date(interet.date_created).toLocaleDateString('fr-FR')}
                      {' · '}Compatibilité {interet.compatibility_score}%
                    </p>
                  </div>

                  {/* Statut */}
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-xs font-medium flex items-center gap-1 ${cfg.color}`}>
                      <span>{cfg.icon}</span>
                      <span>{cfg.label}</span>
                    </span>
                    {interet.status === 'MUTUAL' && interet.date_mutual && (
                      <Link
                        href={`/alliance-privee/conversations?demo=${memberId}`}
                        className="text-[10px] text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5 hover:bg-emerald-500/10 transition-all"
                      >
                        Ouvrir le chat →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
