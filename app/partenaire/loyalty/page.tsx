export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import LoyaltyDashboardClient from '@/components/loyalty/LoyaltyDashboardClient'

export default function PartnerLoyaltyPage() {
  const cookieStore = cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) redirect('/partenaire')

  return <LoyaltyDashboardClient partenaireId={partnerId} />
}
