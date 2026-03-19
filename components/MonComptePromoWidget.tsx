'use client'

import { ShoppingBag, ExternalLink } from 'lucide-react'
import MonCompteCopyButton from '@/components/MonCompteCopyButton'

interface Props {
  promoCode: string | null
  promoCodeExpiry: string | null
  boutiqueDiscount: number
  niveauColor: string
}

export default function MonComptePromoWidget({
  promoCode,
  promoCodeExpiry,
  boutiqueDiscount,
  niveauColor,
}: Props) {
  const now = new Date()
  const expiry = promoCodeExpiry ? new Date(promoCodeExpiry) : null
  const isExpired = expiry ? expiry <= now : false
  const expiryLabel = expiry
    ? expiry.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  if (!promoCode || isExpired) {
    return (
      <div className="bg-white rounded-2xl border border-beige-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag size={16} className="text-dark/40" />
          <h3 className="font-semibold text-dark">Votre code promo boutique</h3>
        </div>
        <div className="bg-beige-50 border border-beige-200 rounded-xl p-4 text-center">
          <p className="text-sm text-dark/50">
            {isExpired
              ? '⏰ Votre code promo a expiré. Effectuez un nouveau séjour pour en débloquer un !'
              : 'Aucun code promo actif pour le moment. Effectuez un séjour pour débloquer votre prochain code !'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-6">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingBag size={16} className="text-green-600" />
        <h3 className="font-semibold text-dark">🎁 Votre code promo boutique</h3>
      </div>
      <div className="bg-green-50 border border-green-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-2xl font-bold text-dark tracking-widest">{promoCode}</p>
            <p className="text-sm font-semibold mt-1" style={{ color: niveauColor }}>
              -{boutiqueDiscount}% sur tous vos achats
            </p>
            {expiryLabel && (
              <p className="text-xs text-dark/50 mt-1">
                Valable jusqu'au : <span className="font-semibold text-dark/70">{expiryLabel}</span>
              </p>
            )}
          </div>
          <MonCompteCopyButton text={promoCode} />
        </div>
        <div className="mt-4 pt-3 border-t border-green-200">
          <a
            href="http://l-et-lui-signature.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            <ShoppingBag size={14} /> 🛍️ Aller à la boutique
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  )
}
