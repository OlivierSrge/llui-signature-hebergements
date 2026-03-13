export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { db } from '@/lib/firebase'
import PartnerForm from '@/components/admin/PartnerForm'
import PartnerWhatsAppCard from '@/components/admin/PartnerWhatsAppCard'
import PartnerCardDownload from '@/components/admin/PartnerCardDownload'
import PartnerContractSection from '@/components/admin/PartnerContractSection'
import AdminPaymentSettingsForm from '@/components/admin/AdminPaymentSettingsForm'
import PartnerCommissionsChart from '@/components/admin/PartnerCommissionsChart'
import { loadPaymentSettings } from '@/actions/payment-settings'
import { getPartnerCommissions12Months } from '@/actions/commissions'
import type { Partner } from '@/lib/types'

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'PART-'
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

async function getPartner(id: string) {
  const doc = await db.collection('partenaires').doc(id).get()
  if (!doc.exists) return null
  const data = doc.data()!

  // Auto-génère et sauvegarde le access_code s'il manque
  if (!data.access_code) {
    const newCode = generateAccessCode()
    await doc.ref.update({ access_code: newCode })
    data.access_code = newCode
  }

  // Initialiser le contrat s'il n'existe pas
  if (!data.contract) {
    await doc.ref.update({
      'contract.status': 'not_sent',
      'contract.version': '',
      'contract.contractId': '',
    })
    data.contract = { status: 'not_sent', version: '', contractId: '' }
  }

  return {
    id: doc.id,
    ...data,
    contractStatus: data.contract?.status || 'not_sent',
    contractId: data.contract?.contractId || '',
    signedAt: data.contract?.signedAt || undefined,
    pdfUrl: data.contract?.pdfUrl || undefined,
  } as Partner & { contractStatus: string; contractId: string; signedAt?: string; pdfUrl?: string }
}

export const metadata = { title: 'Modifier partenaire – Admin' }

export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [partner, paymentSettings, commissionsData] = await Promise.all([
    getPartner(id),
    loadPaymentSettings(id),
    getPartnerCommissions12Months(id),
  ])
  if (!partner) notFound()

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-dark">Modifier le partenaire</h1>
          <p className="text-dark/50 text-sm mt-1">{partner.name}</p>
        </div>
        <PartnerCardDownload partner={partner} />
      </div>

      {/* Section contrat */}
      <div className="max-w-3xl mb-6">
        <PartnerContractSection
          partnerId={partner.id}
          partnerName={partner.name}
          contractStatus={(partner as any).contractStatus || 'not_sent'}
          contractId={(partner as any).contractId || ''}
          signedAt={(partner as any).signedAt}
          pdfUrl={(partner as any).pdfUrl}
        />
      </div>

      {/* Lien d'invitation WhatsApp */}
      {partner.whatsapp_number && (
        <div className="max-w-3xl mb-6">
          <PartnerWhatsAppCard partner={partner} />
        </div>
      )}

      {/* Graphique commissions 12 mois */}
      <div className="max-w-3xl mb-6">
        <PartnerCommissionsChart data={commissionsData} />
      </div>

      {/* Paramètres de paiement */}
      <div className="max-w-3xl mb-6">
        <AdminPaymentSettingsForm partnerId={partner.id} initialSettings={paymentSettings} />
      </div>

      <PartnerForm partner={partner} />
    </div>
  )
}
