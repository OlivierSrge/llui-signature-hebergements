export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import AccommodationForm from '@/components/admin/AccommodationForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import type { Partner } from '@/lib/types'

export const metadata = { title: 'Nouvel hébergement' }

async function getPartners(): Promise<Partner[]> {
  const snap = await db.collection('partenaires').where('is_active', '==', true).get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Partner))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export default async function NouvelHebergementPage() {
  const partners = await getPartners()
  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <Link href="/admin/hebergements" className="inline-flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark mb-6 transition-colors">
        <ChevronLeft size={16} /> Retour aux hébergements
      </Link>
      <h1 className="font-serif text-3xl font-semibold text-dark mb-8">Nouvel hébergement</h1>
      <AccommodationForm partners={partners} />
    </div>
  )
}
