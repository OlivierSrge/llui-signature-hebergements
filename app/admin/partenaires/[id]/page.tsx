export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { db } from '@/lib/firebase'
import PartnerForm from '@/components/admin/PartnerForm'
import PartnerWhatsAppCard from '@/components/admin/PartnerWhatsAppCard'
import type { Partner } from '@/lib/types'

async function getPartner(id: string): Promise<Partner | null> {
  const doc = await db.collection('partenaires').doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as Partner
}

export const metadata = { title: 'Modifier partenaire – Admin' }

export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const partner = await getPartner(id)
  if (!partner) notFound()

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-dark">Modifier le partenaire</h1>
        <p className="text-dark/50 text-sm mt-1">{partner.name}</p>
      </div>

      {/* Lien d'invitation WhatsApp */}
      {partner.whatsapp_number && (
        <div className="max-w-3xl mb-6">
          <PartnerWhatsAppCard partner={partner} />
        </div>
      )}

      <PartnerForm partner={partner} />
    </div>
  )
}
