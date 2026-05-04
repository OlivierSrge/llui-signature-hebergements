// app/alliance-privee/conversations/page.tsx
import { cookies } from 'next/headers'
import Link from 'next/link'
import { getMesMatchs } from '@/actions/alliance-privee-matching'
import { db } from '@/lib/firebase'
import { serialize } from '@/lib/serialize'
import ConversationsClient from '@/components/alliance-privee/ConversationsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Conversations — Alliance Privée' }

interface Props {
  searchParams: Record<string, string>
}

export default async function ConversationsPage({ searchParams }: Props) {
  const cookieStore = await cookies()
  const memberId = searchParams.demo ?? cookieStore.get('alliance_member_id')?.value ?? null

  if (!memberId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-5">
        <div className="text-center text-white/40">
          <p>Accès réservé aux membres.</p>
          <Link href="/alliance-privee/dashboard" className="text-amber-500/60 text-sm mt-3 block">← Dashboard</Link>
        </div>
      </div>
    )
  }

  const matchs = await getMesMatchs(memberId)

  // Enrichir avec portraits du partenaire dans chaque match
  const partnerIds = matchs.map((m) =>
    m.member_a_id === memberId ? m.member_b_id : m.member_a_id
  )
  const portraitSnaps = await Promise.all(
    partnerIds.map((id) => db.collection('alliance_privee_portraits_verified').doc(id).get())
  )
  const partners: Record<string, { prenom: string; age: number; photo?: string; tier: string }> = {}
  portraitSnaps.forEach((snap) => {
    if (snap.exists) {
      const d = snap.data()!
      partners[snap.id] = {
        prenom: d.prenom,
        age: d.age,
        photo: d.photo_principale_floutee,
        tier: d.tier,
      }
    }
  })

  return (
    <ConversationsClient
      memberId={memberId}
      matchs={serialize(matchs)}
      partners={partners}
    />
  )
}
