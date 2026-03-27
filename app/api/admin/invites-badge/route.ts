// app/api/admin/invites-badge/route.ts
// GET — Nombre total d'invités silencieux (sans réponse RSVP) sur tous les mariages
// Utilisé par AdminSidebar pour afficher l'indicateur
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

function isAdmin(): boolean {
  const session = cookies().get('admin_session')?.value
  if (!session) return false
  const token = process.env.ADMIN_SESSION_TOKEN
  return !token || session === token
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ count: 0 })

  try {
    const db = getDb()
    const usersSnap = await db.collection('portail_users')
      .where('role', '==', 'MARIÉ')
      .limit(50)
      .get()

    let totalSilencieux = 0

    // Pour chaque marié, compter les invités en attente
    // (limité aux 20 premiers pour éviter les timeouts)
    const checks = usersSnap.docs.slice(0, 20).map(async (doc) => {
      const invitesSnap = await db
        .collection(`portail_users/${doc.id}/invites_guests`)
        .where('statut', '==', 'invite')
        .get()
      return invitesSnap.size
    })

    const counts = await Promise.all(checks)
    totalSilencieux = counts.reduce((sum, n) => sum + n, 0)

    return NextResponse.json({ count: totalSilencieux })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
