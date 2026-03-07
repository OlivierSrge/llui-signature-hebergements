'use client'

import { AlertTriangle } from 'lucide-react'

const WHATSAPP_ADMIN = '693407964'

export default function SuspendedPage({ partnerName }: { partnerName?: string }) {
  const msg = encodeURIComponent(
    `Bonjour, je suis ${partnerName ?? 'un partenaire'} et je souhaite réactiver mon abonnement L&Lui Signature.`
  )
  const waUrl = `https://wa.me/${WHATSAPP_ADMIN}?text=${msg}`

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#F5F0E8' }}>
      <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full text-center shadow-sm">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <h1 className="font-serif text-2xl font-semibold text-dark mb-2">Abonnement expiré</h1>
        <p className="text-dark/60 text-sm leading-relaxed mb-6">
          Votre abonnement L&amp;Lui Signature a expiré. Vos logements restent visibles sur le site,
          mais l&apos;accès à l&apos;espace de gestion est suspendu.
          <br /><br />
          Contactez L&amp;Lui Signature pour renouveler votre accès.
        </p>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white text-sm font-semibold"
          style={{ background: '#25D366' }}
        >
          💬 Contacter L&amp;Lui Signature sur WhatsApp
        </a>
        <p className="text-xs text-dark/30 mt-4">L&amp;Lui Signature — Propulsé par la confiance</p>
      </div>
    </div>
  )
}
