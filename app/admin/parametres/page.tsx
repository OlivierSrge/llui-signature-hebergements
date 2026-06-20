import { getParametresPlateforme, getHistoriqueParametres } from '@/actions/parametres'
import ParametresClient from './ParametresClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Paramètres Globaux | Admin L&Lui' }

export default async function ParametresPage() {
  const [params, historique] = await Promise.all([
    getParametresPlateforme(),
    getHistoriqueParametres(),
  ])

  return <ParametresClient params={params} historique={historique} />
}
