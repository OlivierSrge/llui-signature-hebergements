import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import PortailTopBar from '@/components/portail/PortailTopBar'
import PortailNav from '@/components/portail/PortailNav'
import AdminBandeau from '@/components/portail/AdminBandeau'
import ThemeInjector from '@/components/portail/ThemeInjector'
import type { PortailGrade } from '@/lib/portailGrades'

interface UserPortailData {
  uid: string
  grade: PortailGrade
  rev_lifetime: number
  wallet_cash: number
  displayName: string
  invitesCount: number
  couleur_primaire?: string
  couleur_secondaire?: string
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
    // CORRECTION 3 — badge basé sur invites[] array réel (pas sur prevus - confirmes)
    // Évite le "99+" quand nombre_invites_prevu est grand mais aucune invitation envoyée
    const invitesList = (data.invites as Array<{ statut?: string }> | undefined) ?? []
    const invitesCount = invitesList.filter(
      i => i.statut && i.statut !== 'confirme' && i.statut !== 'decline' && i.statut !== 'declined'
    ).length
    const noms_maries = data.noms_maries || data.displayName || ''
    return {
      uid,
      grade: (data.grade ?? 'START') as PortailGrade,
      rev_lifetime: data.rev_lifetime ?? 0,
      wallet_cash: data.wallets?.cash ?? 0,
      displayName: noms_maries || 'Mon espace mariage',
      invitesCount,
      couleur_primaire: (data.couleur_primaire as string | undefined) ?? undefined,
      couleur_secondaire: (data.couleur_secondaire as string | undefined) ?? undefined,
    }
  } catch {
    return null
  }
}

export default async function PortailLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const adminView = cookieStore.get('admin_view')?.value || null

  const user = await getUserData()
  // Si pas d'utilisateur, le middleware a déjà redirigé vers /portail/login.
  // On rend juste {children} sans nav (cas : page login elle-même).
  if (!user) {
    return <>{children}</>
  }
  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* #187 — Thème visuel dynamique */}
      <ThemeInjector couleur_primaire={user.couleur_primaire} couleur_secondaire={user.couleur_secondaire} />
      {/* Bandeau mode admin — décalage supplémentaire quand actif */}
      {adminView && <AdminBandeau nomsMaries={adminView} />}
      <PortailTopBar
        uid={user.uid}
        grade={user.grade}
        revLifetime={user.rev_lifetime}
        walletCash={user.wallet_cash}
        displayName={user.displayName}
      />
      <PortailNav uid={user.uid} invitesCount={user.invitesCount} />
      {/* pt-16 header mobile / pt-[104px] header+nav desktop — pb-16 bottom nav mobile */}
      {/* Quand bandeau admin : +10 de padding-top (bandeau = ~40px) */}
      <main className={`pb-16 md:pb-0 ${adminView ? 'pt-26 md:pt-[144px]' : 'pt-16 md:pt-[104px]'}`}>
        {children}
      </main>
    </div>
  )
}
