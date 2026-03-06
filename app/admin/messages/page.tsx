export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { MessageCircle, ArrowRight } from 'lucide-react'
import { getAllConversations } from '@/actions/messages'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Messages — Admin' }

export default async function AdminMessagesPage() {
  const conversations = await getAllConversations()

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-dark">Messages partenaires</h1>
        <p className="text-dark/50 text-sm mt-1">{conversations.length} conversation{conversations.length > 1 ? 's' : ''}</p>
      </div>

      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        {conversations.length === 0 ? (
          <div className="py-16 text-center">
            <MessageCircle size={40} className="text-dark/20 mx-auto mb-3" />
            <p className="text-dark/40 text-sm">Aucun message pour l&apos;instant</p>
          </div>
        ) : (
          <div className="divide-y divide-beige-100">
            {conversations.map((conv) => (
              <Link
                key={conv.partner_id}
                href={`/admin/messages/${conv.partner_id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-beige-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${conv.unread_count > 0 ? 'bg-gold-500 text-white' : 'bg-beige-100 text-dark/50'}`}>
                  {conv.partner_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-dark text-sm">{conv.partner_name}</p>
                    {conv.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-dark/50 truncate mt-0.5">{conv.last_message}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {conv.last_message_at && (
                    <p className="text-xs text-dark/30">
                      {formatDate(conv.last_message_at, 'dd/MM')}
                    </p>
                  )}
                  <ArrowRight size={14} className="text-dark/30" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
