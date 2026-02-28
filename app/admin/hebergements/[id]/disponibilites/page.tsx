import { notFound } from 'next/navigation'
import { db } from '@/lib/firebase'
import AvailabilityManager from '@/components/admin/AvailabilityManager'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

async function getAccommodation(id: string) {
  const doc = await db.collection('hebergements').doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as any
}

async function getUnavailableDates(id: string): Promise<string[]> {
  const snap = await db.collection('disponibilites')
    .where('accommodation_id', '==', id)
    .get()
  return snap.docs.map((d) => d.data().date as string)
}

async function getConfirmedReservations(id: string) {
  const today = new Date().toISOString().split('T')[0]
  const snap = await db.collection('reservations')
    .where('accommodation_id', '==', id)
    .where('reservation_status', '==', 'confirmee')
    .get()
  return snap.docs
    .map((d) => d.data())
    .filter((r) => r.check_out >= today)
    .sort((a, b) => a.check_in.localeCompare(b.check_in)) as any[]
}

export const metadata = { title: 'Disponibilités' }

export default async function DisponibilitesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [accommodation, unavailableDates, reservations] = await Promise.all([
    getAccommodation(id),
    getUnavailableDates(id),
    getConfirmedReservations(id),
  ])
  if (!accommodation) notFound()

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <Link href={`/admin/hebergements/${id}`} className="inline-flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark mb-6 transition-colors">
        <ChevronLeft size={16} /> Retour à l&apos;hébergement
      </Link>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-dark">Disponibilités</h1>
        <p className="text-dark/50 text-sm mt-1">{accommodation.name} · {accommodation.partner?.name}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AvailabilityManager accommodationId={id} unavailableDates={unavailableDates} />
        </div>
        <div>
          <div className="bg-white rounded-2xl border border-beige-200 p-5">
            <h3 className="font-semibold text-dark mb-4">Réservations à venir</h3>
            {reservations.length === 0 ? (
              <p className="text-dark/40 text-sm">Aucune réservation confirmée</p>
            ) : (
              <div className="space-y-3">
                {reservations.map((res, i) => (
                  <div key={i} className="p-3 bg-beige-50 rounded-xl border border-beige-200 text-sm">
                    <p className="font-medium text-dark">{res.guest_first_name} {res.guest_last_name}</p>
                    <p className="text-dark/60 text-xs mt-0.5">{res.check_in} → {res.check_out}</p>
                    <p className="text-dark/40 text-xs">{res.guests} pers.</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-beige-200 p-5 mt-4">
            <h3 className="font-semibold text-dark mb-3 text-sm">Légende</h3>
            <div className="space-y-2 text-xs text-dark/60">
              <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-green-200 border border-green-400 flex-shrink-0" /><span>Disponible</span></div>
              <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-red-200 border border-red-400 flex-shrink-0" /><span>Bloqué manuellement</span></div>
              <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-gold-200 border border-gold-400 flex-shrink-0" /><span>Réservation confirmée</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
