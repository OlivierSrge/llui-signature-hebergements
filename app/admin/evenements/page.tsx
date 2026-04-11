import { listerEvenementsAdmin } from '@/actions/evenements'
import EvenementsClient from './EvenementsClient'

export const dynamic = 'force-dynamic'

export default async function EvenementsPage() {
  const evenements = await listerEvenementsAdmin()
  return <EvenementsClient evenements={evenements} />
}
