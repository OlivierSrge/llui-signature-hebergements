'use client'
// components/alliance-privee/InteretsRecusClient.tsx

import { useState } from 'react'
import Link from 'next/link'
import { marquerInteret } from '@/actions/alliance-privee-matching'
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

export default function InteretsRecusClient({ memberId, interets, portraits }: Props) {
  const [responded, setResponded] = useState<Record<string, { mutual: boolean; matchId?: string }>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleInteret(fromMemberId: string) {
    setLoading((p) => ({ ...p, [fromMemberId]: true }))
    setErrors((p) => ({ ...p, [fromMemberId]: '' }))

    const result = await marquerInteret({
      fromMemberId: memberId,
      toMemberId: fromMemberId,
    })

    setLoading((p) => ({ ...p, [fromMemberId]: false }))
    if (!result.success) {
      setErrors((p) => ({ ...p, [fromMemberId]: result.error ?? 'Erreur' }))
      return
    }
    setResponded((p) => ({
      ...p,
      [fromMemberId]: { mutual: result.mutual ?? false, matchId: result.matchId },
    }))
  }

  const backHref = `/alliance-privee/dashboard?demo=${memberId}`

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link href={backHref} className="text-white/40 hover:text-white/70 text-sm">← Dashboard</Link>
          <div>
            <p className="text-xs text-amber-500/60 uppercase tracking-wider">Alliance Privée</p>
            <h1 className="text-white font-light">Intérêts reçus</h1>
          </div>
          {interets.length > 0 && (
            <span className="ml-auto bg-amber-500 text-black text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {interets.length}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8">
        {interets.length === 0 ? (
          <div className="text-center py-20 border border-white/5 rounded-2xl">
            <p className="text-5xl mb-4">🌟</p>
            <p className="text-white/40">Aucun intérêt reçu pour l'instant.</p>
            <p className="text-white/25 text-sm mt-2">Votre profil est visible des membres compatibles.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {interets.map((interet) => {
              const portrait = portraits[interet.from_member_id]
              const resp = responded[interet.from_member_id]
              const isLoading = loading[interet.from_member_id]
              const err = errors[interet.from_member_id]

              return (
                <div
                  key={interet.id}
                  className="border border-white/10 rounded-2xl p-5 space-y-4 hover:border-amber-500/20 transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-black/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {portrait?.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={portrait.photo}
                          alt={portrait?.prenom}
                          className="w-full h-full object-cover blur-[4px]"
                        />
                      ) : (
                        <span className="text-2xl text-white/20">◈</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {portrait ? (
                        <>
                          <p className="text-white font-semibold text-base">
                            {portrait.prenom}, {portrait.age} ans
                          </p>
                          <p className="text-white/50 text-sm">{portrait.profession}</p>
                          <p className="text-white/30 text-xs">{portrait.ville}</p>
                        </>
                      ) : (
                        <p className="text-white/30">Profil confidentiel</p>
                      )}
                      <p className="text-white/25 text-[10px] mt-1">
                        Intérêt marqué le {new Date(interet.date_created).toLocaleDateString('fr-FR')}
                        {' · '}Compatibilité {interet.compatibility_score}%
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {resp ? (
                    resp.mutual ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                          <span>💎</span>
                          <span>C'est un Match ! Le chat est ouvert.</span>
                        </div>
                        {resp.matchId && (
                          <Link
                            href={`/alliance-privee/chat/${resp.matchId}?demo=${memberId}`}
                            className="block w-full text-center py-2.5 rounded-xl text-sm font-semibold text-black"
                            style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A28)' }}
                          >
                            Ouvrir le chat sécurisé
                          </Link>
                        )}
                      </div>
                    ) : (
                      <p className="text-white/40 text-sm">✓ Intérêt envoyé en retour — en attente de confirmation.</p>
                    )
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleInteret(interet.from_member_id)}
                        disabled={isLoading}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 active:scale-95 disabled:opacity-50"
                      >
                        {isLoading ? '…' : '⭐ Marquer mon intérêt aussi'}
                      </button>
                    </div>
                  )}

                  {err && <p className="text-red-400 text-xs">{err}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
