export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import AdminReservationForm from '@/components/admin/AdminReservationForm'

async function getAllAccommodations() {
  const snap = await db.collection('hebergements').where('status', '==', 'active').get()
  return snap.docs
    .map((d) => ({
      id: d.id,
      name: d.data().name as string,
      price_per_night: d.data().price_per_night as number,
      commission_rate: d.data().commission_rate as number,
      location: (d.data().location as string) || null,
      partner_id: d.data().partner_id as string,
      partner_name: (d.data().partner?.name as string) || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const metadata = { title: 'Nouvelle réservation – Admin' }

export default async function AdminNewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ acc?: string }>
}) {
  const [sp, accommodations] = await Promise.all([searchParams, getAllAccommodations()])
  const preselectedId = sp.acc && accommodations.find((a) => a.id === sp.acc) ? sp.acc : undefined

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <div className="mb-6">
        <Link href="/admin/reservations" className="inline-flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark mb-4 transition-colors">
          <ChevronLeft size={16} /> Retour aux réservations
        </Link>
        <h1 className="font-serif text-3xl font-semibold text-dark">Nouvelle réservation</h1>
        <p className="text-dark/50 text-sm mt-1">Créer une réservation pour n&apos;importe quel hébergement partenaire.</p>
      </div>
      <AdminReservationForm accommodations={accommodations} preselectedId={preselectedId} />
    </div>
  )
}
