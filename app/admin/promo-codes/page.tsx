export const dynamic = 'force-dynamic'

import { getPromoCodes } from '@/actions/promo-codes'
import PromoCodesClient from './PromoCodesClient'

export const metadata = { title: 'Codes promo – Admin' }

export default async function AdminPromoCodesPage() {
  const codes = await getPromoCodes()
  return <PromoCodesClient initialCodes={codes} />
}
