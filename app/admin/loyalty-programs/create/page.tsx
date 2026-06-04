import { listerPrescripteursPartenaires } from '@/actions/codes-sessions'
import { serialize } from '@/lib/serialize'
import CreateLoyaltyProgramClient from '@/components/loyalty/CreateLoyaltyProgramClient'

export const dynamic = 'force-dynamic'

export default async function AdminCreateLoyaltyProgramPage() {
  const partenaires = await listerPrescripteursPartenaires()

  return <CreateLoyaltyProgramClient partenaires={serialize(partenaires)} />
}
