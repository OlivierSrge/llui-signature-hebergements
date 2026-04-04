export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getRapportMensuel } from '@/actions/prescripteurs'
import RapportClient from './RapportClient'

export async function generateMetadata({ params }: { params: { id: string; mois: string } }) {
  return { title: `Rapport ${params.mois} – Admin` }
}

export default async function RapportPage({ params }: { params: { id: string; mois: string } }) {
  const rapport = await getRapportMensuel(params.id, params.mois)
  if (!rapport) notFound()

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href={`/admin/prescripteurs/${params.id}`}
          className="inline-flex items-center gap-2 text-sm text-dark/50 hover:text-dark"
        >
          <ArrowLeft size={14} /> Retour
        </Link>
        <h1 className="font-serif text-xl font-semibold text-dark">
          Rapport {rapport.mois_label} — {rapport.prescripteur.nom_complet}
        </h1>
      </div>
      <RapportClient rapport={rapport} />
    </div>
  )
}
