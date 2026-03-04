export const dynamic = 'force-dynamic'

import PartnerForm from '@/components/admin/PartnerForm'

export const metadata = { title: 'Nouveau partenaire – Admin' }

export default function NewPartnerPage() {
  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-dark">Nouveau partenaire</h1>
        <p className="text-dark/50 text-sm mt-1">Ajouter un propriétaire ou partenaire</p>
      </div>
      <PartnerForm />
    </div>
  )
}
