'use client'

import { MessageCircle, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import type { Partner } from '@/lib/types'

interface Props {
  partner: Partner
}

export default function PartnerWhatsAppCard({ partner }: Props) {
  const [copied, setCopied] = useState(false)

  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/partenaire`
    : '/partenaire'

  const message = encodeURIComponent(
    `Bonjour ${partner.name} 👋\n\n` +
    `Vous êtes maintenant partenaire L&Lui Signature.\n\n` +
    `🔑 Code d'accès : ${partner.access_code}\n` +
    `🔒 PIN : ${partner.access_pin ?? '(à configurer)'}\n\n` +
    `Accédez à votre espace partenaire ici :\n${portalUrl}\n\n` +
    `Vous pourrez y gérer les disponibilités de vos hébergements et créer des réservations pour vos clients.`
  )

  const whatsappUrl = `https://wa.me/${partner.whatsapp_number}?text=${message}`

  const copyLink = () => {
    navigator.clipboard.writeText(whatsappUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
      <MessageCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-green-900">Inviter via WhatsApp</p>
        <p className="text-xs text-green-700 mt-0.5">
          Envoyez le lien d&apos;accès au portail avec les identifiants pré-remplis.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
          >
            <MessageCircle size={13} /> Ouvrir WhatsApp
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-green-300 text-green-800 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
          >
            {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
            {copied ? 'Copié !' : 'Copier le lien'}
          </button>
        </div>
      </div>
    </div>
  )
}
