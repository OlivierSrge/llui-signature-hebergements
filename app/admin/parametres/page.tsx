import { getParametresPlateforme, getHistoriqueParametres } from '@/actions/parametres'
import { getAllLoyaltyPrograms } from '@/actions/loyalty'
import ParametresClient from './ParametresClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Paramètres Globaux | Admin L&Lui' }

export default async function ParametresPage() {
  const [params, historique, loyaltyResult] = await Promise.all([
    getParametresPlateforme(),
    getHistoriqueParametres(),
    getAllLoyaltyPrograms().catch(() => ({ programs: [] })),
  ])

  return (
    <ParametresClient
      params={params}
      historique={historique}
      loyaltyPrograms={loyaltyResult.programs ?? []}
    />
  )
}
