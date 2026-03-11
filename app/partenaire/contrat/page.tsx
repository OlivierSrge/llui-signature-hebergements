export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { loadPartnerContractData } from '@/actions/contract'
import ContractSigningFlow from '@/components/partner/ContractSigningFlow'
import { FileSignature } from 'lucide-react'

export const metadata = { title: 'Contrat de partenariat – Espace partenaire' }

export default async function PartnerContratPage() {
  const cookieStore = cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) redirect('/partenaire')

  let data: Awaited<ReturnType<typeof loadPartnerContractData>>
  try {
    data = await loadPartnerContractData(partnerId)
  } catch (e) {
    redirect('/partenaire')
  }

  const { partner, contract, contractText, commissionClause, contractMeta } = data!

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-beige-200 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <FileSignature size={20} className="text-gold-500" />
          <div>
            <h1 className="font-serif text-lg font-semibold text-dark">Contrat de partenariat</h1>
            <p className="text-xs text-dark/40">{partner.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-24">
        <ContractSigningFlow
          partnerId={partnerId}
          partnerName={partner.name}
          partnerWhatsapp={partner.whatsapp_number || partner.phone || ''}
          partnerPlan={partner.subscriptionPlan || 'essentiel'}
          contractText={contractText}
          commissionClause={commissionClause}
          contractMeta={contractMeta}
          existingContract={{
            status: contract.status,
            contractId: contract.contractId || '',
            signedAt: contract.signedAt,
            signatoryName: contract.signatoryName,
            pdfUrl: contract.pdfUrl,
          }}
        />
      </main>
    </div>
  )
}
