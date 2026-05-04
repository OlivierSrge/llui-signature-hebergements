'use client'
// components/alliance-privee/ChatInterface.tsx — Chat sécurisé + Sentinelle IA
// Polling toutes les 3s (pas de SDK client Firebase requis)

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  envoyerMessage,
  getChatMessages,
  marquerMessagesLus,
  type ChatMessageDoc,
} from '@/actions/alliance-privee-matching'
import { analyserMessageSentinelle } from '@/types/alliance-privee'

interface Props {
  matchId: string
  currentMemberId: string
  partnerPrenom: string
  partnerPhoto?: string
  initialMessages?: ChatMessageDoc[]
}

export default function ChatInterface({
  matchId,
  currentMemberId,
  partnerPrenom,
  partnerPhoto,
  initialMessages = [],
}: Props) {
  const [messages, setMessages] = useState<ChatMessageDoc[]>(initialMessages)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sentinelleAlert, setSentinelleAlert] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastCountRef = useRef(initialMessages.length)

  // ── Polling messages toutes les 3 secondes ──────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const msgs = await getChatMessages(matchId)
        setMessages(msgs)
        if (msgs.length > lastCountRef.current) {
          lastCountRef.current = msgs.length
          marquerMessagesLus(matchId, currentMemberId).catch(console.warn)
        }
      } catch (e) {
        console.warn('[ChatInterface] poll:', e)
      }
    }
    poll() // immédiat
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [matchId, currentMemberId])

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // ── Prévisualisation Sentinelle en temps réel ────────────────────────────────
  const handleDraftChange = useCallback((val: string) => {
    setDraft(val)
    setSentinelleAlert(null)
    if (val.trim().length > 3) {
      const check = analyserMessageSentinelle(val)
      if (!check.ok) {
        setSentinelleAlert(check.reason ?? 'Contenu non autorisé')
      }
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Envoi ───────────────────────────────────────────────────────────────────
  async function handleSend() {
    const trimmed = draft.trim()
    if (!trimmed || sending || !!sentinelleAlert) return
    setSending(true)
    setSendError(null)

    const result = await envoyerMessage({
      matchId,
      senderId: currentMemberId,
      content: trimmed,
    })
    setSending(false)

    if (result.blocked) {
      setSendError(result.reason ?? 'Message bloqué par Sentinelle IA')
      setDraft('')
      return
    }
    if (!result.success) {
      setSendError(result.error ?? 'Erreur d\'envoi')
      return
    }
    setDraft('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setSendError(null)
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isMe = (msg: ChatMessageDoc) => msg.sender_id === currentMemberId

  return (
    <div className="flex flex-col h-full max-h-[80vh] bg-black/40 rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/30">
        <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {partnerPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partnerPhoto}
              alt={partnerPrenom}
              className="w-full h-full object-cover blur-sm"
            />
          ) : (
            <span className="text-amber-400 text-sm">◈</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{partnerPrenom}</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            <span className="text-emerald-400 text-[10px]">Chat sécurisé Alliance Privée</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-amber-500/60 border border-amber-500/20 rounded-full px-2 py-0.5">
          <span>🛡</span>
          <span>Sentinelle IA</span>
        </div>
      </div>

      {/* Liste messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 text-white/30">
            <p className="text-3xl mb-3">💬</p>
            <p className="text-sm">Soyez le premier à écrire.</p>
            <p className="text-xs mt-1 text-amber-500/40">
              Sentinelle IA veille à la qualité des échanges.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const mine = isMe(msg)
          return (
            <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] space-y-0.5 flex flex-col ${
                  mine ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.blocked
                      ? 'bg-red-950/60 border border-red-500/30 text-red-300/60 italic'
                      : mine
                      ? 'bg-amber-500/15 border border-amber-500/20 text-white'
                      : 'bg-white/5 border border-white/10 text-white'
                  }`}
                >
                  {msg.blocked ? (
                    <span className="flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>Message bloqué par Sentinelle IA</span>
                    </span>
                  ) : (
                    msg.content
                  )}
                </div>

                <div
                  className={`flex items-center gap-1.5 px-1 ${mine ? 'flex-row-reverse' : ''}`}
                >
                  <span className="text-[10px] text-white/30">{formatTime(msg.date_sent)}</span>
                  {mine && !msg.blocked && (
                    <span
                      className={`text-[10px] ${msg.read ? 'text-amber-400' : 'text-white/30'}`}
                    >
                      {msg.read ? '✓✓' : '✓'}
                    </span>
                  )}
                  {msg.blocked && (
                    <span className="text-[10px] text-red-400/60 max-w-[200px] text-right">
                      {msg.block_reason}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Alerte Sentinelle / erreur */}
      {(sentinelleAlert || sendError) && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
          <span className="flex-shrink-0 mt-0.5">⚠️</span>
          <span>
            {sentinelleAlert
              ? `Sentinelle IA : ${sentinelleAlert}`
              : sendError}
          </span>
        </div>
      )}

      {/* Zone saisie */}
      <div className="px-4 py-3 border-t border-white/10 bg-black/20">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => {
              handleDraftChange(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez votre message… (Entrée pour envoyer)"
            rows={1}
            className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/40 transition-all"
            style={{ minHeight: 44, maxHeight: 120 }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending || !!sentinelleAlert}
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 active:scale-95"
            style={{
              background:
                draft.trim() && !sentinelleAlert
                  ? 'linear-gradient(135deg, #D4AF37, #C49A28)'
                  : 'rgba(255,255,255,0.05)',
            }}
          >
            {sending ? (
              <span className="text-sm animate-spin inline-block">⟳</span>
            ) : (
              <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-white/20 mt-1.5 text-center">
          Entrée pour envoyer · Shift+Entrée pour nouvelle ligne
        </p>
      </div>
    </div>
  )
}
