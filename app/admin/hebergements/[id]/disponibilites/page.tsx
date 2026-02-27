import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AvailabilityManager from '@/components/admin/AvailabilityManager'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import type { Accommodation } from '@/lib/types'

async function getAccommodation(id: string): Promise<Accommodation | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('accommodations')
    .select('*, partner:partners(name)')
    .eq('id', id)
    .single()
  return data
}

async function getUnavailableDates(id: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('availability')
    .select('date')
    .eq('accommodation_id', id)
    .eq('is_available', false)
  return data?.map((d) => d.date) || []
}

async function getConfirmedReservations(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reservations')
    .select('check_in, check_out, guest_first_name, guest_last_name, guests')
    .eq('accommodation_id', id)
    .eq('reservation_status', 'confirmee')
    .gte('check_out', new Date().toISOString().split('T')[0])
    .order('check_in')
  return data || []
}

export const metadata = { title: 'Disponibilités' }

export default async function DisponibilitesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [accommodation, unavailableDates, reservations] = await Promise.all([
    getAccommodation(id),
    getUnavailableDates(id),
    getConfirmedReservations(id),
  ])

  if (!accommodation) notFound()

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <Link
        href={`/admin/hebergements/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Retour à l&apos;hébergement
      </Link>

      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-dark">
          Disponibilités
        </h1>
        <p className="text-dark/50 text-sm mt-1">
          {accommodation.name} · {(accommodation.partner as any)?.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AvailabilityManager
            accommodationId={id}
            unavailableDates={unavailableDates}
          />
        </div>

        <div>
          {/* Upcoming reservations */}
          <div className="bg-white rounded-2xl border border-beige-200 p-5">
            <h3 className="font-semibold text-dark mb-4">Réservations à venir</h3>
            {reservations.length === 0 ? (
              <p className="text-dark/40 text-sm">Aucune réservation confirmée</p>
            ) : (
              <div className="space-y-3">
                {reservations.map((res, i) => (
                  <div key={i} className="p-3 bg-beige-50 rounded-xl border border-beige-200 text-sm">
                    <p className="font-medium text-dark">
                      {res.guest_first_name} {res.guest_last_name}
                    </p>
                    <p className="text-dark/60 text-xs mt-0.5">
                      {res.check_in} → {res.check_out}
                    </p>
                    <p className="text-dark/40 text-xs">{res.guests} pers.</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="bg-white rounded-2xl border border-beige-200 p-5 mt-4">
            <h3 className="font-semibold text-dark mb-3 text-sm">Légende</h3>
            <div className="space-y-2 text-xs text-dark/60">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-green-200 border border-green-400 flex-shrink-0" />
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-red-200 border border-red-400 flex-shrink-0" />
                <span>Bloqué manuellement</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gold-200 border border-gold-400 flex-shrink-0" />
                <span>Réservation confirmée</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
