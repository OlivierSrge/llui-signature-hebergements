// app/alliance-privee/chat/[matchId]/page.tsx
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getMatch,
  getChatMessages,
} from '@/actions/alliance-privee-matching'
import { db } from '@/lib/firebase'
import { serialize } from '@/lib/serialize'
import ChatInterface from '@/components/alliance-privee/ChatInterface'

export const dynamic = 'force-dynamic'

interface Props {
  params: { matchId: string }
  searchParams: Record<string, string>
}

export default async function ChatPage({ params, searchParams }: Props) {
  const cookieStore = await cookies()
  const memberId = searchParams.demo ?? cookieStore.get('alliance_member_id')?.value ?? null

  if (!memberId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-5">
        <div className="text-center text-white/40">
          <p>Accès réservé aux membres.</p>
          <Link href="/alliance-privee/conversations" className="text-amber-500/60 text-sm mt-3 block">← Conversations</Link>
        </div>
      </div>
    )
  }

  const match = await getMatch(params.matchId)
  if (!match) notFound()

  // Vérifier appartenance
  if (match.member_a_id !== memberId && match.member_b_id !== memberId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-5">
        <div className="text-center text-white/40">
          <p>Accès non autorisé.</p>
        </div>
      </div>
    )
  }

  if (!match.chat_enabled || match.status === 'CLOSED') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-5">
        <div className="text-center space-y-3">
          <p className="text-4xl">🔒</p>
          <p className="text-white text-lg font-light">Conversation fermée</p>
          <p className="text-white/40 text-sm">Cette conversation n'est plus active.</p>
          <Link href={`/alliance-privee/conversations?demo=${memberId}`} className="text-amber-500/60 text-sm block">← Mes conversations</Link>
        </div>
      </div>
    )
  }

  // Partner portrait
  const partnerId = match.member_a_id === memberId ? match.member_b_id : match.member_a_id
  const [partnerSnap, messages] = await Promise.all([
    db.collection('alliance_privee_portraits_verified').doc(partnerId).get(),
    getChatMessages(params.matchId),
  ])

  const partnerData = partnerSnap.exists ? partnerSnap.data()! : null
  const partnerPrenom = partnerData?.prenom ?? 'Membre'
  const partnerPhoto = partnerData?.photo_principale_floutee

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link
            href={`/alliance-privee/conversations?demo=${memberId}`}
            className="text-white/40 hover:text-white/70 text-sm"
          >
            ← Conversations
          </Link>
          <div>
            <p className="text-xs text-amber-500/60 uppercase tracking-wider">Alliance Privée</p>
            <h1 className="text-white font-light">Chat avec {partnerPrenom}</h1>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-amber-500/50 border border-amber-500/15 rounded-full px-2.5 py-1">
            <span>🛡</span>
            <span>Sentinelle IA active</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6">
        <div style={{ height: 'calc(100vh - 160px)' }}>
          <ChatInterface
            matchId={params.matchId}
            currentMemberId={memberId}
            partnerPrenom={partnerPrenom}
            partnerPhoto={partnerPhoto}
            initialMessages={serialize(messages)}
          />
        </div>
      </div>
    </div>
  )
}
