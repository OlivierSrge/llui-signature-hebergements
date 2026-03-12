export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'
import { loadPaymentSettings } from '@/actions/payment-settings'
import PaymentSettingsForm from '@/components/partner/PaymentSettingsForm'

export const metadata = { title: 'Paramètres de paiement' }

export default async function PartnerParametresPage() {
  const cookieStore = cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) redirect('/partenaire')

  const [settings, partnerDoc] = await Promise.all([
    loadPaymentSettings(partnerId),
    db.collection('partenaires').doc(partnerId).get(),
  ])
  const partner = partnerDoc.data()

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-beige-200 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/partenaire/dashboard" className="p-2 rounded-xl hover:bg-beige-50 transition-colors text-dark/50 hover:text-dark">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-xs text-dark/40">Espace partenaire — {partner?.name}</p>
            <h1 className="font-serif text-xl font-semibold text-dark flex items-center gap-2">
              <Settings size={18} className="text-gold-500" />
              Paramètres de paiement
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-sm text-dark/50 mb-6">
          Configurez vos coordonnées de paiement. Le numéro Orange Money sera utilisé dans les messages de
          demande de paiement envoyés à vos clients. Si non configuré, le numéro L&amp;Lui Signature (693407964)
          sera utilisé comme solution de secours.
        </p>
        <PaymentSettingsForm partnerId={partnerId} initialSettings={settings} />
      </main>
    </div>
  )
}
