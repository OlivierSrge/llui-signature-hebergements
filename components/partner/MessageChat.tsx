'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2 } from 'lucide-react'
import { sendMessage, markMessagesRead } from '@/actions/messages'
import type { Message } from '@/actions/messages'

interface Props {
  partnerId: string
  senderRole: 'partner' | 'admin'
  senderName: string
  initialMessages: Message[]
}

export default function MessageChat({ partnerId, senderRole, senderName, initialMessages }: Props) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [initialMessages])

  // Marquer comme lu au chargement
  useEffect(() => {
    markMessagesRead(partnerId, senderRole).then(() => router.refresh())
  }, [partnerId, senderRole, router])

  // Polling toutes les 10s
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 10_000)
    return () => clearInterval(timer)
  }, [router])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    await sendMessage(partnerId, senderRole, senderName, text)
    setText('')
    setSending(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {initialMessages.length === 0 ? (
          <div className="text-center text-dark/40 text-sm py-12">
            Commencez la conversation…
          </div>
        ) : (
          initialMessages.map((msg) => {
            const isOwn = msg.sender_role === senderRole
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isOwn
                  ? 'bg-gold-500 text-white rounded-br-sm'
                  : 'bg-beige-100 text-dark rounded-bl-sm'
                }`}>
                  {!isOwn && (
                    <p className="text-[10px] font-semibold mb-1 opacity-60">{msg.sender_name}</p>
                  )}
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/60' : 'text-dark/40'} text-right`}>
                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {isOwn && !msg.read && ' · En attente'}
                    {isOwn && msg.read && ' · Lu'}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-beige-200 px-4 py-3 bg-white">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écrivez votre message…"
            className="flex-1 px-4 py-2.5 text-sm border border-beige-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-300 bg-beige-50"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="p-2.5 bg-gold-500 text-white rounded-xl hover:bg-gold-600 disabled:opacity-50 transition-colors"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  )
}
