'use client'

import { useRef } from 'react'
import { X, MessageCircle } from 'lucide-react'

interface ReservationData {
  guestName: string
  accommodationName: string
  checkIn: string
  checkOut: string
  totalPrice: number
  confirmationCode: string
  reservationId: string
}

interface Props {
  partnerName: string
  partnerWhatsapp: string | null
  partnerId: string
  reservationData: ReservationData
  onClose: () => void
}

export default function PartnerNotifyModal({
  partnerName,
  partnerWhatsapp,
  partnerId,
  reservationData,
  onClose,
}: Props) {
  const {
    guestName,
    accommodationName,
    checkIn,
    checkOut,
    totalPrice,
    confirmationCode,
    reservationId,
  } = reservationData

  const confirmUrl = `https://llui-signature-hebergements.vercel.app/partenaire/confirm/${reservationId}?pid=${partnerId}`
  const partnerUrl = `https://llui-signature-hebergements.vercel.app/partenaire`

  const message = `🏠 Nouvelle réservation L&Lui !
${guestName} — ${accommodationName}
Du ${checkIn} au ${checkOut}
${totalPrice.toLocaleString('fr-FR')} FCFA
Réf: ${confirmationCode}

Confirmez en 1 clic : ${confirmUrl}

Connectez-vous : ${partnerUrl}`

  const waUrl = partnerWhatsapp
    ? `https://wa.me/${partnerWhatsapp}?text=${encodeURIComponent(message)}`
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-beige-200">
          <div>
            <h2 className="font-semibold text-dark">Notifier le partenaire</h2>
            <p className="text-sm text-dark/50">{partnerName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-beige-50 text-dark/40 hover:text-dark transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!partnerWhatsapp ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-amber-700 text-sm font-medium">
                Ce partenaire n&apos;a pas de numéro WhatsApp configuré
              </p>
              <p className="text-amber-600 text-xs mt-1">
                Ajoutez un numéro WhatsApp dans la fiche partenaire pour envoyer des notifications.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-dark/50 mb-1.5 uppercase tracking-wide">
                  Message à envoyer
                </label>
                <textarea
                  readOnly
                  value={message}
                  rows={10}
                  className="w-full text-xs font-mono bg-beige-50 border border-beige-200 rounded-xl p-3 text-dark/70 resize-none focus:outline-none"
                />
              </div>

              <a
                href={waUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
              >
                <MessageCircle size={16} />
                Envoyer sur WhatsApp
              </a>
            </>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl border border-beige-200 text-dark/60 hover:bg-beige-50 transition-colors text-sm font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
