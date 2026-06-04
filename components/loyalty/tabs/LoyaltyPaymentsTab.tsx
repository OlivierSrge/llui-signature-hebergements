'use client'

import { useState, useEffect } from 'react'
import { getLoyaltyWallet, requestLoyaltyPayment } from '@/actions/loyalty'

export default function LoyaltyPaymentsTab({ partenaireId }: { partenaireId: string }) {
  const [solde, setSolde] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    getLoyaltyWallet(partenaireId).then(({ solde: s }) => {
      setSolde(s ?? 0)
      setLoading(false)
    })
  }, [partenaireId])

  const handleRequestPayment = async () => {
    setRequesting(true)
    setMessage(null)
    const res = await requestLoyaltyPayment(partenaireId)
    if (res.success) {
      setMessage({
        type: 'success',
        text: `✅ Demande envoyée ! L&Lui traitera votre paiement de ${(res.montant_total ?? 0).toLocaleString('fr-FR')} FCFA sous 48h.`,
      })
    } else {
      setMessage({ type: 'error', text: `❌ ${res.error}` })
    }
    setRequesting(false)
  }

  if (loading) return <div className="text-[#F5F0E8]/50 text-center py-8">Chargement...</div>

  return (
    <div className="max-w-md mx-auto">
      {/* Solde */}
      <div className="bg-[#0A0A0A] border border-[#C9A84C]/20 rounded-xl p-6 mb-6 text-center">
        <p className="text-[#F5F0E8]/50 text-sm mb-2">Commissions en attente</p>
        <p className="text-4xl font-bold text-[#C9A84C]">
          {(solde ?? 0).toLocaleString('fr-FR')}
        </p>
        <p className="text-[#C9A84C]/70 text-sm">FCFA</p>
      </div>

      {/* Info */}
      <div className="bg-[#0A0A0A] border border-[#C9A84C]/10 rounded-lg px-4 py-3 mb-6 text-sm text-[#F5F0E8]/60 space-y-1">
        <p>💡 Les commissions correspondent à votre part sur les ventes de cartes de fidélité.</p>
        <p>🕐 Délai de traitement : 24–48h après votre demande.</p>
        <p>📱 Virement via Orange Money vers votre numéro enregistré.</p>
      </div>

      <button
        onClick={handleRequestPayment}
        disabled={requesting || !solde || solde <= 0}
        className="w-full bg-[#C9A84C] hover:bg-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg transition"
      >
        {requesting ? 'Envoi de la demande...' : '💸 DEMANDER LE PAIEMENT'}
      </button>

      {message && (
        <div
          className={`mt-4 px-4 py-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-900/30 border border-green-500 text-green-300'
              : 'bg-red-900/30 border border-red-500 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
