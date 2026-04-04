export const dynamic = 'force-dynamic'

import { getPrescripteurTypes } from '@/actions/prescripteurs'
import { db } from '@/lib/firebase'
import PrescripteurForm from '@/components/admin/PrescripteurForm'

export const metadata = { title: 'Nouveau prescripteur – Admin' }

export default async function NouveauPrescripteurPage() {
  const [types, hebergementsSnap] = await Promise.all([
    getPrescripteurTypes(),
    db.collection('accommodations').orderBy('name').get(),
  ])

  const hebergements = hebergementsSnap.docs.map((d) => ({
    id: d.id,
    name: d.data().name as string,
  }))

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-dark">Nouveau prescripteur</h1>
        <p className="text-dark/50 text-sm mt-1">Créer un compte moto-taxi, taxi, hôtesse ou agence</p>
      </div>
      <PrescripteurForm types={types} hebergements={hebergements} />
    </div>
  )
}
