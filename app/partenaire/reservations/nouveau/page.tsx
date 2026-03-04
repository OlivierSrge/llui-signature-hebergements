export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PartnerReservationForm from '@/components/partner/PartnerReservationForm'

async function getPartnerAccommodations(partnerId: string) {
  const snap = await db.collection('hebergements')
    .where('partner_id', '==', partnerId)
    .where('status', '==', 'active')
    .get()
  return snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name as string,
    price_per_night: d.data().price_per_night as number,
    location: (d.data().location as string) || null,
  }))
}

export default async function PartnerNewReservationPage() {
  const cookieStore = await cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) redirect('/partenaire')

  const accommodations = await getPartnerAccommodations(partnerId)

  return (
    <div className="min-h-screen bg-beige-50">
      <header className="bg-white border-b border-beige-200 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/partenaire/dashboard" className="p-2 rounded-xl hover:bg-beige-50 transition-colors text-dark/50 hover:text-dark">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-xs text-dark/40">Espace partenaire</p>
            <h1 className="font-serif text-xl font-semibold text-dark">Nouvelle réservation</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {accommodations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-beige-200 p-12 text-center">
            <p className="text-dark/50">Aucun hébergement actif disponible.</p>
          </div>
        ) : (
          <PartnerReservationForm accommodations={accommodations} />
        )}
      </main>
    </div>
  )
}
