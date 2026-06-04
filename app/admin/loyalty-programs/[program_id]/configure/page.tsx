import { redirect } from 'next/navigation'
import { getLoyaltyProgramById } from '@/actions/loyalty'
import { serialize } from '@/lib/serialize'
import ConfigureLoyaltyProgramClient from '@/components/loyalty/admin/ConfigureLoyaltyProgramClient'

export const dynamic = 'force-dynamic'

export default async function ConfigureLoyaltyProgramPage({
  params,
}: {
  params: { program_id: string }
}) {
  const { success, program, error } = await getLoyaltyProgramById(params.program_id)

  if (!success || !program) {
    redirect('/admin/loyalty-programs')
  }

  return <ConfigureLoyaltyProgramClient program={serialize(program)} />
}
