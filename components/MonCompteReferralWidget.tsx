'use client'

import { Users, Share2 } from 'lucide-react'

interface Referral {
  id: string
  validatedAt: string
}

interface Props {
  referralCode: string | null
  referrals: Referral[]
  pointsFromReferrals: number
  niveauColor: string
}

export default function MonCompteReferralWidget({
  referralCode,
  referrals,
  pointsFromReferrals,
  niveauColor,
}: Props) {
  const activeReferrals = referrals.filter((r) => r.validatedAt)

  function handleShare() {
    const code = referralCode || ''
    const msg = `Bonjour ! Je te recommande L&Lui Signature pour tes séjours à Kribi. Utilise mon code ${code} lors de ta réservation pour bénéficier d'avantages exclusifs 🌊 llui-signature-hebergements.vercel.app`
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} style={{ color: niveauColor }} />
        <h3 className="font-semibold text-dark">👥 Parrainage</h3>
      </div>

      {referralCode ? (
        <div className="space-y-4">
          <div className="bg-beige-50 rounded-xl p-4">
            <p className="text-xs text-dark/50 mb-1">Votre code parrainage</p>
            <p className="font-mono text-xl font-bold text-dark tracking-widest">{referralCode}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-beige-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: niveauColor }}>{activeReferrals.length}</p>
              <p className="text-xs text-dark/50 mt-0.5">ami(s) parrainé(s)</p>
            </div>
            <div className="bg-beige-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: niveauColor }}>{pointsFromReferrals.toLocaleString('fr-FR')}</p>
              <p className="text-xs text-dark/50 mt-0.5">points gagnés</p>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: '#25D366' }}
          >
            <Share2 size={14} /> 📤 Partager mon code
          </button>
        </div>
      ) : (
        <p className="text-sm text-dark/40 text-center py-2">
          Votre code de parrainage sera généré lors de votre prochain séjour.
        </p>
      )}
    </div>
  )
}
