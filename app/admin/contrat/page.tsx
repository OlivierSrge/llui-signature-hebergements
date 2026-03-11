export const dynamic = 'force-dynamic'

import { loadContractClauses, loadCommissions, loadContractMeta } from '@/actions/contract'
import ContractAdminTabs from '@/components/admin/ContractAdminTabs'
import { FileSignature } from 'lucide-react'

export const metadata = { title: 'Contrat de partenariat – Admin' }

export default async function AdminContratPage() {
  const [clauses, commissions, meta] = await Promise.all([
    loadContractClauses(),
    loadCommissions(),
    loadContractMeta(),
  ])

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <FileSignature size={24} className="text-gold-500" />
          <h1 className="font-serif text-3xl font-semibold text-dark">Contrat de partenariat</h1>
        </div>
        <p className="text-dark/50 text-sm">
          Gérez le texte du contrat, les clauses de commission et les paramètres de version.
        </p>
      </div>

      <div className="max-w-4xl">
        <ContractAdminTabs
          initialClauses={clauses}
          initialCommissions={commissions}
          initialMeta={meta}
        />
      </div>
    </div>
  )
}
