export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getLoyaltyConfig, getLoyaltyLevelsConfig, getAuditLog } from '@/actions/fidelite'
import FideliteParametresTabs from '@/components/admin/FideliteParametresTabs'

export const metadata = { title: 'Paramètres — Fidélité L&Lui Stars' }

export default async function FideliteParametresPage() {
  const [config, levelsConfig, auditLog] = await Promise.all([
    getLoyaltyConfig(),
    getLoyaltyLevelsConfig(),
    getAuditLog(),
  ])

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/fidelite"
          className="p-2 rounded-xl border border-beige-200 hover:bg-beige-50 text-dark/50 hover:text-dark">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-serif text-3xl font-semibold text-dark">Paramètres du programme</h1>
          <p className="text-dark/50 text-sm mt-1">Configuration L&Lui Stars — règles, niveaux, codes promo</p>
        </div>
      </div>

      <FideliteParametresTabs
        config={config}
        levelsConfig={levelsConfig as any}
        auditLog={auditLog}
      />
    </div>
  )
}
