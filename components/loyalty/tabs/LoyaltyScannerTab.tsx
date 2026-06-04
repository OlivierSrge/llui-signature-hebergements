'use client'

import { useState } from 'react'
import { addPointsToCard } from '@/actions/loyalty'
import { calculerPoints } from '@/lib/loyalty-logic'
import type { LoyaltyProgram } from '@/types/loyalty'

const NIVEAU_EMOJI: Record<string, string> = {
  bronze: '🤍',
  argent: '🩷',
  or: '💎',
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
  const [result, setResult] = useState<{
    success: boolean
    message: string
    new_level?: string
    points_ajoutes?: number
  } | null>(null)

  const pointsPreview = montant ? calculerPoints(Number(montant)) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cardId || !montant) return

    setLoading(true)
    setResult(null)

    const res = await addPointsToCard({
      card_id: cardId.trim(),
      montant_depense: Number(montant),
      description: description || undefined,
    })

    setResult({
      success: res.success,
      message: res.success
        ? `✅ +${res.points_ajoutes} points ajoutés !${res.new_level ? ` Nouveau niveau : ${NIVEAU_EMOJI[res.new_level] ?? ''} ${res.new_level.toUpperCase()}` : ''}`
        : `❌ ${res.error}`,
      new_level: res.new_level,
      points_ajoutes: res.points_ajoutes,
    })

    if (res.success) {
      setCardId('')
      setMontant('')
      setDescription('')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto">
      <p className="text-[#F5F0E8]/60 text-sm mb-6">
        Scannez le QR code du client ou saisissez son identifiant de carte pour ajouter des points après un achat.
      </p>

      {/* Info programme */}
      {program && (
        <div className="bg-[#0A0A0A] border border-[#C9A84C]/10 rounded-lg px-4 py-3 mb-6">
          <p className="text-[#C9A84C] text-xs font-semibold">{program.nom}</p>
          <p className="text-[#F5F0E8]/50 text-xs mt-0.5">
            1 point = 10 000 FCFA
          </p>
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
              → {pointsPreview} point{pointsPreview > 1 ? 's' : ''} à créditer
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
            placeholder="Dîner du 4 juin..."
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

      {result && (
        <div
          className={`mt-5 px-4 py-4 rounded-lg text-sm font-medium ${
            result.success
              ? 'bg-green-900/30 border border-green-500 text-green-300'
              : 'bg-red-900/30 border border-red-500 text-red-300'
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  )
}
