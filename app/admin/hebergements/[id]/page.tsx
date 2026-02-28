import { notFound } from 'next/navigation'
import { db } from '@/lib/firebase'
import AccommodationForm from '@/components/admin/AccommodationForm'
import Link from 'next/link'
import { ChevronLeft, Calendar } from 'lucide-react'
import type { Partner } from '@/lib/types'

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
  const [accommodation, partners] = await Promise.all([getAccommodation(id), getPartners()])
  if (!accommodation) notFound()

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <Link href="/admin/hebergements" className="inline-flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark transition-colors">
          <ChevronLeft size={16} /> Retour aux hébergements
        </Link>
        <Link href={`/admin/hebergements/${id}/disponibilites`} className="btn-secondary text-sm">
          <Calendar size={15} /> Gérer les disponibilités
        </Link>
      </div>
      <h1 className="font-serif text-3xl font-semibold text-dark mb-8">Modifier : {accommodation.name}</h1>
      <AccommodationForm accommodation={accommodation} partners={partners} />
    </div>
  )
}
