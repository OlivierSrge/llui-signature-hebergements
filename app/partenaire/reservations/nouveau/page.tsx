export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PartnerReservationForm from '@/components/partner/PartnerReservationForm'
import { getEffectivePermissions } from '@/actions/subscriptions'

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

export default async function PartnerNewReservationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const cookieStore = cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) redirect('/partenaire')

  const permissions = await getEffectivePermissions(partnerId)
  if (!permissions.canCreateReservations) redirect('/partenaire/upgrade')

  const accommodations = await getPartnerAccommodations(partnerId)
  const sp = await searchParams

  const initialValues = {
    accommodation_id: sp.product_id || '',
    check_in: sp.check_in || '',
    check_out: sp.check_out || '',
    guests: sp.guests || '',
    guest_first_name: sp.first_name ? decodeURIComponent(sp.first_name) : '',
    guest_last_name: sp.last_name ? decodeURIComponent(sp.last_name) : '',
    guest_phone: sp.phone ? decodeURIComponent(sp.phone) : '',
    guest_email: sp.email ? decodeURIComponent(sp.email) : '',
    notes: sp.message ? decodeURIComponent(sp.message) : '',
  }

  const fromDemand = sp.from_demand || null

  return (
    <div className="min-h-screen bg-beige-50">
      <header className="bg-white border-b border-beige-200 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/partenaire/dashboard" className="p-2 rounded-xl hover:bg-beige-50 transition-colors text-dark/50 hover:text-dark">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-xs text-dark/40">Espace partenaire</p>
            <h1 className="font-serif text-xl font-semibold text-dark">
              Nouvelle réservation{fromDemand ? ' — depuis une demande' : ''}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {fromDemand && (
          <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 flex items-center gap-2">
            <span className="text-base">📋</span>
            Formulaire pré-rempli depuis la demande client. Vérifiez les informations avant de valider.
          </div>
        )}
        {accommodations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-beige-200 p-12 text-center">
            <p className="text-dark/50">Aucun hébergement actif disponible.</p>
          </div>
        ) : (
          <PartnerReservationForm
            accommodations={accommodations}
            initialValues={initialValues}
            fromDemandId={fromDemand}
          />
        )}
      </main>
    </div>
  )
}
