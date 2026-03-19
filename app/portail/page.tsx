// app/portail/page.tsx
// Dashboard mariés — Server Component (fetches Firestore data)

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import DashboardClient from '@/components/portail/DashboardClient'

interface TodoDoc { id: string; libelle: string; done: boolean }

async function getDashboardData() {
  try {
    const cookieStore = cookies()
    const uid = cookieStore.get('portail_uid')?.value
    if (!uid) redirect('/portail/login')

    const db = getDb()
    const [userSnap, todosSnap] = await Promise.all([
      db.collection('portail_users').doc(uid).get(),
      db.collection('portail_users').doc(uid).collection('todos').orderBy('created_at', 'asc').limit(10).get(),
    ])

    if (!userSnap.exists) redirect('/portail/login')
    const d = userSnap.data()!

    const dateTs = d.projet?.date_evenement
    const dateISO: string | null = dateTs?.toDate ? dateTs.toDate().toISOString() : null

    const todos: TodoDoc[] = todosSnap.docs.map(doc => ({
      id: doc.id,
      libelle: doc.data().libelle ?? '',
      done: doc.data().done ?? false,
    }))

    const fs = d.fast_start ?? {}
    const enrolledTs = fs.enrolled_at
    const enrolledISO: string | null = enrolledTs?.toDate ? enrolledTs.toDate().toISOString() : null

    return {
      displayName: d.displayName ?? 'Utilisateur',
      dateEvenement: dateISO,
      nomEvenement: d.projet?.nom ?? '',
      lieuEvenement: d.projet?.lieu ?? '',
      budgetPrevisionnel: d.projet?.budget_previsionnel ?? 0,
      budgetDepense: d.wallets?.credits_services ?? 0,
      nombreInvitesPrev: d.projet?.nombre_invites_prevu ?? 0,
      invitesConfirmes: d.invites_confirmes ?? 0,
      walletCash: d.wallets?.cash ?? 0,
      walletCredits: d.wallets?.credits_services ?? 0,
      revLifetime: d.rev_lifetime ?? 0,
      todos,
      panierCount: 0,
      fastStart: {
        enrolledAt: enrolledISO,
        revLifetime: d.rev_lifetime ?? 0,
        palier30: { unlocked: fs.palier_30_unlocked ?? false, paye: fs.palier_30_paye ?? false, expire: fs.palier_30_expire ?? false, claimed: fs.palier_30_claimed ?? false },
        palier60: { unlocked: fs.palier_60_unlocked ?? false, paye: fs.palier_60_paye ?? false, expire: fs.palier_60_expire ?? false, claimed: fs.palier_60_claimed ?? false },
        palier90: { unlocked: fs.palier_90_unlocked ?? false, paye: fs.palier_90_paye ?? false, expire: fs.palier_90_expire ?? false, claimed: fs.palier_90_claimed ?? false },
      },
    }
  } catch {
    redirect('/portail/login')
  }
}

export default async function PortailPage() {
  const data = await getDashboardData()
  return <DashboardClient {...data} />
}
