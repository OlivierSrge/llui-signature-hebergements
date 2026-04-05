export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getPrescripteur, getPrescripteurTypes } from '@/actions/prescripteurs'
import { db } from '@/lib/firebase'
import PrescripteurForm from '@/components/admin/PrescripteurForm'

export const metadata = { title: 'Modifier prescripteur – Admin' }

export default async function ModifierPrescripteurPage({ params }: { params: { id: string } }) {
  const [prescripteur, types, hebergementsSnap] = await Promise.all([
    getPrescripteur(params.id).catch(() => null),
    getPrescripteurTypes().catch(() => []),
    db.collection('hebergements').orderBy('name').get().catch(() => null),
  ])

  if (!prescripteur) notFound()

  const hebergements = hebergementsSnap
    ? hebergementsSnap.docs.map((d) => ({
        id: d.id,
        name: d.data().name as string,
      }))
    : []

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-dark">Modifier le prescripteur</h1>
        <p className="text-dark/50 text-sm mt-1">{prescripteur.nom_complet}</p>
      </div>
      <PrescripteurForm
        prescripteur={prescripteur}
        types={types}
        hebergements={hebergements}
      />
    </div>
  )
}
