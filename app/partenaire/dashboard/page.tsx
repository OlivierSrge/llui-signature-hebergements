export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { LogOut, Calendar, Home } from 'lucide-react'
import { logoutPartner } from '@/actions/partners'
import PartnerCalendar from '@/components/partner/PartnerCalendar'

async function getPartner(partnerId: string) {
  const doc = await db.collection('partenaires').doc(partnerId).get()
  if (!doc.exists) return null
  const d = doc.data()!
  return { id: doc.id, name: d.name as string, access_code: d.access_code as string }
}

async function getPartnerAccommodations(partnerId: string) {
  const snap = await db.collection('hebergements')
    .where('partner_id', '==', partnerId)
    .where('status', '==', 'active')
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
}

async function getUnavailableDates(accommodationId: string): Promise<string[]> {
  const snap = await db.collection('disponibilites')
    .where('accommodation_id', '==', accommodationId)
    .get()
  return snap.docs.map((d) => d.data().date as string)
}

export default async function PartnerDashboardPage() {
  const cookieStore = await cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) redirect('/partenaire')

  const [partner, accommodations] = await Promise.all([
    getPartner(partnerId),
    getPartnerAccommodations(partnerId),
  ])

  if (!partner) redirect('/partenaire')

  // Récupérer les dates bloquées pour chaque hébergement
  const unavailableMap: Record<string, string[]> = {}
  await Promise.all(
    accommodations.map(async (acc: any) => {
      unavailableMap[acc.id] = await getUnavailableDates(acc.id)
    })
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-beige-200 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-dark/40 mb-0.5">Espace partenaire</p>
            <h1 className="font-serif text-xl font-semibold text-dark">{partner.name}</h1>
          </div>
          <form action={logoutPartner as () => void}>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-sm text-dark/60 border border-beige-200 rounded-xl hover:bg-beige-50 transition-colors"
            >
              <LogOut size={14} /> Déconnexion
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h2 className="font-semibold text-dark text-lg">Mes hébergements</h2>
          <p className="text-dark/50 text-sm mt-0.5">
            Cliquez sur les dates pour les bloquer ou les libérer.
          </p>
        </div>

        {accommodations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-beige-200 p-12 text-center">
            <Home size={32} className="text-dark/20 mx-auto mb-3" />
            <p className="text-dark/50">Aucun hébergement actif associé à votre compte.</p>
            <p className="text-xs text-dark/30 mt-1">Contactez l&apos;équipe L&Lui Signature.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {accommodations.map((acc: any) => (
              <div key={acc.id} className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-beige-100 flex items-center gap-3">
                  <Calendar size={16} className="text-gold-500" />
                  <div>
                    <h3 className="font-semibold text-dark">{acc.name}</h3>
                    {acc.location && <p className="text-xs text-dark/40">{acc.location}</p>}
                  </div>
                </div>
                <div className="p-6">
                  <PartnerCalendar
                    accommodationId={acc.id}
                    unavailableDates={unavailableMap[acc.id] ?? []}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
