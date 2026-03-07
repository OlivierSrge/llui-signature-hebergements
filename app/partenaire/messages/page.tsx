export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import MessageChat from '@/components/partner/MessageChat'
import { getConversation } from '@/actions/messages'
import { getEffectivePermissions } from '@/actions/subscriptions'

export default async function PartnerMessagesPage() {
  const cookieStore = cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) redirect('/partenaire')

  const permissions = await getEffectivePermissions(partnerId)
  if (!permissions.canAccessMessaging) redirect('/partenaire/upgrade')

  const partnerDoc = await db.collection('partenaires').doc(partnerId).get()
  if (!partnerDoc.exists) redirect('/partenaire')
  const partnerName = partnerDoc.data()!.name as string

  const messages = await getConversation(partnerId)

  return (
    <div className="min-h-screen bg-beige-50 flex flex-col">
      <header className="bg-white border-b border-beige-200 px-4 py-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/partenaire/dashboard" className="p-2 rounded-xl hover:bg-beige-50 text-dark/50 hover:text-dark transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-gold-500" />
            <div>
              <h1 className="font-semibold text-dark text-sm">Messages — L&Lui Signature</h1>
              <p className="text-xs text-dark/40">Support et communications</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto flex flex-col" style={{ height: 'calc(100vh - 73px - 56px)' }}>
        <MessageChat
          partnerId={partnerId}
          senderRole="partner"
          senderName={partnerName}
          initialMessages={messages}
        />
      </main>
    </div>
  )
}
