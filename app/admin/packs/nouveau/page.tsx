import { db } from '@/lib/firebase'
import PackForm from '@/components/admin/PackForm'
import type { Accommodation } from '@/lib/types'

async function getAccommodations(): Promise<Accommodation[]> {
  const snap = await db.collection('hebergements').where('status', '==', 'active').get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Accommodation[]
}

export const metadata = { title: 'Nouveau pack – Admin' }

export default async function NewPackPage() {
  const accommodations = await getAccommodations()

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-dark">Nouveau pack</h1>
        <p className="text-dark/50 text-sm mt-1">Créer une offre groupée de logements</p>
      </div>
      <PackForm accommodations={accommodations} />
    </div>
  )
}
