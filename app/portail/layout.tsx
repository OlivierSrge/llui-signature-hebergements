import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import PortailTopBar from '@/components/portail/PortailTopBar'
import PortailNav from '@/components/portail/PortailNav'
import type { PortailGrade } from '@/lib/portailGrades'

interface UserPortailData {
  uid: string
  grade: PortailGrade
  rev_lifetime: number
  wallet_cash: number
  displayName: string
  invitesCount: number
}

async function getUserData(): Promise<UserPortailData | null> {
  try {
    const cookieStore = cookies()
    const uid = cookieStore.get('portail_uid')?.value
    if (!uid) return null
    const db = getDb()
    const snap = await db.collection('portail_users').doc(uid).get()
    if (!snap.exists) return null
    const data = snap.data()!
    const prevus = data.projet?.nombre_invites_prevu ?? 0
    const confirmes = data.invites_confirmes ?? 0
    const declines = data.invites_declines ?? 0
    const invitesCount = Math.max(0, prevus - confirmes - declines)
    return {
      uid,
      grade: (data.grade ?? 'START') as PortailGrade,
      rev_lifetime: data.rev_lifetime ?? 0,
      wallet_cash: data.wallets?.cash ?? 0,
      displayName: data.displayName ?? 'Utilisateur',
      invitesCount,
    }
  } catch {
    return null
  }
}

export default async function PortailLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserData()
  // Si pas d'utilisateur, le middleware a déjà redirigé vers /portail/login.
  // On rend juste {children} sans nav (cas : page login elle-même).
  if (!user) {
    return <>{children}</>
  }
  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <PortailTopBar
        uid={user.uid}
        grade={user.grade}
        revLifetime={user.rev_lifetime}
        walletCash={user.wallet_cash}
        displayName={user.displayName}
      />
      <PortailNav uid={user.uid} invitesCount={user.invitesCount} />
      {/* pt-16 header mobile / pt-[104px] header+nav desktop — pb-16 bottom nav mobile */}
      <main className="pt-16 md:pt-[104px] pb-16 md:pb-0">{children}</main>
    </div>
  )
}
