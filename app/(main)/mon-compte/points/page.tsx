export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/firebase'
import { NIVEAUX } from '@/lib/loyalty'
import type { LoyaltyClient } from '@/lib/types'
import MonComptePointsFullHistory from '@/components/MonComptePointsFullHistory'

export const metadata = { title: 'Historique des points — L&Lui Stars' }

export default async function MonComptePointsPage() {
  const jar = await cookies()
  const clientId = jar.get('client_session')?.value
  if (!clientId) redirect('/mon-compte')

  const doc = await db.collection('clients').doc(clientId).get()
  if (!doc.exists) redirect('/mon-compte')

  const client = { id: doc.id, ...doc.data() } as LoyaltyClient

  // Charger tout l'historique de points
  const historySnap = await db
    .collection('clients')
    .doc(clientId)
    .collection('pointsHistory')
    .orderBy('created_at', 'desc')
    .get()

  const history = historySnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]

  const niveau = NIVEAUX[client.niveau || 'novice']

  return (
    <div className="pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/mon-compte"
            className="p-2 rounded-xl border border-beige-200 hover:bg-beige-50 text-dark/50 hover:text-dark flex-shrink-0"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-dark">Historique des points</h1>
            <p className="text-sm text-dark/40">L&Lui Stars — {client.firstName} {client.lastName}</p>
          </div>
        </div>

        <MonComptePointsFullHistory
          history={history}
          totalPoints={client.totalPoints || 0}
          niveau={niveau.label}
          niveauEmoji={niveau.emoji}
          niveauColor={niveau.color}
          clientName={`${client.firstName} ${client.lastName}`}
        />
      </div>
    </div>
  )
}
