'use client'
// components/alliance-privee/ConversationsClient.tsx

import Link from 'next/link'
import type { MatchDoc } from '@/actions/alliance-privee-matching'

interface PartnerMini {
  prenom: string
  age: number
  photo?: string
  tier: string
}

interface Props {
  memberId: string
  matchs: MatchDoc[]
  partners: Record<string, PartnerMini>
}

export default function ConversationsClient({ memberId, matchs, partners }: Props) {
  const backHref = `/alliance-privee/dashboard?demo=${memberId}`

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link href={backHref} className="text-white/40 hover:text-white/70 text-sm">← Dashboard</Link>
          <div>
            <p className="text-xs text-amber-500/60 uppercase tracking-wider">Alliance Privée</p>
            <h1 className="text-white font-light">Mes conversations</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8">
        {matchs.length === 0 ? (
          <div className="text-center py-20 border border-white/5 rounded-2xl">
            <p className="text-5xl mb-4">💬</p>
            <p className="text-white/40">Aucune conversation active.</p>
            <p className="text-white/25 text-sm mt-2">
              Les chats s'ouvrent uniquement en cas d'intérêt mutuel.
            </p>
            <Link
              href={`/alliance-privee/profils-compatibles?demo=${memberId}`}
              className="inline-block mt-5 text-sm text-amber-400 border border-amber-500/30 rounded-lg px-4 py-2 hover:bg-amber-500/10 transition-all"
            >
              Explorer les profils compatibles →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {matchs.map((match) => {
              const partnerId = match.member_a_id === memberId ? match.member_b_id : match.member_a_id
              const partner = partners[partnerId]

              return (
                <Link
                  key={match.id}
                  href={`/alliance-privee/chat/${match.id}?demo=${memberId}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-amber-500/20 hover:bg-amber-500/5 transition-all group"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {partner?.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={partner.photo}
                        alt={partner?.prenom}
                        className="w-full h-full object-cover blur-[4px]"
                      />
                    ) : (
                      <span className="text-xl text-white/20">◈</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium text-sm">
                        {partner ? `${partner.prenom}, ${partner.age} ans` : 'Profil confidentiel'}
                      </p>
                      {match.last_message_at && (
                        <span className="text-white/25 text-[10px]">
                          {new Date(match.last_message_at).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-emerald-400 text-[10px]">💎 Match · Chat actif</span>
                      {match.messages_count > 0 && (
                        <span className="text-white/25 text-[10px]">
                          {match.messages_count} message{match.messages_count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-white/20 group-hover:text-amber-400 transition-colors text-lg">→</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
