import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AccommodationForm from '@/components/admin/AccommodationForm'
import Link from 'next/link'
import { ChevronLeft, Calendar } from 'lucide-react'
import type { Accommodation, Partner } from '@/lib/types'

async function getAccommodation(id: string): Promise<Accommodation | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('accommodations').select('*').eq('id', id).single()
  return data
}

async function getPartners(): Promise<Partner[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('partners').select('*').eq('is_active', true).order('name')
  return data || []
}

export const metadata = { title: 'Modifier hébergement' }

export default async function EditHebergementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [accommodation, partners] = await Promise.all([getAccommodation(id), getPartners()])

  if (!accommodation) notFound()

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <Link
          href="/admin/hebergements"
          className="inline-flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark transition-colors"
        >
          <ChevronLeft size={16} />
          Retour aux hébergements
        </Link>
        <Link
          href={`/admin/hebergements/${id}/disponibilites`}
          className="btn-secondary text-sm"
        >
          <Calendar size={15} />
          Gérer les disponibilités
        </Link>
      </div>

      <h1 className="font-serif text-3xl font-semibold text-dark mb-8">
        Modifier : {accommodation.name}
      </h1>

      <AccommodationForm accommodation={accommodation} partners={partners} />
    </div>
  )
}
