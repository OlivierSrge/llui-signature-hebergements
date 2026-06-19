// app/(main)/mon-stars/page.tsx — Dashboard client L&Lui Stars (QR scan, par téléphone)

import { getParametresPlateforme } from '@/actions/parametres'
import MonStarsClient from './MonStarsClient'

interface Props {
  searchParams: { tel?: string }
}

export const metadata = {
  title: 'Mes Stars — L&Lui',
  description: 'Consultez vos L&Lui Stars, votre palier et vos avantages fidélité.',
}

export default async function MonStarsPage({ searchParams }: Props) {
  const params = await getParametresPlateforme()
  const initialTel = searchParams.tel ?? null

  return <MonStarsClient params={params} initialTel={initialTel} />
}
