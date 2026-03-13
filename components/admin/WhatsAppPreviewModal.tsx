'use client'

import { useState } from 'react'
import { X, MessageCircle, Pencil, Send, Phone, ToggleLeft, ToggleRight } from 'lucide-react'

interface Props {
  isOpen: boolean
  message: string
  url: string
  phone: string
  recipientName: string
  buttonLabel: string
  /** Pour le bouton 2 : afficher le toggle Revolut */
  showRevolutToggle?: boolean
  revolutIncluded?: boolean
  onRevolutToggle?: (included: boolean) => void
  onSend: (finalMessage: string) => void
  onClose: () => void
}

export default function WhatsAppPreviewModal({
  isOpen,
  message,
  url,
  phone,
  recipientName,
  buttonLabel,
  showRevolutToggle = false,
  revolutIncluded = false,
  onRevolutToggle,
  onSend,
  onClose,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [editedMessage, setEditedMessage] = useState(message)

  if (!isOpen) return null

  // Reconstruit l'URL avec le message éventuellement modifié
  const buildUrl = (msg: string) => {
    const basePhone = url.split('?')[0].replace('https://wa.me/', '')
    return `https://wa.me/${basePhone}?text=${encodeURIComponent(msg)}`
  }

  const handleSend = () => {
    const finalMsg = editing ? editedMessage : message
    const finalUrl = buildUrl(finalMsg)
    // Ouverture explicite par clic utilisateur — contourne le blocage popup navigateur
    window.open(finalUrl, '_blank')
    onSend(finalMsg)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-dark/50 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-beige-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <MessageCircle size={16} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-dark">{buttonLabel}</p>
              <div className="flex items-center gap-1 text-xs text-dark/50">
                <Phone size={10} />
                <span>{phone}</span>
                <span className="text-dark/30">·</span>
                <span>{recipientName}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-beige-50 text-dark/40 hover:text-dark transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Message preview / edit */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Toggle Revolut si applicable */}
          {showRevolutToggle && onRevolutToggle && (
            <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl">
              <div>
                <p className="text-xs font-semibold text-purple-800">Inclure Revolut dans le message</p>
                <p className="text-xs text-purple-600 mt-0.5">Option paiement par carte bancaire internationale</p>
              </div>
              <button
                type="button"
                onClick={() => onRevolutToggle(!revolutIncluded)}
                className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors ${revolutIncluded ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
              >
                {revolutIncluded ? <><ToggleRight size={14} /> Activé</> : <><ToggleLeft size={14} /> Désactivé</>}
              </button>
            </div>
          )}

          {editing ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-dark/60 flex items-center gap-1">
                <Pencil size={10} /> Modifier le message
              </p>
              <textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                className="w-full min-h-[200px] p-3 text-sm text-dark border border-beige-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-300 resize-none font-mono bg-beige-50"
                autoFocus
              />
              <button
                type="button"
                onClick={() => { setEditing(false); setEditedMessage(message) }}
                className="text-xs text-dark/40 hover:text-dark transition-colors"
              >
                Réinitialiser le message
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-dark/60">Message qui sera envoyé</p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <pre className="text-sm text-dark whitespace-pre-wrap break-words font-sans leading-relaxed">
                  {editing ? editedMessage : message}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-beige-100 space-y-2 flex-shrink-0">
          <button
            onClick={handleSend}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 active:bg-green-800 transition-colors"
          >
            <Send size={15} />
            Ouvrir WhatsApp et envoyer
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => { setEditing(!editing); if (!editing) setEditedMessage(message) }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 border border-beige-200 rounded-xl text-sm text-dark/60 hover:bg-beige-50 hover:text-dark transition-colors"
            >
              <Pencil size={13} /> {editing ? 'Voir le message' : 'Modifier le message'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-beige-200 rounded-xl text-sm text-dark/60 hover:bg-beige-50 hover:text-dark transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
