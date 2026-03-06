export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/firebase'
import { getConversation } from '@/actions/messages'
import MessageChat from '@/components/partner/MessageChat'

export default async function AdminMessageConversationPage({
  params,
}: {
  params: Promise<{ partnerId: string }>
}) {
  const { partnerId } = await params

  const partnerDoc = await db.collection('partenaires').doc(partnerId).get()
  if (!partnerDoc.exists) notFound()
  const partnerName = partnerDoc.data()!.name as string

  const messages = await getConversation(partnerId)

  return (
    <div className="flex flex-col mt-14 lg:mt-0" style={{ height: 'calc(100vh - 56px)' }}>
      <header className="bg-white border-b border-beige-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/admin/messages" className="p-2 rounded-xl hover:bg-beige-50 text-dark/50 hover:text-dark transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-semibold text-dark">{partnerName}</h1>
            <p className="text-xs text-dark/40">Conversation partenaire</p>
          </div>
          <Link
            href={`/admin/partenaires/${partnerId}`}
            className="ml-auto text-xs text-gold-600 hover:text-gold-700"
          >
            Voir la fiche →
          </Link>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <MessageChat
          partnerId={partnerId}
          senderRole="admin"
          senderName="L&Lui Signature"
          initialMessages={messages}
        />
      </div>
    </div>
  )
}
