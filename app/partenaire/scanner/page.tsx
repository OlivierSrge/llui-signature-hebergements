export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import QrScanner from '@/components/partner/QrScanner'

export default async function PartnerScannerPage() {
  const cookieStore = cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) redirect('/partenaire')

  const partnerDoc = await db.collection('partenaires').doc(partnerId).get()
  if (!partnerDoc.exists) redirect('/partenaire')
  const partnerAccessCode = partnerDoc.data()!.access_code as string

  return (
    <div className="min-h-screen bg-beige-50">
      <header className="bg-white border-b border-beige-200 px-4 sm:px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/partenaire/dashboard" className="p-2 rounded-xl hover:bg-beige-50 transition-colors text-dark/50 hover:text-dark">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-xs text-dark/40">Espace partenaire</p>
            <h1 className="font-serif text-xl font-semibold text-dark">Scanner à l&apos;arrivée</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <QrScanner partnerAccessCode={partnerAccessCode} />
      </main>
    </div>
  )
}
