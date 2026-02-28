import { notFound } from 'next/navigation'
import { db } from '@/lib/firebase'
import PackForm from '@/components/admin/PackForm'
import type { Pack, Accommodation } from '@/lib/types'

async function getPack(id: string): Promise<Pack | null> {
  const doc = await db.collection('packs').doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as Pack
}

async function getAccommodations(): Promise<Accommodation[]> {
  const snap = await db.collection('hebergements').where('status', '==', 'active').get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Accommodation[]
}

export const metadata = { title: 'Modifier pack – Admin' }

export default async function EditPackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [pack, accommodations] = await Promise.all([getPack(id), getAccommodations()])
  if (!pack) notFound()

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-dark">Modifier le pack</h1>
        <p className="text-dark/50 text-sm mt-1">{pack.name}</p>
      </div>
      <PackForm pack={pack} accommodations={accommodations} />
    </div>
  )
}
