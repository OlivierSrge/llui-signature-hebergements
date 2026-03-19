import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import PortailTopBar from '@/components/portail/PortailTopBar'
import type { PortailGrade } from '@/lib/portailGrades'

interface UserPortailData {
  uid: string
  grade: PortailGrade
  rev_lifetime: number
  wallet_cash: number
  displayName: string
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
    return {
      uid,
      grade: (data.grade ?? 'START') as PortailGrade,
      rev_lifetime: data.rev_lifetime ?? 0,
      wallet_cash: data.wallets?.cash ?? 0,
      displayName: data.displayName ?? 'Utilisateur',
    }
  } catch {
    return null
  }
}

export default async function PortailLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserData()
  if (!user) {
    redirect('/portail/login')
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
      <main className="pt-16">{children}</main>
    </div>
  )
}
