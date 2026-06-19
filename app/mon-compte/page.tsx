// app/mon-compte/page.tsx — Dashboard client Stars (accessible par n° de téléphone)

import { getParametresPlateforme } from '@/actions/parametres'
import MonCompteClient from './MonCompteClient'

interface Props {
  searchParams: { tel?: string }
}

export const metadata = {
  title: 'Mon Compte Stars — L&Lui',
  description: 'Consultez vos L&Lui Stars, votre palier et vos avantages fidélité.',
}

export default async function MonComptePage({ searchParams }: Props) {
  const params = await getParametresPlateforme()
  const initialTel = searchParams.tel ?? null

  return <MonCompteClient params={params} initialTel={initialTel} />
}
