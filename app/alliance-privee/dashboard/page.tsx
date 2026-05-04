// app/alliance-privee/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'
import {
  getMemberDashboardStats,
  getProfilsCompatibles,
} from '@/actions/alliance-privee-matching'
import { serialize } from '@/lib/serialize'
import MemberDashboardClient from '@/components/alliance-privee/MemberDashboardClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mon Dashboard — Alliance Privée' }

/**
 * Lecture cookie session alliance membre.
 * Format cookie : alliance_member_id=<portraitId>
 * En démo : passer ?demo=<portraitId> dans l'URL.
 */
async function getMemberIdFromSession(searchParams: Record<string, string>): Promise<string | null> {
  // Mode démo : ?demo=<portraitId>
  if (searchParams.demo) return searchParams.demo

  // Cookie de session
  const cookieStore = await cookies()
  return cookieStore.get('alliance_member_id')?.value ?? null
}

interface Props {
  searchParams: Record<string, string>
}

export default async function AllianceDashboardPage({ searchParams }: Props) {
  const memberId = await getMemberIdFromSession(searchParams)

  if (!memberId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-5">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">◈</div>
          <h1 className="text-white text-xl font-light">Accès réservé aux membres</h1>
          <p className="text-white/40 text-sm">
            Votre carte Alliance Privée vous donne accès au dashboard.
          </p>
          <p className="text-white/25 text-xs">
            Pour la démo, ajoutez <code className="text-amber-500/60">?demo=&lt;portraitId&gt;</code> à l'URL.
          </p>
        </div>
      </div>
    )
  }

  // Charger les données en parallèle
  const [portraitSnap, stats, profilsCompatibles] = await Promise.all([
    db.collection('alliance_privee_portraits_verified').doc(memberId).get(),
    getMemberDashboardStats(memberId),
    getProfilsCompatibles(memberId).catch(() => []),
  ])

  if (!portraitSnap.exists) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-5">
        <div className="max-w-sm w-full text-center space-y-3">
          <p className="text-4xl">◈</p>
          <h1 className="text-white text-xl font-light">Profil introuvable</h1>
          <p className="text-white/40 text-sm">ID : {memberId}</p>
        </div>
      </div>
    )
  }

  const portrait = portraitSnap.data()!

  return (
    <MemberDashboardClient
      memberId={memberId}
      prenom={portrait.prenom}
      tier={portrait.tier}
      stats={serialize(stats)}
      profilsCompatibles={serialize(profilsCompatibles)}
    />
  )
}
