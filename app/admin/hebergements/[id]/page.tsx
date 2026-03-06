export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { db } from '@/lib/firebase'
import AccommodationForm from '@/components/admin/AccommodationForm'
import SeasonalPricingManager from '@/components/admin/SeasonalPricingManager'
import Link from 'next/link'
import { ChevronLeft, Calendar, Plus, Sun } from 'lucide-react'
import type { Partner } from '@/lib/types'
import { getSeasonalPricing } from '@/actions/seasonal-pricing'

async function getAccommodation(id: string) {
  const doc = await db.collection('hebergements').doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as any
}

async function getPartners(): Promise<Partner[]> {
  const snap = await db.collection('partenaires').where('is_active', '==', true).get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Partner))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const metadata = { title: 'Modifier hébergement' }

export default async function EditHebergementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [accommodation, partners, seasonalPeriods] = await Promise.all([
    getAccommodation(id),
    getPartners(),
    getSeasonalPricing(id),
  ])
  if (!accommodation) notFound()

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <Link href="/admin/hebergements" className="inline-flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark transition-colors">
          <ChevronLeft size={16} /> Retour aux hébergements
        </Link>
        <div className="flex gap-2">
          <Link href={`/admin/reservations/nouvelle?acc=${id}`} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus size={15} /> Réservation
          </Link>
          <Link href={`/admin/hebergements/${id}/disponibilites`} className="btn-secondary text-sm flex items-center gap-1.5">
            <Calendar size={15} /> Disponibilités
          </Link>
        </div>
      </div>
      <h1 className="font-serif text-3xl font-semibold text-dark mb-8">Modifier : {accommodation.name}</h1>
      <AccommodationForm accommodation={accommodation} partners={partners} />

      {/* Tarifs saisonniers */}
      <div className="max-w-3xl mt-8">
        <div className="bg-white rounded-2xl border border-beige-200 p-6">
          <h2 className="font-semibold text-dark border-b border-beige-200 pb-3 mb-4 flex items-center gap-2">
            <Sun size={16} className="text-amber-500" /> Tarifs saisonniers
          </h2>
          <p className="text-xs text-dark/50 mb-4">
            Définissez des tarifs spéciaux pour certaines périodes. Le tarif saisonnier remplace automatiquement le prix de base lors des calculs de réservation.
          </p>
          <SeasonalPricingManager
            accommodationId={id}
            basePrice={accommodation.price_per_night}
            periods={seasonalPeriods}
          />
        </div>
      </div>
    </div>
  )
}
