export const dynamic = 'force-dynamic'

import { getDevisList } from '@/actions/devis'
import DevisAdminTabs from '@/components/admin/DevisAdminTabs'

export const metadata = { title: 'Mariages & Devis — L&Lui Signature' }

export default async function DevisPage() {
  const devisList = await getDevisList()

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0 space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-dark">💍 Mariages & Devis</h1>
        <p className="text-dark/50 text-sm mt-1">Générateur de propositions commerciales L&Lui Signature</p>
      </div>
      <DevisAdminTabs devisList={devisList} />
    </div>
  )
}
