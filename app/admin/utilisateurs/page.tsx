// app/admin/utilisateurs/page.tsx
// Gestion utilisateurs portail — tableau + filtres + profil + ajustement grade

import { getDb } from '@/lib/firebase'
import UtilisateursClient from '@/components/admin/portail/UtilisateursClient'
import type { PortailGrade } from '@/lib/portailGrades'

export interface PortailUserRow {
  uid: string; displayName: string; phone: string; email: string
  role: string; grade: PortailGrade; rev_lifetime: number
  walletCash: number; walletCredits: number; createdAt: string
  fsUnlocked: number
}

async function getUsers(): Promise<PortailUserRow[]> {
  const db = getDb()
  const snap = await db.collection('portail_users').orderBy('rev_lifetime', 'desc').limit(200).get()
  return snap.docs.map(doc => {
    const d = doc.data()
    const fs = d.fast_start ?? {}
    const fsUnlocked = [fs.palier_30_unlocked, fs.palier_60_unlocked, fs.palier_90_unlocked].filter(Boolean).length
    return {
      uid: doc.id,
      displayName: d.displayName ?? '—',
      phone: d.phone ?? '',
      email: d.email ?? '',
      role: d.role ?? 'MARIÉ',
      grade: (d.grade ?? 'START') as PortailGrade,
      rev_lifetime: d.rev_lifetime ?? 0,
      walletCash: d.wallets?.cash ?? 0,
      walletCredits: d.wallets?.credits_services ?? 0,
      createdAt: d.created_at?.toDate?.().toISOString() ?? '',
      fsUnlocked,
    }
  })
}

export const dynamic = 'force-dynamic'

export default async function AdminUtilisateursPage() {
  const users = await getUsers()
  return <UtilisateursClient users={users} />
}
