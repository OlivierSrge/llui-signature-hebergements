'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { addPointsToCard } from '@/actions/loyalty'
import { calculerPoints } from '@/lib/loyalty-logic'
import type { LoyaltyProgram } from '@/types/loyalty'

const NIVEAU_EMOJI: Record<string, string> = {
  bronze: '🤍',
  argent: '🩷',
  or: '💎',
  diamant: '💠',
}

interface ScanResult {
  success: boolean
  message: string
  card_id: string
  client_nom?: string
  points_ajoutes?: number
  nouveau_total?: number
  new_level?: string
  montant: number
}

export default function LoyaltyScannerTab({
  programId,
  program,
}: {
  programId: string
  program: LoyaltyProgram | null
}) {
  const [cardId, setCardId] = useState('')
  const [montant, setMontant] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [receipt, setReceipt] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')

  const taux = program?.taux_fcfa_par_point ?? 10000
  const pointsPreview = montant ? calculerPoints(Number(montant), taux) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cardId || !montant) return

    setLoading(true)
    setError('')

    const rawId = cardId.trim()
    const resolvedId = rawId.startsWith('loyalty://') ? rawId.slice('loyalty://'.length) : rawId

    const res = await addPointsToCard({
      card_id: resolvedId,
      montant_depense: Number(montant),
      description: description || undefined,
    })

    if (res.success) {
      // Récupérer le nouveau total depuis Firestore via l'API de polling
      let nouveau_total = res.points_ajoutes ?? 0
      try {
        const snap = await fetch(`/api/loyalty/card-status?card_id=${resolvedId}`)
        if (snap.ok) {
          const data = await snap.json()
          nouveau_total = data.points_cumules ?? nouveau_total
        }
      } catch { /* silencieux */ }

      setReceipt({
        success: true,
        message: 'Points ajoutés avec succès',
        card_id: resolvedId,
        points_ajoutes: res.points_ajoutes,
        nouveau_total,
        new_level: res.new_level,
        montant: Number(montant),
      })
    } else {
      setError(res.error ?? 'Erreur lors de l\'ajout des points')
    }

    setLoading(false)
  }

  const reset = () => {
    setReceipt(null)
    setError('')
    setCardId('')
    setMontant('')
    setDescription('')
  }

  // ── REÇU VISUEL (écran à retourner vers le client) ─────────────────────────
  if (receipt) {
    const cardUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/loyalty/card/${receipt.card_id}`
      : `/loyalty/card/${receipt.card_id}`

    return (
      <div className="max-w-sm mx-auto space-y-6">
        {/* Titre */}
        <div className="text-center">
          <div className="text-5xl mb-2">✅</div>
          <h2 className="text-[#C9A84C] text-xl font-semibold">Points crédités !</h2>
          <p className="text-[#F5F0E8]/50 text-sm mt-1">Montrez cet écran au client</p>
        </div>

        {/* Reçu */}
        <div className="bg-[#0A0A0A] border-2 border-[#C9A84C]/40 rounded-2xl p-6 space-y-4">
          {/* Points ajoutés */}
          <div className="text-center border-b border-[#C9A84C]/20 pb-4">
            <p className="text-[#F5F0E8]/50 text-xs uppercase tracking-wider mb-1">Points crédités</p>
            <p className="text-[#C9A84C] text-5xl font-bold">
              +{receipt.points_ajoutes?.toLocaleString('fr-FR')}
            </p>
            <p className="text-[#F5F0E8]/40 text-xs mt-1">
              pour {receipt.montant.toLocaleString('fr-FR')} FCFA d&apos;achat
            </p>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-[#F5F0E8]/60 text-sm">Total cumulé</span>
            <span className="text-[#F5F0E8] font-bold text-lg">
              {receipt.nouveau_total?.toLocaleString('fr-FR')} pts
            </span>
          </div>

          {/* Level-up */}
          {receipt.new_level && (
            <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-xl px-4 py-3 text-center">
              <p className="text-[#C9A84C] font-semibold text-sm">
                {NIVEAU_EMOJI[receipt.new_level] ?? '🏆'} Nouveau niveau atteint !{' '}
                <span className="uppercase">{receipt.new_level}</span>
              </p>
            </div>
          )}

          {/* QR Code — client peut scanner pour voir sa carte */}
          <div className="flex flex-col items-center pt-2">
            <p className="text-[#F5F0E8]/40 text-xs mb-3">Scannez pour voir votre carte</p>
            <div className="bg-white rounded-xl p-3">
              <QRCodeSVG
                value={cardUrl}
                size={140}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-[#F5F0E8]/30 text-[10px] mt-2 text-center">
              {cardUrl}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full bg-[#C9A84C] hover:bg-[#D4AF37] text-black font-semibold py-3 rounded-xl transition"
          >
            ➕ Nouvelle transaction
          </button>
          <p className="text-[#F5F0E8]/30 text-xs text-center">
            Le solde du client se met à jour automatiquement sur sa page
          </p>
        </div>
      </div>
    )
  }

  // ── FORMULAIRE ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto">
      <p className="text-[#F5F0E8]/60 text-sm mb-6">
        Scannez le QR du client ou collez son identifiant · Le client voit ses points en temps réel sur sa page.
      </p>

      {/* Info programme */}
      {program && (
        <div className="bg-[#0A0A0A] border border-[#C9A84C]/10 rounded-lg px-4 py-3 mb-6">
          <p className="text-[#C9A84C] text-xs font-semibold">{program.nom}</p>
          <p className="text-[#F5F0E8]/50 text-xs mt-0.5">
            1 point = {taux.toLocaleString('fr-FR')} FCFA
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm mb-4">
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ID carte */}
        <div>
          <label className="block text-[#F5F0E8] text-sm mb-1.5">
            Identifiant de la carte *
          </label>
          <input
            type="text"
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            placeholder="Collez le code QR ici..."
            className="w-full bg-[#0A0A0A] border border-[#C9A84C]/30 text-[#F5F0E8] px-3 py-2.5 rounded-lg placeholder-[#F5F0E8]/30 font-mono text-sm"
            required
          />
          <p className="text-[#F5F0E8]/30 text-xs mt-1">
            Format : loyalty://xxxxxxxx ou juste l&apos;ID
          </p>
        </div>

        {/* Montant */}
        <div>
          <label className="block text-[#F5F0E8] text-sm mb-1.5">
            Montant dépensé (FCFA) *
          </label>
          <input
            type="number"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="85000"
            min="0"
            className="w-full bg-[#0A0A0A] border border-[#C9A84C]/30 text-[#F5F0E8] px-3 py-2.5 rounded-lg placeholder-[#F5F0E8]/30"
            required
          />
          {montant && Number(montant) > 0 && (
            <p className="text-[#C9A84C] text-xs mt-1">
              → {pointsPreview} point{pointsPreview > 1 ? 's' : ''} à créditer{' '}
              <span className="text-[#F5F0E8]/30">(1 pt = {taux.toLocaleString('fr-FR')} FCFA)</span>
            </p>
          )}
        </div>

        {/* Description optionnelle */}
        <div>
          <label className="block text-[#F5F0E8] text-sm mb-1.5">
            Description (optionnelle)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dîner du 18 juin..."
            className="w-full bg-[#0A0A0A] border border-[#C9A84C]/30 text-[#F5F0E8] px-3 py-2.5 rounded-lg placeholder-[#F5F0E8]/30 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !cardId || !montant}
          className="w-full bg-[#C9A84C] hover:bg-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg transition"
        >
          {loading ? 'Ajout en cours...' : '➕ AJOUTER LES POINTS'}
        </button>
      </form>
    </div>
  )
}
