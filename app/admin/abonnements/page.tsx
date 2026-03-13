export const dynamic = 'force-dynamic'

import { getAllPlanConfigs, getPlanHistory } from '@/actions/admin-subscriptions'
import SubscriptionPlansAdmin from '@/components/admin/SubscriptionPlansAdmin'

export const metadata = { title: 'Abonnements' }

export default async function AdminAbonnementsPage() {
  const [plans, history] = await Promise.all([
    getAllPlanConfigs(),
    getPlanHistory(),
  ])

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-dark">Abonnements</h1>
        <p className="text-dark/50 text-sm mt-1">
          Gérez les formules d&apos;abonnement, les tarifs et les accès partenaires
        </p>
      </div>

      <SubscriptionPlansAdmin plans={plans} history={history} />
    </div>
  )
}
